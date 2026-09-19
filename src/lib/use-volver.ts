import { useNavigate } from 'react-router'

import { hasInAppHistory } from '@/lib/history'

/** Vuelve a donde se estaba; si se llego por enlace directo, al respaldo:
 *  el padre de la pantalla. */
export function useVolver(respaldo: string): () => void {
  const navegar = useNavigate()

  return () => {
    if (hasInAppHistory(window.history.state)) navegar(-1)
    else navegar(respaldo)
  }
}
