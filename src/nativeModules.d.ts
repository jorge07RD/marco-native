// Declaración de los native modules propios. Sigue el patrón documentado en
// https://lynxjs.org/guide/use-native-modules — registrados en
// SparklingApplication.kt vía addLynxModules.
declare global {
  let NativeModules: {
    NativeDatabaseModule?: {
      query(sql: string, paramsJson: string, callback: (rowsJson: string) => void): void
      execute(sql: string, paramsJson: string, callback: (resultJson: string) => void): void
      exportBackup(json: string, filename: string, callback: (ok: boolean) => void): void
      listBackups(callback: (itemsJson: string) => void): void
      readBackup(uri: string, callback: (text: string | null) => void): void
    }
    NativeReminderModule?: {
      /** Varias horas al día, separadas por coma: "08:00,21:00". */
      scheduleDailyReminders(times: string): void
      cancelReminder(): void
      requestNotificationPermission(callback: (granted: boolean) => void): void
      showTestNotification(): void
    }
  }
}

export {}
