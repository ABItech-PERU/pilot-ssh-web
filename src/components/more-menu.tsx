import { MoreBadge } from '@/components/more-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Lo que no cabe en una fila, tras un «+N». Se abre con clic, no al pasar
 *  el cursor: así no tapa la fila vecina al recorrer la lista. */
export function MoreMenu({
  total,
  descripcion,
  children,
}: {
  total: number
  descripcion: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MoreBadge total={total} aria-label={descripcion} />
      </DropdownMenuTrigger>
      {/* A un lado, que encima taparia lo que ya se lee */}
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={6}
        className="flex w-auto max-w-64 flex-col items-start gap-1 p-2"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
