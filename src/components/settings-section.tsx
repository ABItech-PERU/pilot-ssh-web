import { PencilIcon } from 'lucide-react'
import { useId } from 'react'

import { InfoHint } from '@/components/info-hint'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

/** Bloque de ajustes: titulo y filas en un mismo marco. Lo comparten la
 *  cuenta y la organizacion. */
export function SettingsSection({
  titulo,
  descripcion,
  ayuda,
  accion,
  children,
}: {
  titulo: string
  /** Por qué existe el bloque, cuando el título no basta. */
  descripcion?: string
  /** El detalle que solo hace falta la primera vez: tras el icono, para
   *  que el bloque no arranque con un párrafo. */
  ayuda?: string
  /** Lo que actúa sobre el bloque entero, no sobre una fila. */
  accion?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            {titulo}
            {ayuda && (
              <InfoHint etiqueta={`Sobre ${titulo.toLowerCase()}`}>{ayuda}</InfoHint>
            )}
          </h2>
          {descripcion && (
            <p className="text-muted-foreground max-w-prose text-xs">{descripcion}</p>
          )}
        </div>
        {accion}
      </div>
      <div className="divide-y rounded-lg border">{children}</div>
    </section>
  )
}

interface FilaProps {
  icono?: React.ElementType
  etiqueta: string
  /** Por qué existe el dato, en una línea. */
  pista?: string
  /** Por qué no se puede tocar. Ocupa el sitio del botón cuando no lo hay. */
  razon?: string
  accion?: string
  onEditar?: () => void
  /** Lo que va junto al botón de cambiar: borrar, duplicar… */
  acciones?: React.ReactNode
  children: React.ReactNode
}

/** Etiqueta, valor y boton para cambiarlo. Sin permiso, en lugar del boton
 *  va la razon. */
export function SettingsRow({
  icono: Icono,
  etiqueta,
  pista,
  razon,
  accion = 'Cambiar',
  onEditar,
  acciones,
  children,
}: FilaProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <span className="flex min-w-0 items-center gap-3">
        {Icono && <Icono className="text-muted-foreground size-4 shrink-0" />}
        <span className="min-w-0">
          <span className="block text-sm font-medium">{etiqueta}</span>
          {pista && <span className="text-muted-foreground block text-xs">{pista}</span>}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-3 text-sm">
        <span className="text-muted-foreground truncate">{children}</span>
        {!onEditar && razon && (
          <span className="text-muted-foreground text-xs">{razon}</span>
        )}
        {onEditar && (
          <Button
            variant="outline"
            size="sm"
            aria-label={`${accion} ${etiqueta.toLowerCase()}`}
            onClick={onEditar}
          >
            {/* En movil, el lapiz: la palabra taparia el dato de al lado */}
            {accion === 'Cambiar' ? (
              <>
                <PencilIcon className="sm:hidden" />
                <span className="hidden sm:inline">{accion}</span>
              </>
            ) : (
              accion
            )}
          </Button>
        )}
        {acciones}
      </span>
    </div>
  )
}

/** Ajuste de sí o no. El texto junto al interruptor lo confirma para quien
 *  no distingue el color. */
export function SettingsSwitchRow({
  icono: Icono,
  etiqueta,
  pista,
  activado,
  onCambiar,
}: {
  icono?: React.ElementType
  etiqueta: string
  /** Por qué existe el ajuste, en una línea. */
  pista?: string
  activado: boolean
  onCambiar: (activado: boolean) => void
}) {
  const id = useId()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <span className="flex min-w-0 items-center gap-3">
        {Icono && <Icono className="text-muted-foreground size-4 shrink-0" />}
        <span className="min-w-0">
          <label htmlFor={id} className="block cursor-pointer text-sm font-medium">
            {etiqueta}
          </label>
          {pista && <span className="text-muted-foreground block text-xs">{pista}</span>}
        </span>
      </span>
      <span className="flex items-center gap-3 text-sm">
        <span
          className={activado ? 'text-foreground font-medium' : 'text-muted-foreground'}
        >
          {activado ? 'Activado' : 'Desactivado'}
        </span>
        <Switch id={id} checked={activado} onCheckedChange={onCambiar} />
      </span>
    </div>
  )
}
