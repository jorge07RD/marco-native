# Marco — app nativa (Android)

App nativa de Android para Marco (habit tracker), construida sobre
[Sparkling](https://tiktok.github.io/sparkling/) (TikTok), que empaqueta la
app [Lynx](https://lynxjs.org/) del prototipo `marcomobile/` en un shell
nativo real instalable en el teléfono (no requiere LynxExplorer).

Backend: FastAPI en `marco/backend` (sin cambios, se reutiliza tal cual).

## Estado actual

Funcional en Android: Auth (login/registro), Dashboard diario con toggle de
hábitos, CRUD de Hábitos, Calendario (heatmap), Análisis (8 gráficas SVG +
tarjetas resumen por hábito + zoom a pantalla completa), Ajustes.

Pendiente / conocido:
- **iOS**: no configurado (decisión: solo Android por ahora).
- **Notificaciones push**: no implementadas. La web original usa Web Push
  (`pywebpush` + Service Worker del navegador), que no aplica a una app
  nativa. El reemplazo natural es FCM (Firebase Cloud Messaging), pendiente.
- **Identidad de la app**: el paquete sigue siendo el del scaffold
  (`com.example.sparkling.go`) en vez de `com.marco.mobile`; el ícono
  (`resource/app_icon.png`) también es el placeholder por defecto.
- **Backend**: solo local. La app apunta a la IP LAN de tu máquina — no hay
  nada desplegado en la nube todavía.
- **Storage del token**: persiste vía `SharedPreferences` real (no en
  memoria), pero sin cifrar. Cifrado (Keystore) queda para producción.

## Requisitos

- Node 22 o 24 (pineado vía [mise](https://mise.jdx.dev/): `mise install node@22`)
- Android Studio + SDK (compileSdk 34, JDK 11 vía el resolver de toolchains
  de Gradle — no requiere instalar JDK 11 a nivel de sistema)
- Backend corriendo en local (`marco/backend`, ver su propio README/`.env.example`)

## Correr en un teléfono conectado por USB

1. Levantar el backend con `--host 0.0.0.0` para que sea alcanzable desde el
   teléfono:
   ```bash
   cd ../marco/backend
   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. Confirmar que `src/api/config.ts` (`API_BASE_URL`) apunta a la IP LAN
   actual de la máquina que corre el backend (no `127.0.0.1`).
3. Teléfono conectado por USB con depuración USB activada y autorizada
   (`adb devices` debe listarlo).
4. Desde esta carpeta:
   ```bash
   mise exec node@22 -- npx sparkling-app-cli run:android
   ```
   Esto compila el bundle de Lynx, lo empaqueta como assets de Android,
   compila el APK debug y lo instala/lanza en el dispositivo conectado.

Si el build termina pero la instalación falla porque el teléfono se
desconectó, reconéctalo y corre:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Estructura

- `src/pages/main/` — entry point de Sparkling (`App.tsx` decide
  `AuthStack`/`AppStack` según sesión).
- `src/{api,auth,charts,components,lib,screens,storage}/` — código de la app
  (portado 1:1 desde `marcomobile/src/`, misma arquitectura).
- `src/native/` — implementación nativa **de referencia** de
  `NativeLocalStorageModule` (iOS aún no integrado; Android sí, ver abajo).
- `android/app/src/main/java/com/example/sparkling/go/`:
  - `SparklingApplication.kt` — registro de behaviors/módulos custom de Lynx
    (input, `<svg>` vía `xelement-svg`, `NativeLocalStorageModule`).
  - `NativeLocalStorageModule.kt` — storage del JWT vía `SharedPreferences`.
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
- **Cleartext HTTP**: habilitado solo para IPs de desarrollo local
  (`network_security_config.xml`) — necesario porque Android bloquea HTTP
  sin TLS por defecto desde API 28.
