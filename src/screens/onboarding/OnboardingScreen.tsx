import { useCallback, useState } from '@lynx-js/react'

import { useAuth } from '../../auth/useAuth'
import { INPUT_TEXT_COLOR } from '../../lib/colors'
// El mismo PNG que app.config.ts usa para el ícono del launcher y el splash,
// para que la portada no dependa de una copia dibujada a mano.
import appIcon from '../../../resource/app_icon.png'
import './OnboardingScreen.css'

export function OnboardingScreen() {
  const { crearPerfil } = useAuth()
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = useCallback(() => {
    if (!nombre.trim()) {
      setError('Escribe tu nombre.')
      return
    }
    setError(null)
    setSaving(true)
    crearPerfil(nombre.trim())
      .catch(() => setError('No se pudo crear el perfil.'))
      .finally(() => setSaving(false))
  }, [nombre, crearPerfil])

  return (
    <view className="OnboardingScreen">
      {/* El lienzo del PNG lleva el fondo #0e0d0d con esquinas transparentes,
          igual que --color-bg-primary: sobre esta pantalla solo se ve la diana. */}
      <image className="OnboardingMark" src={appIcon} />
      <text className="OnboardingTitle">Marco</text>
      <text className="OnboardingSubtitle">¿Cómo te llamas?</text>

      <input
        className="OnboardingInput"
        text-color={INPUT_TEXT_COLOR}
        placeholder="Tu nombre"
        value={nombre}
        bindinput={(e) => setNombre(e.detail.value)}
      />

      {error ? <text className="OnboardingError">{error}</text> : null}

      <view className="OnboardingButton" bindtap={handleSubmit}>
        <text className="OnboardingButtonText">{saving ? 'Creando…' : 'Empezar'}</text>
      </view>
    </view>
  )
}
