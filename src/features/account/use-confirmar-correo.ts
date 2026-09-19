import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO } from '@/features/auth/session'
import * as creditsApi from '@/features/credits/api'
import { toApiError } from '@/lib/api-error'

/** Pedir y confirmar el código; lo comparten el alta guiada y el aviso. */
export function useConfirmarCorreo(onConfirmado: () => void) {
  const cliente = useQueryClient()
  const [aviso, setAviso] = useState<string | null>(null)

  const pedir = useMutation({
    mutationFn: authApi.requestEmailVerification,
    onSuccess: async () => {
      setAviso(null)
      // /me trae el vencimiento del código nuevo
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  const confirmar = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: async () => {
      // Confirmar da el bono de bienvenida: cambia el saldo
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      await cliente.invalidateQueries({ queryKey: creditsApi.clavesCreditos.todas })
      toast.success('Correo confirmado.')
      onConfirmado()
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setAviso(fallo.fieldErrors.code?.[0] ?? fallo.message)
    },
  })

  return { pedir, confirmar, aviso, limpiarAviso: () => setAviso(null) }
}

/** Código del alta aún vigente: no hace falta pedir otro. */
export function codigoVigente(vence: string | null): boolean {
  return vence !== null && new Date(vence).getTime() > Date.now()
}
