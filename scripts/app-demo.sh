#!/usr/bin/env bash
# Instala una copia "demo" de Marco (paquete com.example.sparkling.go.demo) con
# los datos de ejemplo de scripts/datos-demo.py, para sacar las capturas del
# README. Convive con la app normal y no toca sus datos.
#
# Necesita un teléfono conectado por adb, Python 3 y JDK 17.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pkg=com.example.sparkling.go.demo
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cd "$root"
npm run build
(cd android && JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk}" ./gradlew assembleDebug -Pdemo)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

python3 scripts/datos-demo.py "$work/marco.db"
adb push "$work/marco.db" /data/local/tmp/marco-demo.db
adb shell chmod 644 /data/local/tmp/marco-demo.db
adb shell am force-stop "$pkg"
adb shell "run-as $pkg sh -c 'mkdir -p databases && rm -f databases/marco.db* && cp /data/local/tmp/marco-demo.db databases/marco.db'"
adb shell rm /data/local/tmp/marco-demo.db
adb shell am start -n "$pkg/com.example.sparkling.go.SplashActivity"

echo "Lista. Recorta la barra de estado de las capturas: puede llevar tus notificaciones."
