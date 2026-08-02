/* Escala de progreso compartida.

   El calendario y la barra del Dashboard tienen que coincidir: un día al 24%
   debe pintarse del mismo color que la barra cuando va por el 24%. Por eso el
   umbral vive aquí y no duplicado en cada pantalla.

   Los colores en sí están en App.css (--color-progreso-0..4). Aquí solo se
   decide el escalón; el color lo pone el CSS.

   Umbrales del semáforo clásico, los mismos que la app usaba desde el
   principio: rojo por debajo de 60, ámbar hasta 80, verde por encima y verde
   pleno al completar el día. */

/** 0 = registrado pero sin nada cumplido. 1–4 son los escalones del semáforo. */
export type NivelProgreso = 0 | 1 | 2 | 3 | 4

export function nivelProgreso(porcentaje: number): NivelProgreso {
  if (porcentaje <= 0) return 0
  if (porcentaje < 60) return 1
  if (porcentaje < 80) return 2
  if (porcentaje < 100) return 3
  return 4
}

/** Cuánto aporta un hábito al día: 1 si está completado, y si no la fracción
 *  de la meta que se registró (28 de 30 minutos → 0.933).
 *
 *  `completado` manda sobre el cálculo a propósito. Antes de que existiera el
 *  registro parcial, `toggleProgreso` ya dejaba `valor` en 0 o en la meta
 *  exacta, así que para todo el historial previo esta función devuelve los
 *  mismos 1 y 0 que daba el conteo binario: cambiar a fracciones no reescribe
 *  ni un número de lo ya guardado. También cubre el caso degenerado de un
 *  hábito borrado o con meta 0, donde no hay fracción que calcular.
 *
 *  Los tres consumidores (barra del Dashboard, calendario y Análisis) tienen
 *  que usar esta misma función, por lo mismo que `nivelProgreso` vive aquí. */
export function fraccionProgreso(valor: number, metaDiaria: number, completado: boolean): number {
  if (completado) return 1
  if (!Number.isFinite(metaDiaria) || metaDiaria <= 0) return 0
  const fraccion = valor / metaDiaria
  if (!Number.isFinite(fraccion) || fraccion <= 0) return 0
  return fraccion > 1 ? 1 : fraccion
}
