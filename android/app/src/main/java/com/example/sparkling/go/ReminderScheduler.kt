package com.example.sparkling.go

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import java.util.Calendar

// Punto único de programación de los recordatorios diarios, usado desde el
// native module (al activar/cambiar horas en Ajustes), desde
// ReminderAlarmReceiver (para encadenar el día siguiente al dispararse), y
// desde BootReceiver (para sobrevivir un reinicio del teléfono). Persiste en
// SharedPreferences propio para no depender de que la app JS vuelva a correr.
//
// Puede haber varias horas al día: cada una es una alarma propia, con su
// requestCode derivado del minuto del día, así que dos horas distintas nunca
// se pisan el PendingIntent.
object ReminderScheduler {
    private const val PREFS = "MarcoReminderPrefs"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_TIMES = "times" // "08:00,21:00"

    // Claves y requestCode de cuando solo había una hora. Se leen para migrar
    // y se cancelan para que la alarma antigua no siga sonando por su cuenta.
    private const val KEY_HOUR_LEGACY = "hour"
    private const val KEY_MINUTE_LEGACY = "minute"
    private const val REQUEST_CODE_LEGACY = 4200

    private const val REQUEST_CODE_BASE = 4300

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun pendingIntent(context: Context, requestCode: Int): PendingIntent {
        val intent = Intent(context, ReminderAlarmReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, requestCode, intent, flags)
    }

    /** "08:00,21:00" → [480, 1260] (minutos del día), sin repetidos ni basura. */
    private fun parse(times: String): List<Int> =
        times.split(',')
            .mapNotNull { t ->
                val parts = t.trim().split(':')
                val h = parts.getOrNull(0)?.toIntOrNull()
                val m = parts.getOrNull(1)?.toIntOrNull()
                if (h == null || m == null || h !in 0..23 || m !in 0..59) null else h * 60 + m
            }
            .distinct()
            .sorted()

    private fun format(minutes: List<Int>): String =
        minutes.joinToString(",") { "%02d:%02d".format(it / 60, it % 60) }

    private fun cancelAlarms(context: Context, minutes: List<Int>) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent(context, REQUEST_CODE_LEGACY))
        minutes.forEach { alarmManager.cancel(pendingIntent(context, REQUEST_CODE_BASE + it)) }
    }

    private fun scheduleAlarm(context: Context, minuteOfDay: Int) {
        val next = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, minuteOfDay / 60)
            set(Calendar.MINUTE, minuteOfDay % 60)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= System.currentTimeMillis()) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = pendingIntent(context, REQUEST_CODE_BASE + minuteOfDay)
        val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
        if (canExact) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.timeInMillis, pi)
        } else {
            // Sin permiso de alarmas exactas (Android 12+): un recordatorio de
            // hábito no necesita precisión al minuto, el margen del sistema es aceptable.
            alarmManager.set(AlarmManager.RTC_WAKEUP, next.timeInMillis, pi)
        }
    }

    /** Programa una alarma diaria por cada hora de `times` ("08:00,21:00") y
     *  cancela las que estaban y ya no están. */
    fun scheduleAll(context: Context, times: String) {
        val nuevas = parse(times)
        val anteriores = parse(prefs(context).getString(KEY_TIMES, "") ?: "")
        cancelAlarms(context, anteriores)

        prefs(context).edit()
            .putBoolean(KEY_ENABLED, nuevas.isNotEmpty())
            .putString(KEY_TIMES, format(nuevas))
            .apply()

        nuevas.forEach { scheduleAlarm(context, it) }
    }

    fun cancel(context: Context) {
        val anteriores = parse(prefs(context).getString(KEY_TIMES, "") ?: "")
        cancelAlarms(context, anteriores)
        prefs(context).edit().putBoolean(KEY_ENABLED, false).apply()
    }

    fun rescheduleIfEnabled(context: Context) {
        val p = prefs(context)
        if (!p.getBoolean(KEY_ENABLED, false)) return
        val times = p.getString(KEY_TIMES, null)
            // Instalación previa con una sola hora guardada.
            ?: "%02d:%02d".format(p.getInt(KEY_HOUR_LEGACY, 8), p.getInt(KEY_MINUTE_LEGACY, 0))
        scheduleAll(context, times)
    }
}
