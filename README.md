# Marco — app nativa de hábitos (Android)

Seguimiento de hábitos diarios. App nativa de Android construida sobre
[Sparkling](https://tiktok.github.io/sparkling/) (TikTok), que empaqueta una app
[Lynx](https://lynxjs.org/) en un shell nativo instalable (no hace falta
LynxExplorer).

**Funciona sin conexión y sin cuenta en ningún servidor**: todo vive en un
SQLite local del teléfono. No hay backend, no hay login, no hay tokens — solo un
perfil local con tu nombre.

## Capturas

Datos de ejemplo, no reales: cuenta recién creada con los cinco hábitos que
siembra la app y siete semanas de historial generado.

| Progreso | Hábitos |
|---|---|
| ![Progreso del día](docs/screenshots/progreso.png) | ![Lista de hábitos](docs/screenshots/habitos.png) |
| Un hábito completo, otro a medias (7,71 de 10) y la barra del día en ámbar. | Los cinco hábitos de ejemplo con su categoría y su meta. |

| Calendario | Análisis |
|---|---|
| ![Calendario](docs/screenshots/calendario.png) | ![Análisis](docs/screenshots/analisis.png) |
| Mapa de calor del mes con la escala de cumplimiento. | Julio contra junio: +30 puntos, con el desglose por hábito. |

## Qué hace

- **Progreso diario** — la lista de hábitos del día. Un toque marca o desmarca;
  dejar pulsada una fila abre el registro parcial (¿leíste 15 de 20 páginas?),
  mientras una línea del color del hábito recorre el borde de la tarjeta.
- **Hábitos** — alta y edición con categoría, unidad de medida, meta diaria,
  días de la semana y color libre (tono, saturación y luminosidad). Se borran
  arrastrando la fila.
- **Calendario** — mapa de calor del mes con la escala de cumplimiento; tocar un
  día abre el Progreso de esa fecha.
- **Análisis** — filtro por 7/14/30 días, por mes o por año, comparación contra
  el periodo anterior con sus diferencias, y ocho gráficas SVG con zoom a
  pantalla completa.
- **Ajustes** — nombre, categorías, recordatorio diario por notificación,
  backups a la carpeta de Descargas y borrado de datos.

Al crear una cuenta aparecen cinco hábitos de ejemplo con sus categorías
(`src/api/semilla.ts`), para que ninguna pantalla arranque vacía.

## Requisitos

- Node 22 o 24 (pineado vía [mise](https://mise.jdx.dev/): `mise install node@22`)
- Android Studio + SDK (compileSdk 34)
- **JDK 17.** El compilador de Kotlin que trae el proyecto no sabe leer la
  versión de un JDK 21+ y falla con un `IllegalArgumentException` que solo dice
  el número de versión. Si tu JDK por defecto es más nuevo:
  ```bash
  JAVA_HOME=/usr/lib/jvm/java-17-openjdk npm run run:android
  ```

## Correr en un teléfono conectado por USB

1. Teléfono con depuración USB activada y autorizada (`adb devices` debe
   listarlo).
2. Desde esta carpeta:
   ```bash
   npm run run:android
   ```
   Compila el bundle de Lynx, lo empaqueta como assets de Android, compila el
   APK debug y lo instala y lanza.

Si el build termina pero la instalación falla porque el teléfono se desconectó,
reconéctalo y corre:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Otros comandos:

```bash
npm run build   # solo el bundle de Lynx (dist/) y copia a los assets nativos
npm run test    # vitest
```

## Estructura

- `src/pages/main/` — entry point de Sparkling. `App.tsx` muestra el onboarding
  o el `AppStack` según exista o no un perfil local.
- `src/api/` — toda la lógica de negocio contra SQLite. `marco.ts` es el barril;
  cada archivo cubre un área (`perfil`, `habitos`, `registros`, `calendario`,
  `analisis`, `categorias`, `semilla`).
- `src/db/native.ts` — puente genérico hacia SQLite. Solo (de)serializa; no
  tiene lógica.
- `src/screens/`, `src/components/`, `src/charts/`, `src/lib/` — pantallas,
  piezas reutilizables, gráficas SVG y utilidades puras (fechas, periodos,
  escala de progreso, color).
- `android/app/src/main/java/com/example/sparkling/go/`:
  - `MarcoDbHelper.kt` — el esquema SQLite.
  - `NativeDatabaseModule.kt` — el módulo nativo que ejecuta las consultas.
  - `NativeReminderModule.kt`, `ReminderScheduler.kt`, `ReminderAlarmReceiver.kt`,
    `BootReceiver.kt` — recordatorio diario con `AlarmManager`.
  - `LynxInputComponent.kt` — componente `<input>` propio.
  - `SparklingApplication.kt` — registro de módulos y behaviors de Lynx.
- `app.config.ts` — config de Sparkling (nombre, package id, ícono, splash).

## Notas técnicas

Cosas que costaron dispositivo y no se deducen leyendo el código. Cada una está
documentada en su archivo; esto es solo el índice.

- **Los módulos nativos hay que registrarlos** en `SparklingApplication.kt` vía
  `SparklingLynxConfig.Builder.addLynxModules(...)`. Escribir la clase no basta
  para que exista `NativeModules.<Nombre>` del lado JS.
- **`<svg>` no es parte del core de Lynx**: es un X-Element aparte
  (`org.lynxsdk.lynx:xelement-svg`), forzado a `3.7.0` en
  `android/app/build.gradle.kts` y registrado a mano.
- **Sin code splitting.** Un import lazy se compila como bundle Lynx aparte que
  no hereda el CSS global — texto invisible y pantallas que no se reemplazaban.
  Ver el comentario en `src/router.tsx`.
- **El hilo principal (`'main thread'`) no ve las estructuras de módulo**, solo
  los números. Recorrer una tabla declarada arriba del archivo revienta en
  silencio dentro de un handler main-thread (`DashboardScreen.tsx`).
- **`touchstart` llega tarde y `touchend` a veces no llega.** Dentro de un
  `scroll-view` el evento se entrega cuando el gesto ya no puede ser scroll, y
  si se monta un modal encima, la fila que lo abrió no recibe el final del
  gesto. Ver `DashboardScreen.tsx` y `SwipeRow.tsx`.
- **`LynxInputComponent.kt` ignora el `color` de CSS**: el color del texto de un
  `<input>` va por la prop `text-color` (`src/lib/colors.ts`).
- **Sin `Intl`.** El formateo de fechas es manual en `src/lib/date.ts` porque el
  motor JS de Lynx (PrimJS) no garantiza soporte de `Intl`.

## Pendiente

- **iOS**: no configurado (decisión: solo Android por ahora).
- **Identidad**: el paquete sigue siendo el del scaffold
  (`com.example.sparkling.go`) en vez de uno propio.
- **Backups sin cifrar**: se exportan como JSON plano a Descargas.
