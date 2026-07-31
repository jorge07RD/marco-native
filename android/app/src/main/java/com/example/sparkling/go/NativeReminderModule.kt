package com.example.sparkling.go

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import com.lynx.tasm.behavior.LynxContext

private const val REQUEST_CODE_NOTIFICATIONS = 4210

class NativeReminderModule(context: Context) : LynxModule(context) {
    private fun androidContext(): Context = (mContext as LynxContext).getContext()

    @LynxMethod
    fun scheduleDailyReminder(hour: Double, minute: Double) {
        ReminderScheduler.schedule(androidContext(), hour.toInt(), minute.toInt())
    }

    @LynxMethod
    fun cancelReminder() {
        ReminderScheduler.cancel(androidContext())
    }

    @LynxMethod
    fun showTestNotification() {
        ReminderAlarmReceiver.showNotification(androidContext())
    }

    // Best-effort: dispara el diálogo del sistema si hace falta y devuelve el
    // estado ya conocido (no intenta esperar la respuesta async del diálogo,
    // ver notas en el plan — el recordatorio se programa igual, y si el
    // permiso termina denegado, ReminderAlarmReceiver simplemente no muestra
    // nada, no rompe el flujo).
    @LynxMethod
    fun requestNotificationPermission(callback: Callback) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            callback.invoke(true)
            return
        }

        val context = androidContext()
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) {
            callback.invoke(true)
            return
        }

        val activity = CurrentActivityHolder.current
        if (activity != null) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQUEST_CODE_NOTIFICATIONS,
            )
        }
        callback.invoke(false)
    }
}
