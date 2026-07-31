import { useEffect } from '@lynx-js/react'

import './App.css'
import { AuthProvider } from '../../auth/AuthContext'
import { useAuth } from '../../auth/useAuth'
import { Spinner } from '../../components/Spinner'
import { AppStack } from '../../router'
import { OnboardingScreen } from '../../screens/onboarding/OnboardingScreen'

function Root({ onMounted }: { onMounted?: () => void }) {
  const { status } = useAuth()

  useEffect(() => {
    onMounted?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'loading') {
    return (
      <view className="LoadingScreen">
        <Spinner />
        <text className="LoadingText">Cargando…</text>
      </view>
    )
  }

  return status === 'ready' ? <AppStack /> : <OnboardingScreen />
}

export function App({ onMounted }: { onMounted?: () => void }) {
  return (
    <AuthProvider>
      <Root onMounted={onMounted} />
    </AuthProvider>
  )
}
