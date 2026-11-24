import { cn } from 'cn'
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  FolderOpenIcon,
  Loader2Icon,
  RotateCwIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  describirRestante,
  estimarRestante,
  resumirTransferencias,
  type Transferencia,
} from '@/features/terminal/transferencias'
import { formatFileSize } from '@/lib/format'

interface Props {
  transferencias: Transferencia[]
  onCancelar: (id: number) => void
  onCancelarTodo: () => void
  onReintentar: (id: number) => void
  onIrALaCarpeta: (ruta: string) => void
  onCerrar: () => void
}

const contar = (cuantos: number, uno: string, varios: string) =>
  `${cuantos} ${cuantos === 1 ? uno : varios}`

/** Las subidas en cola, como el panel de Google Drive. Se pliega para no
 *  tapar la terminal, y cada archivo se cancela o se reintenta solo. */
export function PanelDeTransferencias({
  transferencias,
  onCancelar,
  onCancelarTodo,
  onReintentar,
  onIrALaCarpeta,
  onCerrar,
}: Props) {
  const [plegado, setPlegado] = useState(false)
  const resumen = resumirTransferencias(transferencias)
  const enCurso = resumen.activas > 0
  const empezadas = transferencias.filter((una) => una.estado !== 'en-cola').length

  const unico = resumen.total === 1

  const titulo = enCurso
    ? unico
      ? 'Subiendo 1 archivo'
      : `Subiendo ${empezadas} de ${resumen.total}`
    : describirFinal(transferencias)
  // Con un solo archivo, su fila ya lo dice, salvo con la lista plegada
  const detalle =
    enCurso && (!unico || plegado)
      ? [
          `${resumen.porcentaje} %`,
          resumen.velocidad ? `${formatFileSize(resumen.velocidad)}/s` : null,
          resumen.restante !== null ? describirRestante(resumen.restante) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  return (
    <section
      aria-label="Subidas"
      className="border-term-border bg-term-bg text-term-text w-full overflow-hidden rounded-md border shadow-lg sm:w-80"
    >
      <header className="flex items-center gap-2 px-3 py-2">
        <span className="text-term-dim shrink-0" aria-hidden>
          {enCurso ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <UploadIcon className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="truncate text-sm font-medium">{titulo}</p>
          {detalle && (
            <p className="text-term-dim truncate text-xs tabular-nums">{detalle}</p>
          )}
        </div>
        <BotonDeTransferencia
          etiqueta={plegado ? 'Mostrar la lista' : 'Ocultar la lista'}
          aria-expanded={!plegado}
          onClick={() => setPlegado(!plegado)}
        >
          {plegado ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </BotonDeTransferencia>
        {enCurso ? (
          <BotonDeTransferencia etiqueta="Cancelar todas" onClick={onCancelarTodo}>
            <XIcon />
          </BotonDeTransferencia>
        ) : (
          <BotonDeTransferencia etiqueta="Cerrar las subidas" onClick={onCerrar}>
            <XIcon />
          </BotonDeTransferencia>
        )}
      </header>

      {!plegado && (
        <ul className="border-term-border divide-term-border max-h-64 divide-y overflow-y-auto border-t">
          {transferencias.map((una) => (
            <FilaDeTransferencia
              key={una.id}
              transferencia={una}
              onCancelar={() => onCancelar(una.id)}
              onReintentar={() => onReintentar(una.id)}
              onIrALaCarpeta={() => una.ruta && onIrALaCarpeta(una.ruta)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function describirFinal(lista: Transferencia[]): string {
  const cuantos = (estado: Transferencia['estado']) =>
    lista.filter((una) => una.estado === estado).length
  return [
    cuantos('lista') ? contar(cuantos('lista'), 'subido', 'subidos') : null,
    cuantos('omitida') ? contar(cuantos('omitida'), 'omitido', 'omitidos') : null,
    cuantos('cancelada') ? contar(cuantos('cancelada'), 'cancelado', 'cancelados') : null,
    cuantos('error') ? `${cuantos('error')} con error` : null,
  ]
    .filter(Boolean)
    .join(', ')
}

function FilaDeTransferencia({
  transferencia,
  onCancelar,
  onReintentar,
  onIrALaCarpeta,
}: {
  transferencia: Transferencia
  onCancelar: () => void
  onReintentar: () => void
  onIrALaCarpeta: () => void
}) {
  const { nombre, estado, enviado, total, velocidad, motivo } = transferencia
  const porcentaje = total ? Math.min(100, Math.round((enviado / total) * 100)) : 100
  const restante = estimarRestante(total, enviado, velocidad)

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <IconoDeEstado estado={estado} />
      <div className="min-w-0 flex-1">
        <p className="font-machine truncate text-xs" title={nombre}>
          {nombre}
        </p>
        {estado === 'subiendo' ? (
          <>
            <div
              role="progressbar"
              aria-label={nombre}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={porcentaje}
              className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="bg-term-ok h-1 rounded-full transition-[width]"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <p className="text-term-dim mt-0.5 truncate text-xs tabular-nums">
              {[
                `${porcentaje} %`,
                velocidad ? `${formatFileSize(velocidad)}/s` : null,
                restante !== null ? describirRestante(restante) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </>
        ) : (
          <p
            className={cn(
              'truncate text-xs',
              estado === 'error' ? 'text-term-root' : 'text-term-dim',
            )}
            title={estado === 'error' ? motivo : undefined}
          >
            {describirEstado(transferencia)}
          </p>
        )}
      </div>
      {(estado === 'en-cola' || estado === 'subiendo') && (
        <BotonDeTransferencia etiqueta={`Cancelar ${nombre}`} onClick={onCancelar}>
          <XIcon />
        </BotonDeTransferencia>
      )}
      {estado === 'error' && (
        <BotonDeTransferencia etiqueta={`Reintentar ${nombre}`} onClick={onReintentar}>
          <RotateCwIcon />
        </BotonDeTransferencia>
      )}
      {estado === 'lista' && (
        <BotonDeTransferencia
          etiqueta={`Ir a la carpeta de ${nombre}`}
          onClick={onIrALaCarpeta}
        >
          <FolderOpenIcon />
        </BotonDeTransferencia>
      )}
    </li>
  )
}

function describirEstado({
  estado,
  total,
  enviado,
  motivo,
  ruta,
  archivo,
  retomar,
}: Transferencia): string {
  if (estado === 'en-cola' && retomar) {
    return `Esperando la conexión · ${Math.round((enviado / (total || 1)) * 100)} %`
  }
  if (estado === 'en-cola') return `En cola · ${formatFileSize(total)}`
  if (estado === 'lista') {
    // «Conservar ambos» lo guarda con otro nombre, y se avisa cuál
    const guardado = ruta?.slice(ruta.lastIndexOf('/') + 1)
    if (guardado && guardado !== archivo.name) return `Subido como ${guardado}`
    return `Subido · ${formatFileSize(total)}`
  }
  if (estado === 'cancelada') return 'Cancelado'
  if (estado === 'omitida') return 'Omitido, ya existía'
  return motivo ?? 'No se pudo subir.'
}

function IconoDeEstado({ estado }: { estado: Transferencia['estado'] }) {
  const clase = 'size-4 shrink-0'
  if (estado === 'lista')
    return <CheckIcon className={cn(clase, 'text-term-ok')} aria-hidden />
  if (estado === 'error') {
    return <CircleAlertIcon className={cn(clase, 'text-term-root')} aria-hidden />
  }
  if (estado === 'subiendo') {
    return <Loader2Icon className={cn(clase, 'text-term-dim animate-spin')} aria-hidden />
  }
  return <UploadIcon className={cn(clase, 'text-term-dim')} aria-hidden />
}

function BotonDeTransferencia({
  etiqueta,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { etiqueta: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(
        'text-term-dim hover:text-term-text size-7 shrink-0 hover:bg-white/10 [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}
