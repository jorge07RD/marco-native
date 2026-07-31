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
