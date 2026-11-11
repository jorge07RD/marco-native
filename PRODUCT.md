# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Uso personal del autor. La app se abre sobre todo de noche, al final del día,
para marcar los hábitos cumplidos y registrar los parciales — normalmente con
la luz apagada o baja, en el teléfono.

## Product Purpose

Seguimiento de hábitos diarios sin conexión y sin cuenta: todo vive en un
SQLite local. Éxito = marcar el día en segundos y ver de un vistazo cómo va
el día, el mes y la tendencia.

## Positioning

Registro parcial (no solo hecho/no hecho: 15 de 20 páginas) con gesto de
mantener pulsado, mapa de calor mensual con escala de cumplimiento, y
comparación entre periodos — todo local, sin backend.

## Operating Context

- Pantallas: Progreso (día), Hábitos (alta/edición/borrado por arrastre),
  Calendario (mapa de calor; tocar un día abre su Progreso), Análisis
  (7/14/30 días, mes, año, comparación con el periodo anterior, ocho gráficas
  con zoom), Ajustes (nombre, categorías, recordatorio, backups, borrado).
- Gestos: toque marca/desmarca; mantener pulsado abre el registro parcial;
  arrastrar fila en Hábitos edita (→) o elimina (←).
- Animación de logro al completar todos los hábitos del día.

## Capabilities and Constraints

- Lynx (Sparkling) empaquetado en shell nativo Android. CSS de Lynx: sin
  `:active` confirmado, SVG solo como string en la prop `content`, inputs
  nativos que ignoran `color` de CSS (ver src/lib/colors.ts).
- Una sola fuente de color: `:root` en src/App.css.
- Umbrales de progreso en src/lib/progreso.ts (60 / 80 / 100).

## Brand Commitments

- Nombre "Marco" y el ícono de anillos concéntricos rosa → morado
  (resource/app_icon.png). Confirmado por el usuario como intocable.
- Escala semáforo de progreso (rojo / ámbar / verde) compartida por
  calendario, barra del día y gauge. Confirmado como intocable.
- Color libre por hábito, elegido por el usuario. Confirmado como intocable.
- Alcance pedido para el estilo: refinar lo actual, no reemplazarlo.

## Evidence on Hand

- Capturas con datos de ejemplo en docs/screenshots/ (perfil "Ana", sintético).
- Hábitos semilla en src/api/semilla.ts.

## Product Principles

1. Marcar el día debe costar un toque y leerse sin pensar.
2. De noche, nada debe deslumbrar.
3. El color de cada hábito es del usuario; el color de estado es del sistema.
4. Sin cuenta, sin red: la confianza viene de que todo es local.
