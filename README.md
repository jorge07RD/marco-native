# Marco — app nativa (Android)

App nativa de Android para Marco (habit tracker), construida sobre
[Sparkling](https://tiktok.github.io/sparkling/) (TikTok), que empaqueta la
app [Lynx](https://lynxjs.org/) del prototipo `marcomobile/` en un shell
nativo real instalable en el teléfono (no requiere LynxExplorer).

**No hay backend.** Todos los datos viven en SQLite en el propio teléfono, vía
`NativeDatabaseModule`. `src/api/` conserva los nombres y las formas de cuando
esto hablaba con la FastAPI de `marco/backend` (para no reescribir las
pantallas), pero ya no hace ninguna petición HTTP: no queda un solo `fetch` en
`src/`.

## Estado actual

Funcional en Android: onboarding, Dashboard diario con toggle de hábitos, CRUD
de Hábitos, Calendario (heatmap del mes con filtro multi-hábito), Análisis
(8 gráficas SVG + tarjetas resumen por hábito + zoom a pantalla completa),
Ajustes (perfil, categorías, recordatorios, backup, borrado).

Gestos: en la lista de Hábitos se arrastra una tarjeta **→ para editar** y
**← para eliminar** (ver `src/components/SwipeRow.tsx`).

### Diseño

El look sale de `Marco Rediseño Demo.dc.html`, en el proyecto de Claude Design
`4ae0eb6a-f50f-4236-8aea-48fc70b00da3` (el mismo que define el ícono, ver
`Marco Icon.dc.html`). Dos reglas que conviene no romper:

- **`:root` en `src/App.css` es la única fuente de verdad de color en CSS.** No
  hay otro `:root` en la app; cualquier hex suelto en una hoja de estilos es un
  bug. Las excepciones son las gráficas, que llevan el color embebido en
  strings de markup SVG porque `var()` no llega ahí, y las dos paletas
  categóricas (`charts/svgMath.ts` `PALETTE`, `HabitoForm.tsx` `COLORES`), que
  son colores de datos y no de marca.
- **El color de marca y el color de progreso son dos lenguajes distintos.**
  La marca es el rosado-morado (#e94560 / #7b2cbf) y se usa para estado e
  identidad: hábito cumplido, tab activo, switch encendido. El *progreso*
  medido en porcentaje usa el semáforo clásico, que vive aparte en
  `--color-progreso-0..4` con los umbrales de `src/lib/progreso.ts`
  (60 / 80 / 100). Es la única zona donde sobrevive el verde, y a propósito:
  ahí no es un color de marca sino una convención que se lee sin explicación.
  Los tres consumidores —calendario, barra del Dashboard y gauge de Análisis—
  tienen que coincidir; por eso el umbral está en un solo módulo.

Pendiente / conocido:
- **iOS**: no configurado (decisión: solo Android por ahora).
- **Notificaciones push**: no implementadas. La web original usa Web Push
  (`pywebpush` + Service Worker del navegador), que no aplica a una app
  nativa. El reemplazo natural es FCM (Firebase Cloud Messaging), pendiente.
- **Identidad de la app**: el paquete sigue siendo el del scaffold
  (`com.example.sparkling.go` en `android/app/build.gradle.kts`) en vez de
  `com.marco.mobile`, que es lo que declara `app.config.ts`. El ícono del
  launcher sí está hecho (`drawable/ic_marco_foreground.xml`), pero el splash
  todavía usa el placeholder `resource/app_icon.png`.
- **Los datos existen en un solo sitio**: la base SQLite del teléfono. No hay
  sincronización ni nube. Exporta un backup desde Ajustes de vez en cuando, y
  saca una copia antes de trastear (ver "Respaldar la base" más abajo).
- **Permiso de red y cleartext de más**: el manifiesto todavía declara
  `INTERNET`, `usesCleartextTraffic="true"` y `network_security_config.xml`,
  heredados de cuando había backend HTTP. Ya no se usan y convendría quitarlos.
- **Sin suite de pruebas útil**: `npm test` falla (ver "Probar" más abajo).
- **Storage del token**: persiste vía `SharedPreferences` real (no en
  memoria), pero sin cifrar. Cifrado (Keystore) queda para producción.

## Requisitos

- Node 22 o 24 (pineado vía [mise](https://mise.jdx.dev/): `mise install node@22`)
- Android Studio + SDK (compileSdk 34; el JDK de compilación lo resuelve el
  toolchain de Gradle, no hace falta instalarlo a nivel de sistema)
- **Un JDK ≤ 20 para *correr* Gradle.** El wrapper está en Gradle 8.2, que no
  entiende JDK más nuevos. Si tu `java -version` es 21+, el build muere con un
  `FAILURE` cuyo único detalle es la versión suelta (p. ej. `26.0.1`), sin más
  pista. La salida es anteponer un JDK compatible:

  ```bash
  JAVA_HOME=/usr/lib/jvm/java-17-openjdk   # ajusta a tu ruta; ls /usr/lib/jvm
  ```

  Se usa en todos los comandos de abajo. El arreglo de fondo sería subir el
  wrapper de Gradle, pendiente.

## Correr en un teléfono conectado por USB

1. Teléfono conectado por USB con depuración USB activada y autorizada
   (`adb devices` debe listarlo).
2. Desde esta carpeta:
   ```bash
   JAVA_HOME=/usr/lib/jvm/java-17-openjdk \
     mise exec node@22 -- npx sparkling-app-cli run:android
   ```
   Compila el bundle de Lynx, lo empaqueta como assets de Android, compila el
   APK debug y lo instala/lanza en el dispositivo.

No hace falta levantar nada más: no hay backend.

Si el build termina pero la instalación falla porque el teléfono se
desconectó, reconéctalo y corre:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.example.sparkling.go/.SplashActivity
```

### No hay `npm run dev`, y no puede haberlo

El template de Lynx trae un flujo de servidor de desarrollo con QR
(`rspeedy dev` + LynxExplorer), y de ahí sobrevive el `pluginQRCode` en
`app.config.ts`. **Aquí es andamiaje muerto**, por dos razones independientes:

- `BuiltinTemplateProvider.kt` solo sabe leer de `assets`
  (`context.assets.open(uri)`). No hay ninguna ruta HTTP, así que la app
  instalada no puede cargar un bundle desde un servidor.
- LynxExplorer no puede correr esta app: le faltan las piezas nativas que
  `SparklingApplication.kt` registra — el `<input>` propio, `xelement-svg`,
  `NativeReminderModule` y sobre todo `NativeDatabaseModule`, que *es* la base
  de datos. Sin eso no arranca nada.

El ciclo real es el `run:android` de arriba, y es más rápido de lo que parece:
el bundle de Lynx compila en ~1 s y Gradle con caché caliente termina en 5-7 s,
porque solo reejecuta `installDebug`.

## Probar

```bash
npx tsc --noEmit   # tipos
npm test           # vitest
```

Dos avisos, porque si no vas a descartar las dos salidas como ruido:

- **`tsc` reporta un error preexistente en `vitest.config.ts`** (top-level
  `await`, incompatible con el `module`/`target` del `tsconfig.json`). No viene
  del código de la app; hasta que se arregle, "limpio" significa *solo esa
  línea*.
- **`npm test` falla.** El único test es el del scaffold buscando el texto
  "Sparkling Starter", que la app no renderiza desde hace tiempo. Falla
  igual con el árbol limpio.

No hay linter configurado. Prettier está instalado pero ~59 archivos no cumplen
su propio `.prettierrc`, así que `--check` tampoco sirve de puerta.

La verificación que de verdad vale es correr la app en el teléfono y comparar
contra los datos: la base es SQLite y se puede consultar directamente (ver
abajo), así que se pueden calcular los valores esperados antes de mirar la
pantalla.

## Respaldar la base

Los datos existen **solo** en el teléfono. Antes de trastear:

```bash
adb shell "run-as com.example.sparkling.go cat databases/marco.db" > backup.db
sqlite3 backup.db "SELECT COUNT(*) FROM registros;"   # inspeccionar
```

Restaurar:

```bash
adb shell am force-stop com.example.sparkling.go
adb push backup.db /data/local/tmp/r.db
adb shell "run-as com.example.sparkling.go sh -c \
  'cat /data/local/tmp/r.db > databases/marco.db && \
   rm -f databases/marco.db-wal databases/marco.db-shm'"
adb shell rm -f /data/local/tmp/r.db
```

Reinstalar el APK **no** borra la base. Lo que sí la borra en un toque es
"Eliminar todos los datos" en Ajustes (`eliminarTodosLosDatos()` en
`src/api/perfil.ts`, que vacía `registros` y `progreso_habitos`); ojo al
navegar la app con `adb shell input tap`.

## Estructura

- `src/pages/main/` — entry point de Sparkling (`App.tsx` muestra `AppStack`
  o `OnboardingScreen` según haya perfil).
- `src/api/` — lógica de dominio contra SQLite. Está partido en varios
  archivos a propósito: junto en uno solo disparaba un "stack underflow" de
  PrimJS al cargar el bundle (ver el comentario en `src/api/marco.ts`).
- `src/db/` — acceso a la base y export/import de backups.
- `src/lib/` — utilidades compartidas: fechas, la escala de progreso
  (`progreso.ts`) y los colores que no pueden venir de CSS (`colors.ts`).
- `src/{auth,charts,components,screens}/` — resto de la app.
- `src/native/` — implementación nativa **de referencia** para iOS (no
  integrado).
- `android/app/src/main/java/com/example/sparkling/go/`:
  - `SparklingApplication.kt` — registro de behaviors y módulos custom de Lynx
    (el `<input>` propio, `<svg>` vía `xelement-svg`, base de datos y
    recordatorios). Si un módulo nativo no aparece en `NativeModules`, es que
    falta registrarlo aquí.
  - `NativeDatabaseModule.kt` + `MarcoDbHelper.kt` — la base SQLite.
  - `LynxInputComponent.kt` — el `<input>` (ver notas técnicas).
  - `NativeReminderModule.kt`, `ReminderScheduler.kt`, `ReminderAlarmReceiver.kt`,
    `BootReceiver.kt` — recordatorios locales vía `AlarmManager`.
- `app.config.ts` — config de Sparkling (nombre de app, package/bundle id,
  entradas de router, ícono, splash screen).

## Notas técnicas relevantes

- **`<svg>` no es parte del core de Lynx**: es un X-Element aparte
  (`org.lynxsdk.lynx:xelement-svg`). Sparkling no lo trae por defecto — está
  forzado en `android/app/build.gradle.kts` (resolución de dependencias a
  `3.7.0`, la versión mínima con soporte de `<svg>`) y registrado a mano en
  `SparklingApplication.kt`.
- **Native modules propios** (storage, y cualquier otro futuro) se registran
  vía `SparklingLynxConfig.Builder.addLynxModules(...)` en
  `SparklingApplication.kt` — no basta con escribir la clase, hay que
  registrarla ahí para que `NativeModules.<Nombre>` exista del lado JS.
- **`<input>` no es el de Lynx, es nuestro**: `LynxInputComponent.kt`,
  registrado como `Behavior("input")`. Consecuencias que cuesta descubrir:
  `value` es un `@LynxProp`, así que el campo **se controla por prop** como en
  React; NO existe el método `setValue` de la doc de Lynx (el único
  `@LynxUIMethod` es `focus`), y llamarlo por `SelectorQuery` falla en silencio
  con `METHOD_NOT_FOUND`. Además **ignora la propiedad `color` de CSS**: el
  color del texto va por la prop `text-color`, de la que el Kotlin deriva el
  del placeholder. Sin ella el texto sale casi negro. Ver `src/lib/colors.ts`.
- **`touchstart` no llega a los elementos anidados** (verificado en un
  SM-S918U / Android 15): llegan `touchmove` y `touchend` pero no el inicio.
  Por eso `SwipeRow` fija el origen del gesto en el primer `touchmove` y no en
  `touchstart` — si dependiera de él, cada arrastre se mediría contra la
  posición sobrante del gesto anterior.
- **El denominador del progreso sale de `progreso_habitos`, no de
  `habitos.created_at`.** Cuatro funciones (`getProgresoMes`,
  `getRendimientoPorDia`, `getCumplimientoHabitos` y la difunta
  `getProgresoMesHabito`) decidían si un día contaba con
  `habito.created_at <= fecha`. Como crear un hábito —o restaurar un backup—
  reescribe `created_at`, todo el historial anterior se quedaba con total 0, y
  el calendario y las gráficas lo pintaban como si no existiera. La fila de
  progreso guardada ese día es la autoridad; `created_at` solo valdría para
  días sin registro. Si vuelve a aparecer un mes en blanco con datos en la
  base, mirar ahí primero.
- **Cleartext HTTP**: `network_security_config.xml` y
  `usesCleartextTraffic="true"` siguen en el manifiesto, heredados de cuando
  había backend HTTP. Hoy no se usan (no queda un `fetch` en `src/`) y
  deberían quitarse junto con el permiso `INTERNET`.
- **El ícono del launcher NO puede llamarse `ic_launcher_foreground`**: los AAR
  `sparkling-2.0.1` y `sparkling-method-2.0.1` publican su propio
  `drawable-{ldpi..xxxhdpi}/ic_launcher_foreground.png` (el robot de Android
  con sombra). Un archivo nuestro en `res/drawable/` **sin calificador de
  densidad** pierde contra esas variantes en cualquier dispositivo real: el
  merge de recursos conserva ambas y en runtime Android elige la que coincide
  con la densidad de la pantalla. El síntoma es un ícono con nuestro color de
  fondo (`ic_launcher_background`, que sí gana) y el robot encima, sin ningún
  error de build ni de logcat, y sobrevive a desinstalación limpia y reinicio.
  Por eso el foreground vive en `drawable/ic_marco_foreground.xml` y la capa
  themed en `drawable/ic_marco_monochrome.xml`, con nombres propios. Si alguna
  vez el ícono vuelve a salir como el robot, lo primero que hay que mirar es
  `aapt2 dump resources app-debug.apk | grep -A6 ic_marco_foreground`: si
  aparece más de una configuración para el mismo recurso, es esta colisión.
