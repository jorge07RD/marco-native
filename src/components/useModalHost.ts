import { useContext } from '@lynx-js/react'

import { ModalHostContext } from './modalHostContext'

export function useModalHost() {
  const ctx = useContext(ModalHostContext)
  if (!ctx) throw new Error('useModalHost fuera de AppLayout')
  return ctx
}
