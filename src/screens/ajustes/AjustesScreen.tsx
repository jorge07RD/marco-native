import { useCallback, useEffect, useState } from '@lynx-js/react'

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
import { closeIcon, plusIcon } from '../../components/icons'
import { useModalHost } from '../../components/useModalHost'
import { agregarHora, describirHoras, parseHoras, quitarHora, serializarHoras } from '../../lib/recordatorios'
import './AjustesScreen.css'

// Literales: el SVG de `content` no resuelve var().
const PILL_ICON = '#d2b4f5' // --color-select-fg
const ADD_ICON = '#a29dac' // --color-text-secondary

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

  return (
    <view className="AjustesScreen ScreenEnter">
      <BrandHeader title="Ajustes" />

      <view className="AjustesSection">
        <text className="AjustesSectionTitle">Perfil</text>
        <text className="AjustesLabel">Nombre</text>
        <input
          text-color={INPUT_TEXT_COLOR}
          id="ajustes-nombre"
          className="AjustesInput"
          value={nombreDraft}
          bindinput={(e) => setNombreDraft(e.detail.value)}
        />
        {perfilError ? <text className="AjustesError">{perfilError}</text> : null}
        <view className="AjustesButton" bindtap={handleGuardarPerfil}>
          <text className="AjustesButtonText">{perfilSaving ? 'Guardando…' : 'Guardar cambios'}</text>
        </view>
      </view>

      <view className="AjustesSection">
        <text className="AjustesSectionTitle">Progreso</text>
        <view className="AjustesRow" bindtap={handleToggleVerFuturo}>
          <text className="AjustesRowLabel">Puedo ver el futuro 🔮</text>
          <Switch on={!!user?.ver_futuro} />
        </view>
        <view className="AjustesRow" bindtap={handleToggleMostrarOcultos}>
          <text className="AjustesRowLabel">Mostrar hábitos ocultos</text>
          <Switch on={!!user?.mostrar_ocultos} />
        </view>
      </view>

      <view className="AjustesSection">
        <text className="AjustesSectionTitle">Categorías</text>
        {categoriasError ? <text className="AjustesError">{categoriasError}</text> : null}
        {categorias.map((cat, index) => (
          <view
            key={cat.id}
            className="AjustesCategoriaRow StaggerIn"
            style={{ animationDelay: `${Math.min(index, 10) * 0.04}s` }}
          >
            {editingCategoriaId === cat.id ? (
              <>
                <input
                  text-color={INPUT_TEXT_COLOR}
                  id={`categoria-edit-${cat.id}`}
                  className="AjustesInput"
                  value={editCategoriaNombre}
                  bindinput={(e) => setEditCategoriaNombre(e.detail.value)}
                  style={{ flex: 1 }}
                />
                <text className="AjustesCategoriaActionText" bindtap={() => handleGuardarCategoria(cat.id)}>
                  Guardar
                </text>
                <text className="AjustesCategoriaActionText" bindtap={() => setEditingCategoriaId(null)}>
                  Cancelar
                </text>
              </>
            ) : (
              <>
                <text className="AjustesCategoriaNombre">{cat.nombre}</text>
                <text className="AjustesCategoriaActionText" bindtap={() => startEditCategoria(cat)}>
                  Editar
                </text>
                <text
                  className="AjustesCategoriaActionText AjustesCategoriaActionText--danger"
                  bindtap={() => handleEliminarCategoria(cat.id)}
                >
                  Eliminar
                </text>
              </>
            )}
          </view>
        ))}
        <view className="AjustesAddRow">
          <input
            text-color={INPUT_TEXT_COLOR}
            className="AjustesAddInput"
            value={nuevaCategoriaNombre}
            placeholder="Nueva categoría"
            bindinput={(e) => setNuevaCategoriaNombre(e.detail.value)}
          />
          <view className="AjustesAddButton" bindtap={handleAgregarCategoria}>
            <text className="AjustesAddButtonText">Agregar</text>
          </view>
        </view>
      </view>

      <view className="AjustesSection">
        <text className="AjustesSectionTitle">Notificaciones</text>
        <view className="AjustesRow" bindtap={handleToggleNotificaciones}>
          <text className="AjustesRowLabel">Recordatorio diario</text>
          <Switch on={!!user?.notificaciones_activas} />
        </view>
        {user?.notificaciones_activas ? (
          <view style={{ marginTop: '10px' }}>
            <text className="AjustesNotice">{`Te avisaremos a las ${describirHoras(horasRecordatorio)}.`}</text>
            <view className="HoraChipRow">
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
          </view>
        ) : null}
        <view className="AjustesButton" style={{ marginTop: '12px' }} bindtap={handleProbarNotificacion}>
          <text className="AjustesButtonText">Probar notificación</text>
        </view>
      </view>

      <view className="AjustesSection">
        <text className="AjustesSectionTitle">Backup</text>
        <text className="AjustesNotice">
          Tus datos viven solo en este teléfono. Exporta un backup de vez en cuando para no perderlos.
        </text>
        {backupStatus ? <text className="AjustesError">{backupStatus}</text> : null}
        <view className="AjustesButton" bindtap={handleExportarBackup}>
          <text className="AjustesButtonText">{exporting ? 'Exportando…' : 'Exportar backup'}</text>
        </view>

        {backups.length > 0 ? (
          <view style={{ marginTop: '12px' }}>
            <text className="AjustesLabel">Backups encontrados en Descargas</text>
            {backups.map((backup) => (
              <view key={backup.uri} className="AjustesCategoriaRow">
                <text className="AjustesCategoriaNombre">{backup.nombre}</text>
                <text className="AjustesCategoriaActionText" bindtap={() => setPendingRestoreUri(backup.uri)}>
                  Restaurar
                </text>
              </view>
            ))}
          </view>
        ) : null}

        {pendingRestoreUri ? (
          <view className="AjustesConfirmBox">
            <text className="AjustesConfirmText">
              Esto sobrescribirá todos tus datos actuales con lo que haya en ese backup. ¿Continuar?
            </text>
            <view className="AjustesButton" bindtap={handleRestaurarBackup}>
              <text className="AjustesButtonText">{restoring ? 'Restaurando…' : 'Confirmar'}</text>
            </view>
            <view
              className="AjustesButton"
              style={{ backgroundColor: 'transparent' }}
              bindtap={() => setPendingRestoreUri(null)}
            >
              <text className="AjustesButtonText" style={{ color: 'var(--color-text-secondary)' }}>
                Cancelar
              </text>
            </view>
          </view>
        ) : null}
      </view>

      <view className="AjustesSection">
        <text className="AjustesSectionTitle">Datos</text>

        {deleteAction === null ? (
          <>
            <view className="AjustesDangerButton" bindtap={() => setDeleteAction('datos')}>
              <text className="AjustesDangerButtonText">Eliminar todos los datos</text>
            </view>
            <view className="AjustesDangerButton" bindtap={() => setDeleteAction('cuenta')}>
              <text className="AjustesDangerButtonText">Reiniciar app</text>
            </view>
          </>
        ) : (
          <view className="AjustesConfirmBox">
            <text className="AjustesConfirmText">
              {deleteAction === 'cuenta'
                ? 'Esto borrará absolutamente todo (hábitos, categorías, historial y tu perfil) de forma irreversible. ¿Confirmas?'
                : 'Esto borrará tus registros y progreso (mantiene hábitos y categorías). ¿Confirmas?'}
            </text>
            {deleteError ? <text className="AjustesError">{deleteError}</text> : null}
            <view className="AjustesButton" bindtap={handleConfirmarBorrado}>
              <text className="AjustesButtonText">{deleting ? 'Procesando…' : 'Confirmar'}</text>
            </view>
            <view
              className="AjustesButton"
              style={{ backgroundColor: 'transparent' }}
              bindtap={() => {
                setDeleteAction(null)
                setDeleteError(null)
              }}
            >
              <text className="AjustesButtonText" style={{ color: 'var(--color-text-secondary)' }}>
                Cancelar
              </text>
            </view>
          </view>
        )}
      </view>
    </view>
  )
}
