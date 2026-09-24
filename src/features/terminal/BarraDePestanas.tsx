import { cn } from 'cn'
import {
  ChevronDownIcon,
  CircleQuestionMarkIcon,
  FolderIcon,
  PlusIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import { AtajosDeTerminal } from '@/features/terminal/AtajosDeTerminal'
import {
  fetchOrdinales,
  MAXIMO_DE_PESTANAS,
  type Pestana,
} from '@/features/terminal/pestanas'
import type { EstadoTerminal } from '@/features/terminal/socket'
import type { ServerUser } from '@/types/api'

interface BarraProps {
  pestanas: Pestana[]
  activa: string
  estados: Record<string, EstadoTerminal>
  credenciales: ServerUser[]
  onActivar: (pestana: Pestana) => void
  onCerrar: (pestana: Pestana) => void
  onAbrir: (credentialId: string) => void
  onSubir: (archivos: File[]) => void
  onElegirCarpeta: () => void
}

export function BarraDePestanas({
  pestanas,
  activa,
  estados,
  credenciales,
  onActivar,
  onCerrar,
  onAbrir,
  onSubir,
  onElegirCarpeta,
}: BarraProps) {
  const archivo = useRef<HTMLInputElement | null>(null)
  const [viendoAtajos, setViendoAtajos] = useState(false)
  const ordinales = fetchOrdinales(pestanas)
  const hayCupo = pestanas.length < MAXIMO_DE_PESTANAS

  return (
    <div
      role="tablist"
      aria-label="Terminales abiertas"
      className="border-term-border flex h-9 shrink-0 items-stretch gap-px overflow-x-auto border-b px-1"
    >
      {pestanas.map((pestana, posicion) => {
        const credencial = credenciales.find((una) => una.id === pestana.credentialId)
        const ordinal = ordinales[pestana.id]
        const delante = pestana.id === activa
        const nombre = `${credencial?.username ?? 'sin credencial'}${ordinal ? ` ${ordinal}` : ''}`

        return (
          <div
            key={pestana.id}
            className={cn(
              'flex min-w-0 items-center gap-1.5 rounded-t-md px-2 text-xs',
              delante ? 'bg-white/8 text-term-text' : 'text-term-dim hover:bg-white/5',
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={delante}
              onClick={() => onActivar(pestana)}
              className="flex min-w-0 items-center gap-1.5 py-1"
            >
              <Punto estado={estados[pestana.id]} />
              <span className="font-machine truncate">{nombre}</span>
              <span className="sr-only">Alt+{posicion + 1}</span>
            </button>

            <button
              type="button"
              aria-label={`Cerrar ${nombre}`}
              onClick={() => onCerrar(pestana)}
              className="hover:text-term-text text-term-dim rounded-sm p-0.5"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        )
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!hayCupo}
            aria-label="Abrir otra terminal"
            title={hayCupo ? undefined : `Hasta ${MAXIMO_DE_PESTANAS} a la vez`}
            className="text-term-dim hover:text-term-text my-auto size-6 hover:bg-white/5"
          >
            <PlusIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {credenciales.map((credencial) => {
            const { icono: Icono } = FORMAS_DE_ENTRAR[credencial.auth_type]
            return (
              <DropdownMenuItem
                key={credencial.id}
                onSelect={() => onAbrir(credencial.id)}
              >
                <Icono />
                <span className="font-machine">{credencial.username}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={archivo}
        type="file"
        multiple
        className="hidden"
        onChange={(evento) => {
          const elegidos = [...(evento.target.files ?? [])]
          if (elegidos.length) onSubir(elegidos)
          // Repetir el mismo archivo tambien cuenta como cambio
          evento.target.value = ''
        }}
      />

      <div className="my-auto ml-auto flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Ver los atajos"
          onClick={() => setViendoAtajos(true)}
          className="text-term-dim hover:text-term-text mr-1 size-6 hover:bg-white/5"
        >
          <CircleQuestionMarkIcon className="size-4" />
        </Button>
        <AtajosDeTerminal
          abierto={viendoAtajos}
          onCerrar={() => setViendoAtajos(false)}
        />

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Subir un archivo"
          title="Subir un archivo a la carpeta en la que está la terminal"
          onClick={() => archivo.current?.click()}
          className="text-term-dim hover:text-term-text size-6 hover:bg-white/5"
        >
          <UploadIcon className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Más opciones para subir"
              className="text-term-dim hover:text-term-text size-5 hover:bg-white/5"
            >
              <ChevronDownIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => archivo.current?.click()}>
              <UploadIcon />
              Subir aquí
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onElegirCarpeta}>
              <FolderIcon />
              Subir a otra carpeta…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function Punto({ estado }: { estado?: EstadoTerminal }) {
  return (
    <span
      className={cn(
        'size-1.5 shrink-0 rounded-full',
        estado?.fase === 'conectada' && 'bg-term-ok',
        estado?.fase === 'cerrada' && 'bg-term-root',
        (!estado || estado.fase === 'conectando') && 'bg-term-arg animate-pulse',
      )}
      aria-hidden
    />
  )
}
