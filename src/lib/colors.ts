/* Colores que NO pueden venir de CSS.

   La regla general de la app es que todo el color sale de `:root` en
   App.css. Estos son las excepciones inevitables: props nativas y markup SVG
   no resuelven `var()`, así que necesitan el literal. Si cambias un token en
   App.css, revisa también este archivo. */

/** Color del texto de <input>.
 *
 *  LynxInputComponent.kt ignora la propiedad `color` de CSS: aplica el color
 *  con su propio @LynxProp("text-color"), y del mismo valor deriva el del
 *  placeholder (le antepone el alfa 0x40). Sin esta prop el EditText se queda
 *  con el color por defecto de la plataforma — casi negro, ilegible sobre el
 *  fondo oscuro de los campos. Debe seguir a --color-text-primary. */
export const INPUT_TEXT_COLOR = '#ffffff'

/** Blanco o negro, el que se lea sobre `fondo`.
 *
 *  El color de un hábito lo elige el usuario y puede ser cualquiera, así que
 *  el texto que se pinta encima (el botón Guardar del registro parcial) no
 *  puede tener un color fijo: sobre el ámbar hace falta texto oscuro y sobre
 *  un morado saturado, claro. El umbral va sobre la luminancia relativa de
 *  sRGB —la de WCAG—, que separa claro de oscuro mucho mejor que promediar
 *  los tres canales a pelo. */
export function textoSobre(fondo: string): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(fondo)
  if (!match) return '#ffffff'
  const canal = (i: number) => {
    const v = parseInt(match[1].slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const luminancia = 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4)
  return luminancia > 0.4 ? '#1a1420' : '#ffffff'
}
