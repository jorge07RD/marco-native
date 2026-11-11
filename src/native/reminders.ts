// Recordatorios diarios locales (una o varias horas) (AlarmManager), ver NativeReminderModule.kt e
// implementación de ReminderScheduler en el proyecto Android. Sin fallback:
// si el módulo no está disponible (p.ej. corriendo fuera del shell nativo
// propio), estas funciones simplemente no hacen nada.

function nativeReminder() {
  return typeof NativeModules !== 'undefined' ? NativeModules.NativeReminderModule : undefined
}

/** Una alarma diaria por cada hora ("HH:MM"). Reemplaza las anteriores. */
export function scheduleReminders(horas: string[]): void {
  nativeReminder()?.scheduleDailyReminders(horas.join(','))
}

export function cancelReminder(): void {
  nativeReminder()?.cancelReminder()
}

export function showTestNotification(): void {
  nativeReminder()?.showTestNotification()
}

export function requestNotificationPermission(): Promise<boolean> {
  const native = nativeReminder()
  if (!native) return Promise.resolve(false)
  return new Promise((resolve) => {
    native.requestNotificationPermission((granted: boolean) => resolve(granted))
  })
}
