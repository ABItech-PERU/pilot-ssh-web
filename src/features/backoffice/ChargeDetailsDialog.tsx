import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { FormDialogContent } from '@/components/form-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import * as platformApi from '@/features/backoffice/api'
import {
  CamposDelCobro,
  type ErroresDelCobro,
} from '@/features/backoffice/CamposDelCobro'
import { ReceiptViewer } from '@/features/credits/ReceiptViewer'
import { toApiError } from '@/lib/api-error'
import type { PaymentMethod, PlatformTopUp } from '@/types/api'

interface Props {
  solicitud: PlatformTopUp | null
  onClose: () => void
}

/** Respaldo de un cobro acreditado. El importe no se toca: se corrige con
 *  un ajuste u otra recarga. */
export function ChargeDetailsDialog({ solicitud, onClose }: Props) {
  const cliente = useQueryClient()
  const [metodo, setMetodo] = useState<PaymentMethod | ''>('')
  const [referencia, setReferencia] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errores, setErrores] = useState<ErroresDelCobro>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [mostrada, setMostrada] = useState(solicitud)
  const [viendo, setViendo] = useState(false)

  const abierto = solicitud !== null

  useEffect(() => {
    if (!abierto) return
    setMostrada(solicitud)
    // Parte de lo guardado
    setMetodo(solicitud?.payment_method ?? '')
    setReferencia(solicitud?.manual_reference ?? '')
    setArchivo(null)
    setErrores({})
    setAviso(null)
    setViendo(false)
  }, [abierto, solicitud])

  const guardar = useMutation({
    mutationFn: () =>
      platformApi.updateCharge(mostrada!.id, {
        method: metodo === '' ? null : metodo,
        reference: referencia.trim(),
        receipt: archivo,
      }),
    onSuccess: async () => {
      await platformApi.invalidarPlataforma(cliente)
      onClose()
      toast.success('Datos del cobro guardados.')
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setErrores({
        method: fallo.fieldErrors.method?.[0],
        reference: fallo.fieldErrors.reference?.[0],
        receipt: fallo.fieldErrors.receipt?.[0],
      })
      if (!fallo.hasFieldErrors) setAviso(fallo.message)
    },
  })

  const listo = metodo !== '' || referencia.trim() !== '' || archivo !== null
  const guardado = mostrada && platformApi.comprobanteDe(mostrada)

  return (
    <Dialog open={abierto} onOpenChange={(sigue) => !sigue && onClose()}>
      <FormDialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Datos del cobro</DialogTitle>
          <DialogDescription>
            {mostrada
              ? `${mostrada.package_name} de ${mostrada.organization.name}. El importe no cambia.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        <CamposDelCobro
          prefijo="datos-del-cobro"
          reparto="dos-columnas"
          comprobante={guardado && { archivo: guardado, onVer: () => setViendo(true) }}
          metodo={metodo}
          onMetodo={(valor) => {
            setMetodo(valor)
            setErrores((actuales) => ({ ...actuales, method: undefined }))
          }}
          referencia={referencia}
          onReferencia={(valor) => {
            setReferencia(valor)
            setErrores((actuales) => ({ ...actuales, reference: undefined }))
          }}
          archivo={archivo}
          onArchivo={(elegido) => {
            setArchivo(elegido)
            setErrores((actuales) => ({ ...actuales, receipt: undefined }))
          }}
          errores={errores}
        />

        <DialogFooter>
          <Button disabled={!listo || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            Guardar los datos
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>

      {mostrada && guardado && (
        <ReceiptViewer
          comprobante={guardado}
          paquete={mostrada.package_name}
          operacion={mostrada.manual_reference}
          open={viendo}
          onOpenChange={setViendo}
        />
      )}
    </Dialog>
  )
}
