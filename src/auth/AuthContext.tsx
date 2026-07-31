// Estado del perfil local (reemplaza la sesión/JWT del backend). Al arrancar,
// revisa si ya existe una fila en `perfil` (ver src/api/marco.ts) para decidir
// si mostrar el onboarding (pedir nombre) o entrar directo al AppStack.
import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react'
import type { ReactNode } from 'react'

import {
  crearPerfil as crearPerfilLocal,
  eliminarCuenta,
  existePerfil,
  getUsuarioActual,
  updateUsuarioActual,
} from '../api/marco'
import type { UsuarioResponse, UsuarioUpdate } from '../api/types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UsuarioResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    existePerfil()
      .then(async (existe) => {
        if (!existe) {
          if (!cancelled) setStatus('needs-setup')
          return
        }
        const perfil = await getUsuarioActual()
        if (!cancelled) {
          setUser(perfil)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('needs-setup')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const crearPerfil = useCallback(async (nombre: string) => {
    const perfil = await crearPerfilLocal(nombre)
    setUser(perfil)
    setStatus('ready')
  }, [])

  const updateUser = useCallback(async (body: UsuarioUpdate): Promise<UsuarioResponse> => {
    const actualizado = await updateUsuarioActual(body)
    setUser(actualizado)
    return actualizado
  }, [])

  const reiniciarApp = useCallback(async () => {
    await eliminarCuenta()
    setUser(null)
    setStatus('needs-setup')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, crearPerfil, updateUser, reiniciarApp }),
    [status, user, crearPerfil, updateUser, reiniciarApp],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
