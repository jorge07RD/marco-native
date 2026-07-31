import { createContext } from '@lynx-js/react'

import type { UsuarioResponse, UsuarioUpdate } from '../api/types'

export type AuthStatus = 'loading' | 'ready' | 'needs-setup'

export interface AuthContextValue {
  status: AuthStatus
  user: UsuarioResponse | null
  crearPerfil: (nombre: string) => Promise<void>
  updateUser: (body: UsuarioUpdate) => Promise<UsuarioResponse>
  reiniciarApp: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
