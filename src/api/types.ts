// Tipos que reflejan los schemas del backend FastAPI (ver analysis/01-data-model.md,
// analysis/02-api-reference.md). Nombres de campo en español para calzar 1:1 con la API.

export interface UsuarioResponse {
  id: number
  nombre: string
  ver_futuro: boolean
  notificaciones_activas: boolean
  hora_recordatorio: string
  mostrar_ocultos: boolean
  created_at: string
  updated_at: string
}

export interface Habito {
  id: number
  nombre: string
  descripcion: string | null
  categoria_id: number
  usuario_id: number
  unidad_medida: string
  meta_diaria: number
  dias: string // JSON array serializado, ej. '["L","M","X"]'
  color: string
  activo: number
  oculto: number
  created_at: string
  updated_at: string
}

export interface ProgresoHabito {
  id: number
  registro_id: number
  habito_id: number
  valor: number
  completado: boolean
  created_at: string
  updated_at: string
}

export interface RegistroConProgresos {
  id: number
  usuario_id: number
  fecha: string // YYYY-MM-DD
  notas: string | null
  created_at: string
  updated_at: string
  progresos: ProgresoHabito[]
}

export interface RendimientoDia {
  fecha: string
  habitos: number
  habitos_completados: number
}

export interface Categoria {
  id: number
  nombre: string
  created_at: string
  updated_at: string | null
}

export interface CategoriaCreate {
  nombre: string
}

export interface HabitoCreate {
  nombre: string
  descripcion?: string | null
  categoria_id: number
  unidad_medida: string
  meta_diaria: number
  dias: string // JSON array serializado, ej. '["L","M","X"]'
  color: string
  activo?: number
  oculto?: number
}

export type HabitoUpdate = Partial<HabitoCreate>

export interface UsuarioUpdate {
  nombre?: string
  ver_futuro?: boolean
  notificaciones_activas?: boolean
  hora_recordatorio?: string
  mostrar_ocultos?: boolean
}

export interface ProgresoDiaCalendario {
  fecha: string
  total_habitos: number
  habitos_completados: number
  porcentaje: number
  tiene_registro: boolean
}

export interface CumplimientoHabito {
  fecha: string
  nombre_habito: string
  habitos_completados: number
  total_habitos: number
  color: string
}
