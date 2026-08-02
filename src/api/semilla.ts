// Datos de ejemplo del primer arranque.
//
// Una app de hábitos recién instalada no tiene nada que enseñar: el Dashboard
// sale vacío, el calendario en blanco y Análisis sin una sola gráfica, así que
// no se ve para qué sirve nada de eso hasta que alguien crea su primer hábito
// a ciegas. Estos cinco dan algo con lo que jugar desde el minuto cero y se
// borran como cualquier otro.
import { createCategoria, getCategorias } from './categorias'
import { createHabito, getHabitos } from './habitos'

/** Todos los días de la semana, en el formato JSON que guarda `habitos.dias`
 *  (ver parseDiasSeguro en diasUtil.ts). */
const TODOS = JSON.stringify(['L', 'M', 'X', 'J', 'V', 'S', 'D'])
const LABORABLES = JSON.stringify(['L', 'M', 'X', 'J', 'V'])

/** Los colores salen de la misma paleta que ofrece el formulario de hábitos. */
const HABITOS_EJEMPLO: {
  nombre: string
  descripcion: string
  categoria: string
  unidad_medida: string
  meta_diaria: number
  dias: string
  color: string
}[] = [
  {
    nombre: 'Tomar agua',
    descripcion: 'Repartidos a lo largo del día',
    categoria: 'Salud',
    unidad_medida: 'litros',
    meta_diaria: 2,
    dias: TODOS,
    color: '#0b61b8',
  },
  {
    nombre: 'Hacer ejercicio',
    descripcion: 'Cualquier movimiento cuenta',
    categoria: 'Salud',
    unidad_medida: 'minutos',
    meta_diaria: 30,
    dias: LABORABLES,
    color: '#00ff88',
  },
  {
    nombre: 'Leer',
    descripcion: 'Antes de dormir',
    categoria: 'Productividad',
    unidad_medida: 'páginas',
    meta_diaria: 20,
    dias: TODOS,
    color: '#ff6b35',
  },
  {
    nombre: 'Meditar',
    descripcion: 'Respirar y parar un rato',
    categoria: 'Bienestar',
    unidad_medida: 'minutos',
    meta_diaria: 10,
    dias: TODOS,
    color: '#7b2cbf',
  },
  {
    nombre: 'Dormir temprano',
    descripcion: 'Antes de medianoche',
    categoria: 'Bienestar',
    unidad_medida: 'veces',
    meta_diaria: 1,
    dias: TODOS,
    color: '#4ecdc4',
  },
]

/**
 * Siembra las categorías y los cinco hábitos de ejemplo.
 *
 * No hace nada si ya hay hábitos: así una restauración de copia de seguridad o
 * un segundo arranque a medias nunca duplican nada. Las categorías se reutilizan
 * por nombre porque `categorias.nombre` es UNIQUE y `createCategoria` revienta
 * si ya existe.
 */
export async function sembrarDatosDeEjemplo(): Promise<void> {
  const habitosExistentes = await getHabitos()
  if (habitosExistentes.length > 0) return

  // El `await` va en su propia línea y NO en la cabecera del for-of
  // (`for (const c of await getCategorias())`): esa forma hace que el motor JS
  // de Lynx (PrimJS/QuickJS) genere bytecode inválido y el bundle de background
  // entero deje de evaluarse — «InternalError: stack underflow» en el arranque,
  // con la app clavada en la pantalla de carga y sin un solo error en pantalla.
  // Verificado en un SM-S918U: con esta línea separada arranca; con el await en
  // la cabecera, no.
  const categorias = await getCategorias()
  const idPorCategoria = new Map<string, number>()
  for (const categoria of categorias) {
    idPorCategoria.set(categoria.nombre, categoria.id)
  }

  for (const ejemplo of HABITOS_EJEMPLO) {
    let categoriaId = idPorCategoria.get(ejemplo.categoria)
    if (categoriaId === undefined) {
      categoriaId = (await createCategoria({ nombre: ejemplo.categoria })).id
      idPorCategoria.set(ejemplo.categoria, categoriaId)
    }
    await createHabito({
      nombre: ejemplo.nombre,
      descripcion: ejemplo.descripcion,
      categoria_id: categoriaId,
      unidad_medida: ejemplo.unidad_medida,
      meta_diaria: ejemplo.meta_diaria,
      dias: ejemplo.dias,
      color: ejemplo.color,
      activo: 1,
    })
  }
}
