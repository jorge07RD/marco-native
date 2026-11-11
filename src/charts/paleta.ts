/* Colores de las gráficas SVG.

   El markup que va por la prop `content` no resuelve var(), así que las
   gráficas no pueden leer los tokens de App.css. Este es el único sitio donde
   se copian: si cambia un token, se cambia aquí también (el comentario de cada
   uno dice cuál es). */

export const PISTA = '#2b2733' // --color-track: lo que falta, como el anillo del Dashboard
export const GUIA = '#2c2834' // guías de 60 y 80
export const ROTULO = '#6f6a7c' // --color-text-muted
export const LINEA = '#d2b4f5' // --color-select-fg
export const PREVIA = '#5d5868' // periodo anterior
export const FONDO = '#15131a' // --color-bg-secondary: recorta puntos y separa porciones

/** Semáforo por escalón de `nivelProgreso` (0 = registrado sin nada). */
export const NIVEL = ['#2a1f24', '#c4503f', '#d8a637', '#4bb377', '#7fe0a8'] // --color-progreso-0..4

export function n1(v: number): string {
  return v.toFixed(1)
}
