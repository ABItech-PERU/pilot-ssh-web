import { cn } from 'cn'

import { ChoiceCard } from '@/components/choice-card'
import { FieldError } from '@/components/field-error'
import { FileField } from '@/components/file-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type Comprobante, tipoDeComprobante } from '@/features/credits/comprobantes'
import { useComprobante } from '@/features/credits/use-comprobante'
import { METODOS_POR_FUERA, nombreDelMetodo } from '@/features/credits/metodos'
import type { PaymentMethod } from '@/types/api'

export interface ErroresDelCobro {
  method?: string
  reference?: string
  receipt?: string
}

interface Props {
  /** Distingue los campos cuando hay más de un diálogo montado. */
  prefijo: string
  metodo: PaymentMethod | ''
  onMetodo: (metodo: PaymentMethod) => void
  referencia: string
  onReferencia: (referencia: string) => void
  archivo: File | null
  onArchivo: (archivo: File | null) => void
  errores: ErroresDelCobro
  /** `dos-columnas`: el diálogo cabe en un portátil sin desplazarse. */
  reparto?: 'apilado' | 'dos-columnas'
  /** El guardado, si lo hay: se ve y se reemplaza. */
  comprobante?: { archivo: Comprobante; onVer: () => void } | null
}

/** Medio, operación y comprobante de un cobro por fuera. Común a
 *  acreditar, registrar un cobro y completar sus datos. */
export function CamposDelCobro({
  prefijo,
  metodo,
  onMetodo,
  referencia,
  onReferencia,
  archivo,
  onArchivo,
  errores,
  reparto = 'apilado',
  comprobante,
}: Props) {
  const enDos = reparto === 'dos-columnas'
  // Miniatura solo de imágenes: un PDF no se pinta en su lugar
  const guardado = comprobante?.archivo ?? null
  const miniatura = useComprobante(
    guardado,
    guardado !== null && tipoDeComprobante(guardado.formato) === 'imagen',
  )

  return (
    <div className={cn('grid gap-5', enDos && 'sm:grid-cols-2')}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Con qué se cobró</legend>
        <div
          className={cn(
            'grid gap-2',
            enDos ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3',
          )}
          role="radiogroup"
        >
          {METODOS_POR_FUERA.map((valor) => (
            <ChoiceCard
              key={valor}
              tipo="radio"
              elegida={metodo === valor}
              titulo={nombreDelMetodo(valor)}
              onClick={() => onMetodo(valor)}
            />
          ))}
        </div>
        <FieldError message={errores.method} />
      </fieldset>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={`${prefijo}-operacion`}>Número de operación (opcional)</Label>
          <Input
            id={`${prefijo}-operacion`}
            autoComplete="off"
            maxLength={100}
            placeholder="El de la transferencia o el depósito"
            value={referencia}
            aria-invalid={Boolean(errores.reference)}
            onChange={(evento) => onReferencia(evento.target.value)}
          />
          {errores.reference ? (
            <FieldError message={errores.reference} />
          ) : (
            <p className="text-muted-foreground text-xs">
              Si no lo tiene ahora, se completa después.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${prefijo}-comprobante`}>Comprobante (opcional)</Label>
          <FileField
            id={`${prefijo}-comprobante`}
            valor={archivo}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            ayuda="Imagen o PDF, hasta 5 MB"
            guardado={
              comprobante && {
                nombre: 'Comprobante guardado',
                detalle: comprobante.archivo.formato.toUpperCase(),
                vista: miniatura.url,
                onVer: comprobante.onVer,
              }
            }
            invalido={Boolean(errores.receipt)}
            onChange={onArchivo}
          />
          <FieldError message={errores.receipt} />
        </div>
      </div>
    </div>
  )
}
