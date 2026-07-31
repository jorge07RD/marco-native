import { useCallback, useState } from '@lynx-js/react'

import { useAuth } from '../../auth/useAuth'
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
      <text className="OnboardingTitle">Marco</text>
      <text className="OnboardingSubtitle">¿Cómo te llamas?</text>

      <input className="OnboardingInput" placeholder="Tu nombre" bindinput={(e) => setNombre(e.detail.value)} />

      {error ? <text className="OnboardingError">{error}</text> : null}

      <view className="OnboardingButton" bindtap={handleSubmit}>
        <text className="OnboardingButtonText">{saving ? 'Creando…' : 'Empezar'}</text>
      </view>
    </view>
  )
}
