import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { z } from 'zod'

import { InfoHint } from '@/components/info-hint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/field-error'
import { TIPOS, TIPOS_DE_ENLACE } from '@/features/servers/links'
import { normalizeSpacing } from '@/lib/form'
import type { LinkKind } from '@/types/api'

/** Compartido por el alta en bloque y el dialogo de uno en uno. */
export const esquemaEnlace = z.object({
  kind: z.enum(TIPOS),
  label: z
    .string()
    .transform(normalizeSpacing)
    .pipe(z.string().min(1, 'Indique un nombre.')),
  url: z
    .string()
    .trim()
    .min(1, 'Indique la dirección.')
    .refine(
      (valor) => /^https?:\/\/\S+$/i.test(valor),
      'Debe empezar por https:// o http://.',
    ),
})

export type EnlaceFormulario = z.input<typeof esquemaEnlace>

export interface ConEnlaces {
  links: EnlaceFormulario[]
}

interface Props {
  etiqueta?: string
  /** Tras el icono junto a la etiqueta. */
  ayuda?: string
  /** Servidor: panel; credencial: web. */
  primerTipo: LinkKind
}

/** Varios enlaces de golpe, para el alta. Lee el formulario del contexto. */
export function LinksField({ etiqueta, ayuda, primerTipo }: Props) {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ConEnlaces>()
  const enlaces = useFieldArray({ control, name: 'links' })

  const anadir = () => {
    const tipo = enlaces.fields.length === 0 ? primerTipo : 'other'
    enlaces.append({ kind: tipo, label: TIPOS_DE_ENLACE[tipo].etiqueta, url: '' })
  }

  // Cambiar el tipo renombra solo si el nombre era el del tipo anterior:
  // un nombre escrito a mano no se pisa
  const cambiarTipo = (indice: number, tipo: LinkKind) => {
    const anterior = watch(`links.${indice}.kind`)
    const nombre = watch(`links.${indice}.label`)
    if (!nombre || nombre === TIPOS_DE_ENLACE[anterior].etiqueta) {
      setValue(`links.${indice}.label`, TIPOS_DE_ENLACE[tipo].etiqueta)
    }
    setValue(`links.${indice}.kind`, tipo)
  }

  return (
    <fieldset className="space-y-3">
      {etiqueta && (
        <legend className="flex items-center gap-1.5 text-sm font-medium">
          {etiqueta}
          {ayuda && <InfoHint etiqueta={`Qué va en ${etiqueta}`}>{ayuda}</InfoHint>}
        </legend>
      )}

      {enlaces.fields.map((campo, indice) => {
        const tipoActual = watch(`links.${indice}.kind`)
        const errorFila = errors.links?.[indice]

        return (
          <div key={campo.id} className="space-y-1.5">
            {/* La direccion va sola en su linea: es lo mas largo */}
            <div className="grid grid-cols-[8.5rem_1fr_auto] gap-2">
              <Select
                value={tipoActual}
                onValueChange={(valor) => cambiarTipo(indice, valor as LinkKind)}
              >
                <SelectTrigger
                  className="h-10! w-full gap-2"
                  aria-label={`Tipo del enlace ${indice + 1}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((tipo) => {
                    const { etiqueta: nombre, icono: Icono } = TIPOS_DE_ENLACE[tipo]
                    return (
                      <SelectItem key={tipo} value={tipo}>
                        <span className="flex items-center gap-2">
                          <Icono className="text-muted-foreground size-4" />
                          {nombre}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <Input
                className="h-10!"
                autoComplete="off"
                aria-label={`Nombre del enlace ${indice + 1}`}
                aria-invalid={Boolean(errorFila?.label)}
                {...register(`links.${indice}.label`)}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-10"
                aria-label={`Quitar enlace ${indice + 1}`}
                onClick={() => enlaces.remove(indice)}
              >
                <Trash2Icon className="size-4" />
              </Button>

              <Input
                className="font-machine h-10! col-span-3"
                placeholder="https://"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="url"
                aria-label={`Dirección del enlace ${indice + 1}`}
                aria-invalid={Boolean(errorFila?.url)}
                {...register(`links.${indice}.url`)}
              />
            </div>
            <FieldError message={errorFila?.label?.message ?? errorFila?.url?.message} />
          </div>
        )
      })}

      <Button type="button" variant="outline" size="sm" onClick={anadir}>
        <PlusIcon />
        {enlaces.fields.length === 0 ? 'Añadir enlace' : 'Otro enlace'}
      </Button>
    </fieldset>
  )
}
