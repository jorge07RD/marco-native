import { useCallback, useEffect, useState } from '@lynx-js/react'
import type { ReactNode } from 'react'

import {
  createCategoria,
  deleteCategoria,
  eliminarTodosLosDatos,
  getCategorias,
  updateCategoria,
} from '../../api/marco'
import type { Categoria } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { BrandHeader } from '../../components/BrandHeader'
import { Switch } from '../../components/Switch'
import { exportBackup, listBackups, restoreBackup } from '../../db/backup'
import type { BackupFileRef } from '../../db/native'
import {
  cancelReminder,
  requestNotificationPermission,
  scheduleReminders,
  showTestNotification,
} from '../../native/reminders'
import { INPUT_TEXT_COLOR } from '../../lib/colors'
import { HoraPickerSheet } from '../../components/HoraPickerSheet'
import { type AjusteIconName, ajusteIcon, chevronIcon, closeIcon, plusIcon } from '../../components/icons'
import { useModalHost } from '../../components/useModalHost'
import { agregarHora, describirHoras, parseHoras, quitarHora, serializarHoras } from '../../lib/recordatorios'
import './AjustesScreen.css'

// Literales: el SVG de `content` no resuelve var().
const PILL_ICON = '#d2b4f5' // --color-select-fg
const ADD_ICON = '#a29dac' // --color-text-secondary
const ROW_ICON = '#a29dac' // --color-text-secondary
const DANGER_ICON = '#ea8e80' // --color-progreso-1-text
const CHEVRON = '#6f6a7c' // --color-text-muted

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** "marco_backup_2026-10-14T11-50-17-722Z.json" → título "14 de octubre de
 *  2026" y la hora local "13:50". Si el nombre no sigue ese patrón (un archivo
 *  renombrado a mano), se enseña tal cual. */
function describirBackup(nombre: string): { titulo: string; hora: string | null } {
  const m = nombre.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/)
  if (!m) return { titulo: nombre, hora: null }
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`)
  if (Number.isNaN(fecha.getTime())) return { titulo: nombre, hora: null }
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mm = String(fecha.getMinutes()).padStart(2, '0')
  return {
    titulo: `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`,
    hora: `${hh}:${mm}`,
  }
}

/** Rótulo de un grupo, fuera de la superficie, como las categorías de Hábitos. */
function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <view className="AjGrupo">
      <text className="AjGrupoLabel">{titulo}</text>
      <view className="AjGrupoLista">{children}</view>
    </view>
  )
}

/** Fila de ajuste de Material 3: ícono, título con línea de apoyo y, a la
 *  derecha, el control (interruptor, chevrón o texto). Toda la fila es el
 *  área táctil. */
function Fila({
  icono,
  titulo,
  descripcion,
  final,
  onTap,
  dividida,
  peligro,
}: {
  icono?: AjusteIconName
  titulo: string
  descripcion?: string
  final?: ReactNode
  onTap?: () => void
  dividida?: boolean
  peligro?: boolean
}) {
  return (
    <view className={`AjFila ${dividida ? 'AjDividida' : ''}`} bindtap={onTap}>
      {icono ? <svg className="AjFilaIcono" content={ajusteIcon(icono, peligro ? DANGER_ICON : ROW_ICON)} /> : null}
      <view className="AjFilaTexto">
        <text className={`AjFilaTitulo ${peligro ? 'AjFilaTitulo--peligro' : ''}`}>{titulo}</text>
        {descripcion ? <text className="AjFilaDesc">{descripcion}</text> : null}
      </view>
      {final}
    </view>
  )
}

function Chevron() {
  return <svg className="AjChevron" content={chevronIcon('der', CHEVRON)} />
}

/** Confirmación en línea, dentro del mismo grupo: el texto y dos botones,
 *  el de confirmar en ladrillo porque las tres acciones que la usan borran. */
function Confirmacion({
  texto,
  error,
  ocupado,
  ocupadoTexto,
  onConfirmar,
  onCancelar,
}: {
  texto: string
  error?: string | null
  ocupado: boolean
  ocupadoTexto: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <view className="AjConfirma AjDividida">
      <text className="AjConfirmaTexto">{texto}</text>
      {error ? <text className="AjustesError">{error}</text> : null}
      <view className="AjConfirmaBotones">
        <view className="AjBoton" bindtap={onCancelar}>
          <text className="AjBotonText">Cancelar</text>
        </view>
        <view className="AjBoton AjBoton--peligro" bindtap={onConfirmar}>
          <text className="AjBotonText AjBotonText--peligro">{ocupado ? ocupadoTexto : 'Confirmar'}</text>
        </view>
      </view>
    </view>
  )
}

export function AjustesScreen() {
  const { user, updateUser, reiniciarApp } = useAuth()

  const [perfilError, setPerfilError] = useState<string | null>(null)
  const [perfilSaving, setPerfilSaving] = useState(false)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriasError, setCategoriasError] = useState<string | null>(null)
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('')
  const [editingCategoriaId, setEditingCategoriaId] = useState<number | null>(null)
  const [editCategoriaNombre, setEditCategoriaNombre] = useState('')

  const [deleteAction, setDeleteAction] = useState<'datos' | 'cuenta' | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [backups, setBackups] = useState<BackupFileRef[]>([])
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [pendingRestoreUri, setPendingRestoreUri] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  const loadCategorias = useCallback(() => {
    getCategorias()
      .then(setCategorias)
      .catch(() => setCategoriasError('No se pudieron cargar las categorías.'))
  }, [])

  useEffect(() => {
    loadCategorias()
  }, [loadCategorias])

  const loadBackups = useCallback(() => {
    listBackups()
      .then(setBackups)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const [nombreDraft, setNombreDraft] = useState(user?.nombre ?? '')

  // El <input> se controla por prop `value` (ver LynxInputComponent.kt, donde
  // `value` es un @LynxProp). Este efecto solo cubre el caso de que el perfil
  // termine de cargar después de montar la pantalla; no corre en cada tecla.
  useEffect(() => {
    if (user) setNombreDraft(user.nombre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleGuardarPerfil = useCallback(() => {
    if (!nombreDraft.trim()) {
      setPerfilError('El nombre es obligatorio.')
      return
    }
    setPerfilError(null)
    setPerfilSaving(true)
    updateUser({ nombre: nombreDraft.trim() })
      .catch(() => setPerfilError('No se pudo guardar el perfil.'))
      .finally(() => setPerfilSaving(false))
  }, [nombreDraft, updateUser])

  const handleToggleVerFuturo = useCallback(() => {
    if (!user) return
    updateUser({ ver_futuro: !user.ver_futuro }).catch(() => undefined)
  }, [user, updateUser])

  const handleToggleMostrarOcultos = useCallback(() => {
    if (!user) return
    updateUser({ mostrar_ocultos: !user.mostrar_ocultos }).catch(() => undefined)
  }, [user, updateUser])

  const handleToggleNotificaciones = useCallback(() => {
    if (!user) return
    if (user.notificaciones_activas) {
      cancelReminder()
      updateUser({ notificaciones_activas: false }).catch(() => undefined)
      return
    }
    requestNotificationPermission().finally(() => {
      const horas = parseHoras(user.hora_recordatorio)
      scheduleReminders(horas.length > 0 ? horas : ['08:00'])
      updateUser({ notificaciones_activas: true }).catch(() => undefined)
    })
  }, [user, updateUser])

  const handleProbarNotificacion = useCallback(() => {
    requestNotificationPermission().finally(() => showTestNotification())
  }, [])

  const guardarHoras = useCallback(
    (horas: string[]) => {
      if (!user) return
      updateUser({ hora_recordatorio: serializarHoras(horas) }).catch(() => undefined)
      if (user.notificaciones_activas) scheduleReminders(horas)
    },
    [user, updateUser],
  )

  // Cualquier hora: abre el selector propio (HoraPickerSheet) y la añade como
  // pastilla. Arranca una hora después de la última elegida, que suele ser la
  // siguiente que se quiere y además no está repetida. Se abre desde el propio
  // handler del tap: montar el modal desde un efecto o un .then() falla en
  // Lynx (ver el comentario de `pctDe` en DashboardScreen).
  const modalHost = useModalHost()
  const handleAgregarHora = useCallback(() => {
    if (!user) return
    const actuales = parseHoras(user.hora_recordatorio)
    const ultima = actuales[actuales.length - 1]
    const siguiente = ultima ? `${String((Number(ultima.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00` : '20:00'
    modalHost.open(
      <HoraPickerSheet
        inicial={siguiente}
        existentes={actuales}
        onCancel={modalHost.close}
        onAdd={(hora) => {
          modalHost.close()
          guardarHoras(agregarHora(actuales, hora))
        }}
      />,
    )
  }, [user, guardarHoras, modalHost])

  // Siempre queda al menos una hora (ver quitarHora): la última pastilla no
  // lleva equis.
  const handleQuitarHora = useCallback(
    (hora: string) => {
      if (!user) return
      guardarHoras(quitarHora(parseHoras(user.hora_recordatorio), hora))
    },
    [user, guardarHoras],
  )

  const horasRecordatorio = parseHoras(user?.hora_recordatorio)

  const handleAgregarCategoria = useCallback(() => {
    if (!nuevaCategoriaNombre.trim()) return
    createCategoria({ nombre: nuevaCategoriaNombre.trim() })
      .then(() => {
        setNuevaCategoriaNombre('')
        loadCategorias()
      })
      .catch(() => setCategoriasError('No se pudo crear la categoría (¿nombre repetido?).'))
  }, [nuevaCategoriaNombre, loadCategorias])

  const startEditCategoria = useCallback((cat: Categoria) => {
    setEditingCategoriaId(cat.id)
    setEditCategoriaNombre(cat.nombre)
  }, [])

  const handleGuardarCategoria = useCallback(
    (id: number) => {
      if (!editCategoriaNombre.trim()) return
      updateCategoria(id, { nombre: editCategoriaNombre.trim() })
        .then(() => {
          setEditingCategoriaId(null)
          loadCategorias()
        })
        .catch(() => setCategoriasError('No se pudo actualizar la categoría.'))
    },
    [editCategoriaNombre, loadCategorias],
  )

  const handleEliminarCategoria = useCallback(
    (id: number) => {
      deleteCategoria(id)
        .then(() => loadCategorias())
        .catch(() => setCategoriasError('No se pudo eliminar (puede estar en uso por un hábito).'))
    },
    [loadCategorias],
  )

  const handleConfirmarBorrado = useCallback(() => {
    setDeleteError(null)
    setDeleting(true)
    const accion = deleteAction === 'cuenta' ? reiniciarApp() : eliminarTodosLosDatos()
    accion
      .then(() => {
        if (deleteAction !== 'cuenta') setDeleteAction(null)
      })
      .catch(() => setDeleteError('No se pudo completar la operación.'))
      .finally(() => setDeleting(false))
  }, [deleteAction, reiniciarApp])

  const handleExportarBackup = useCallback(() => {
    setExporting(true)
    setBackupStatus(null)
    exportBackup()
      .then((ok) => {
        setBackupStatus(ok ? 'Backup exportado a Descargas.' : 'No se pudo exportar el backup.')
        if (ok) loadBackups()
      })
      .catch(() => setBackupStatus('No se pudo exportar el backup.'))
      .finally(() => setExporting(false))
  }, [loadBackups])

  const handleRestaurarBackup = useCallback(() => {
    if (!pendingRestoreUri) return
    setRestoring(true)
    setBackupStatus(null)
    restoreBackup(pendingRestoreUri)
      .then((ok) => {
        setBackupStatus(
          ok ? 'Backup restaurado. Cierra y reabre la app para verlo reflejado.' : 'No se pudo restaurar ese backup.',
        )
      })
      .catch(() => setBackupStatus('No se pudo restaurar ese backup.'))
      .finally(() => {
        setRestoring(false)
        setPendingRestoreUri(null)
      })
  }, [pendingRestoreUri])

  const nombreCambiado = !!user && nombreDraft.trim() !== '' && nombreDraft.trim() !== user.nombre
  const notificaciones = !!user?.notificaciones_activas

  return (
    <view className="AjustesScreen ScreenEnter">
      <BrandHeader title="Ajustes" />

      <Grupo titulo="Perfil">
        <view className="AjCampo">
          <text className="AjCampoLabel">Tu nombre</text>
          <view className="AjCampoFila">
            <input
              text-color={INPUT_TEXT_COLOR}
              id="ajustes-nombre"
              className="AjInput"
              value={nombreDraft}
              placeholder="Cómo te llamamos"
              bindinput={(e) => setNombreDraft(e.detail.value)}
            />
            {/* Guardar solo aparece cuando hay algo que guardar: es la única
                acción en rosa de la pantalla. */}
            {nombreCambiado || perfilSaving ? (
              <view className="AjBotonGuardar" bindtap={handleGuardarPerfil}>
                <text className="AjBotonGuardarText">{perfilSaving ? 'Guardando…' : 'Guardar'}</text>
              </view>
            ) : null}
          </view>
          {perfilError ? <text className="AjustesError">{perfilError}</text> : null}
        </view>
      </Grupo>

      <Grupo titulo="Progreso">
        <Fila
          icono="futuro"
          titulo="Puedo ver el futuro 🔮"
          descripcion="Abre y marca días que aún no llegan"
          final={<Switch on={!!user?.ver_futuro} />}
          onTap={handleToggleVerFuturo}
        />
        <Fila
          dividida
          icono="ocultos"
          titulo="Mostrar hábitos ocultos"
          descripcion="Los incluye en Progreso, Calendario y Análisis"
          final={<Switch on={!!user?.mostrar_ocultos} />}
          onTap={handleToggleMostrarOcultos}
        />
      </Grupo>

      <Grupo titulo="Notificaciones">
        <Fila
          icono="campana"
          titulo="Recordatorio diario"
          descripcion={notificaciones ? `A las ${describirHoras(horasRecordatorio)}` : 'Apagado'}
          final={<Switch on={notificaciones} />}
          onTap={handleToggleNotificaciones}
        />
        {notificaciones ? (
          <view className="AjHoras">
            {horasRecordatorio.map((hora) => (
              <view key={hora} className="HoraPill">
                <text className="HoraPillText">{hora}</text>
                {horasRecordatorio.length > 1 ? (
                  <view className="HoraPillQuitar" bindtap={() => handleQuitarHora(hora)}>
                    <svg className="HoraPillQuitarIcon" content={closeIcon(PILL_ICON)} />
                  </view>
                ) : null}
              </view>
            ))}
            <view className="HoraPill HoraPill--agregar" bindtap={handleAgregarHora}>
              <svg className="HoraPillAgregarIcon" content={plusIcon(ADD_ICON)} />
              <text className="HoraPillText HoraPillText--agregar">Añadir hora</text>
            </view>
          </view>
        ) : null}
        <Fila
          dividida
          icono="probar"
          titulo="Probar notificación"
          descripcion="Te llega una ahora mismo"
          final={<Chevron />}
          onTap={handleProbarNotificacion}
        />
      </Grupo>

      <Grupo titulo="Categorías">
        {categorias.map((cat, index) => (
          <view
            key={cat.id}
            className={`AjCategoria StaggerIn ${index > 0 ? 'AjDividida' : ''}`}
            style={{ animationDelay: `${Math.min(index, 10) * 0.04}s` }}
          >
            {editingCategoriaId === cat.id ? (
              <>
                <input
                  text-color={INPUT_TEXT_COLOR}
                  id={`categoria-edit-${cat.id}`}
                  className="AjInput"
                  value={editCategoriaNombre}
                  bindinput={(e) => setEditCategoriaNombre(e.detail.value)}
                />
                <view className="AjAccion" bindtap={() => handleGuardarCategoria(cat.id)}>
                  <text className="AjAccionText AjAccionText--fuerte">Guardar</text>
                </view>
                <view className="AjAccion" bindtap={() => setEditingCategoriaId(null)}>
                  <text className="AjAccionText">Cancelar</text>
                </view>
              </>
            ) : (
              <>
                <text className="AjCategoriaNombre">{cat.nombre}</text>
                <view className="AjAccion" bindtap={() => startEditCategoria(cat)}>
                  <text className="AjAccionText">Editar</text>
                </view>
                <view className="AjAccion" bindtap={() => handleEliminarCategoria(cat.id)}>
                  <text className="AjAccionText AjAccionText--suave">Eliminar</text>
                </view>
              </>
            )}
          </view>
        ))}
        <view className={`AjCategoria ${categorias.length > 0 ? 'AjDividida' : ''}`}>
          <input
            text-color={INPUT_TEXT_COLOR}
            className="AjInput"
            value={nuevaCategoriaNombre}
            placeholder="Nueva categoría"
            bindinput={(e) => setNuevaCategoriaNombre(e.detail.value)}
          />
          <view className="AjAgregar" bindtap={handleAgregarCategoria}>
            <svg className="AjAgregarIcono" content={plusIcon(PILL_ICON)} />
          </view>
        </view>
        {categoriasError ? <text className="AjustesError AjustesError--grupo">{categoriasError}</text> : null}
      </Grupo>

      <Grupo titulo="Backup">
        <Fila
          icono="exportar"
          titulo={exporting ? 'Exportando…' : 'Exportar backup'}
          descripcion="Tus datos viven solo en este teléfono. Guarda una copia en Descargas de vez en cuando."
          final={<Chevron />}
          onTap={handleExportarBackup}
        />
        {backups.map((backup) => {
          const { titulo, hora } = describirBackup(backup.nombre)
          return (
            <Fila
              key={backup.uri}
              dividida
              icono="restaurar"
              titulo={titulo}
              descripcion={hora ? `${hora} · en Descargas` : 'En Descargas'}
              final={<text className="AjAccionText">Restaurar</text>}
              onTap={() => setPendingRestoreUri(backup.uri)}
            />
          )
        })}
        {pendingRestoreUri ? (
          <Confirmacion
            texto="Esto sobrescribirá todos tus datos actuales con lo que haya en ese backup. ¿Continuar?"
            ocupado={restoring}
            ocupadoTexto="Restaurando…"
            onConfirmar={handleRestaurarBackup}
            onCancelar={() => setPendingRestoreUri(null)}
          />
        ) : null}
        {backupStatus ? <text className="AjustesNotice AjustesError--grupo">{backupStatus}</text> : null}
      </Grupo>

      <Grupo titulo="Datos">
        <Fila
          peligro
          icono="borrar"
          titulo="Eliminar todos los datos"
          descripcion="Borra registros y progreso; mantiene hábitos y categorías"
          onTap={() => setDeleteAction('datos')}
        />
        <Fila
          dividida
          peligro
          icono="reiniciar"
          titulo="Reiniciar app"
          descripcion="Borra todo, también tu perfil"
          onTap={() => setDeleteAction('cuenta')}
        />
        {deleteAction !== null ? (
          <Confirmacion
            texto={
              deleteAction === 'cuenta'
                ? 'Esto borrará absolutamente todo (hábitos, categorías, historial y tu perfil) de forma irreversible. ¿Confirmas?'
                : 'Esto borrará tus registros y progreso (mantiene hábitos y categorías). ¿Confirmas?'
            }
            error={deleteError}
            ocupado={deleting}
            ocupadoTexto="Procesando…"
            onConfirmar={handleConfirmarBorrado}
            onCancelar={() => {
              setDeleteAction(null)
              setDeleteError(null)
            }}
          />
        ) : null}
      </Grupo>
    </view>
  )
}
