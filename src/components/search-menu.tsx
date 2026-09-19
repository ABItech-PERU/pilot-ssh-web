import { useEffect, useRef, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { buildInitials } from '@/lib/format'

export interface OpcionDeMenu {
  clave: string
  nombre: string
  /** Segunda línea: lo que distingue una fila de otra parecida. */
  detalle?: string
  /** Con avatar las personas; con icono lo demás. */
  avatar?: string | null
  icono?: React.ElementType
  /** Encabeza su bloque cuando la lista mezcla cosas distintas. */
  seccion?: string
  /** Se ve pero no se elige; `detalle` dice por qué. */
  desactivada?: boolean
}

/** Lista con buscador dentro de un menú. El foco va al campo al montarse,
 *  que es al abrir el menú; Radix lo llevaría a la primera fila. */
export function SearchMenu({
  opciones,
  etiqueta,
  placeholder,
  vacio,
  mantenerAbierto = false,
  pie,
  onElegir,
}: {
  opciones: OpcionDeMenu[]
  /** Para quien no ve el campo: «Buscar en el equipo». */
  etiqueta: string
  placeholder: string
  /** Texto sin opciones, distinto del de no encontrar ninguna. */
  vacio: string
  /** Se añade a varios seguidos; un valor se elige una sola vez. */
  mantenerAbierto?: boolean
  /** Lo que va al final, separado: la salida cuando no está en la lista. */
  pie?: React.ReactNode
  onElegir: (clave: string) => void
}) {
  const [buscado, setBuscado] = useState('')
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => campo.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  const texto = buscado.trim().toLowerCase()
  const encontradas = texto
    ? opciones.filter((opcion) =>
        `${opcion.nombre} ${opcion.detalle ?? ''}`.toLowerCase().includes(texto),
      )
    : opciones

  return (
    <>
      <div className="p-2">
        <Input
          ref={campo}
          autoComplete="off"
          className="h-9!"
          placeholder={placeholder}
          aria-label={etiqueta}
          value={buscado}
          onChange={(evento) => setBuscado(evento.target.value)}
          // Radix mueve el foco con cada tecla: se corta para poder escribir
          onKeyDown={(evento) => evento.stopPropagation()}
        />
      </div>

      <div className="max-h-64 overflow-y-auto p-1 pt-0">
        {encontradas.map((opcion, indice) => (
          <Fila
            key={opcion.clave}
            opcion={opcion}
            // La seccion encabeza su bloque: la lista llega ya agrupada
            conSeccion={opcion.seccion !== encontradas[indice - 1]?.seccion}
            mantenerAbierto={mantenerAbierto}
            onElegir={onElegir}
          />
        ))}

        {encontradas.length === 0 && (
          <p className="text-muted-foreground px-2 py-3 text-center text-xs">
            {opciones.length === 0 ? vacio : 'Nada con ese nombre.'}
          </p>
        )}
      </div>

      {pie}
    </>
  )
}

function Fila({
  opcion,
  conSeccion,
  mantenerAbierto,
  onElegir,
}: {
  opcion: OpcionDeMenu
  conSeccion: boolean
  mantenerAbierto: boolean
  onElegir: (clave: string) => void
}) {
  const Icono = opcion.icono

  return (
    <>
      {conSeccion && opcion.seccion && (
        <DropdownMenuLabel className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-semibold tracking-wide uppercase">
          {opcion.seccion}
        </DropdownMenuLabel>
      )}
      <DropdownMenuItem
        disabled={opcion.desactivada}
        onSelect={(evento) => {
          if (mantenerAbierto) evento.preventDefault()
          onElegir(opcion.clave)
        }}
      >
        {Icono ? (
          <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
            <Icono className="size-3.5" />
          </span>
        ) : (
          <Avatar className="size-6 shrink-0">
            {opcion.avatar && <AvatarImage src={opcion.avatar} alt="" />}
            <AvatarFallback className="text-[10px] font-semibold">
              {buildInitials(opcion.nombre)}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="min-w-0">
          <span className="block truncate">{opcion.nombre}</span>
          {opcion.detalle && (
            <span className="text-muted-foreground block truncate text-xs">
              {opcion.detalle}
            </span>
          )}
        </span>
      </DropdownMenuItem>
    </>
  )
}
