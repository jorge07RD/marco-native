// Declaración de los native modules propios. Sigue el patrón documentado en
// https://lynxjs.org/guide/use-native-modules — registrados en
// SparklingApplication.kt vía addLynxModules.
declare global {
  let NativeModules: {
    NativeDatabaseModule?: {
      query(sql: string, paramsJson: string, callback: (rowsJson: string) => void): void
      execute(
        sql: string,
        paramsJson: string,
        callback: (resultJson: string) => void,
      ): void
      exportBackup(json: string, filename: string, callback: (ok: boolean) => void): void
      listBackups(callback: (itemsJson: string) => void): void
      readBackup(uri: string, callback: (text: string | null) => void): void
    }
    NativeReminderModule?: {
      scheduleDailyReminder(hour: number, minute: number): void
      cancelReminder(): void
      requestNotificationPermission(callback: (granted: boolean) => void): void
      showTestNotification(): void
    }
  }
}

export {}
