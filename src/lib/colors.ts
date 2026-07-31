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
