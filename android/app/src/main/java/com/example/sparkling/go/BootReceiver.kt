package com.example.sparkling.go

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Reprograma el recordatorio diario tras un reinicio del teléfono, sin
// necesitar que la app JS/React vuelva a correr primero.
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            ReminderScheduler.rescheduleIfEnabled(context)
        }
    }
}
