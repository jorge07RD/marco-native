// Recordatorio diario local (AlarmManager), ver NativeReminderModule.kt e
// implementación de ReminderScheduler en el proyecto Android. Sin fallback:
// si el módulo no está disponible (p.ej. corriendo fuera del shell nativo
// propio), estas funciones simplemente no hacen nada.

function nativeReminder() {
  return typeof NativeModules !== 'undefined' ? NativeModules.NativeReminderModule : undefined
}

export function scheduleReminder(hour: number, minute: number): void {
  nativeReminder()?.scheduleDailyReminder(hour, minute)
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
