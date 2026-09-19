import { useQuery } from '@tanstack/react-query'
import { PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

import { FormDialogContent } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as accessApi from '@/features/access/api'
import { NIVELES, NIVELES_EN_ORDEN } from '@/features/access/levels'
import { OpcionConIcono } from '@/features/access/OpcionConIcono'
import { ICONO_DEL_ALCANCE } from '@/features/access/scope'
import * as serversApi from '@/features/servers/api'
import type { AccessLevel } from '@/types/api'

export interface AccesoDirecto {
  servidor: string
  servidorNombre: string
  /** `null`: la máquina entera. */
  credencial: string | null
  credencialNombre: string | null
  nivel: AccessLevel
}

const TODO_EL_SERVIDOR = 'servidor'

/** Concede al recién invitado y devuelve los fallidos: la invitación ya
 *  salió y no se anula por uno. Va por correo: el backend lo asocia a la
 *  invitación viva hasta que acepte. */
export async function concederAccesosDirectos(
  organizacion: string,
  correo: string,
  accesos: AccesoDirecto[],
  todaLaOrganizacion: AccessLevel | null,
): Promise<string[]> {
  const fallidos: string[] = []

  if (todaLaOrganizacion) {
    try {
      await accessApi.grant({
        organization: organizacion,
        email: correo,
        level: todaLaOrganizacion,
      })
    } catch {
      fallidos.push('toda la organización')
    }
  }

  for (const acceso of accesos) {
    try {
      await accessApi.grant({
        organization: organizacion,
        email: correo,
        server: acceso.credencial ? undefined : acceso.servidor,
        server_user: acceso.credencial ?? undefined,
        level: acceso.nivel,
      })
    } catch {
      fallidos.push(describirAcceso(acceso))
    }
  }

  return fallidos
}

function describirAcceso(acceso: AccesoDirecto) {
  return acceso.credencialNombre
    ? `${acceso.credencialNombre} @ ${acceso.servidorNombre}`
    : acceso.servidorNombre
}

/** Accesos concretos al invitar, además de sus grupos. Cada uno se añade
 *  en su propio diálogo para no alargar la invitación. */
export function DirectGrantsField({
  organizacion,
  valor,
  onChange,
  cobertura,
}: {
  organizacion: string
  valor: AccesoDirecto[]
  onChange: (accesos: AccesoDirecto[]) => void
  /** Lo elegido que ya da toda la organización: lo concreto de igual o
   *  menor nivel no suma y se avisa. */
  cobertura: { nombre: string; nivel: AccessLevel } | null
}) {
  const [anadiendo, setAnadiendo] = useState(false)

  // Mismo servidor o credencial: una sola concesión, gana la última
  const anadir = (nuevo: AccesoDirecto) =>
    onChange([
      ...valor.filter(
        (acceso) =>
          acceso.servidor !== nuevo.servidor || acceso.credencial !== nuevo.credencial,
      ),
      nuevo,
    ])

  const cubierto = (acceso: AccesoDirecto) =>
    cobertura !== null &&
    NIVELES_EN_ORDEN.indexOf(acceso.nivel) <= NIVELES_EN_ORDEN.indexOf(cobertura.nivel)

  return (
    <div className="space-y-2">
      {valor.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {valor.map((acceso) => {
            const Icono = ICONO_DEL_ALCANCE[acceso.credencial ? 'credential' : 'server']
            return (
              <li
                key={`${acceso.servidor}:${acceso.credencial ?? ''}`}
                className="flex items-center gap-3 px-3 py-2"
              >
                <Icono className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {describirAcceso(acceso)}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {NIVELES[acceso.nivel].etiqueta}
                    {cubierto(acceso) && ` · Ya lo cubre ${cobertura?.nombre}`}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Quitar ${describirAcceso(acceso)}`}
                  onClick={() => onChange(valor.filter((otro) => otro !== acceso))}
                >
                  <XIcon />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <Button variant="outline" size="sm" onClick={() => setAnadiendo(true)}>
        <PlusIcon />
        Añadir servidor o credencial
      </Button>

      <Dialog open={anadiendo} onOpenChange={setAnadiendo}>
        <FormDialogContent className="sm:max-w-md">
          {/* Dentro del contenido: se desmonta al cerrar y reabre en blanco */}
          <FormularioDeAcceso
            organizacion={organizacion}
            onAnadir={(acceso) => {
              anadir(acceso)
              setAnadiendo(false)
            }}
            onCancelar={() => setAnadiendo(false)}
          />
        </FormDialogContent>
      </Dialog>
    </div>
  )
}

function FormularioDeAcceso({
  organizacion,
  onAnadir,
  onCancelar,
}: {
  organizacion: string
  onAnadir: (acceso: AccesoDirecto) => void
  onCancelar: () => void
}) {
  const [servidor, setServidor] = useState('')
  const [sobre, setSobre] = useState(TODO_EL_SERVIDOR)
  const [nivel, setNivel] = useState<AccessLevel>('connect')

  const servidores = useQuery({
    queryKey: serversApi.clavesServidor.todos({
      organization: organizacion,
      page_size: 100,
    }),
    queryFn: () =>
      serversApi.fetchServers({ organization: organizacion, page_size: 100 }),
  })

  const elegido = (servidores.data?.results ?? []).find((fila) => fila.id === servidor)

  const anadir = () => {
    if (!elegido) return
    const credencial = elegido.users.find((fila) => fila.id === sobre) ?? null

    onAnadir({
      servidor: elegido.id,
      servidorNombre: elegido.name,
      credencial: credencial?.id ?? null,
      credencialNombre: credencial?.username ?? null,
      nivel,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Añadir servidor o credencial</DialogTitle>
        <DialogDescription>Lo tendrá en cuanto acepte la invitación.</DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="servidor-directo">Servidor</Label>
        <Select
          value={servidor}
          onValueChange={(valor) => {
            setServidor(valor)
            setSobre(TODO_EL_SERVIDOR)
          }}
        >
          <SelectTrigger id="servidor-directo" className="w-full">
            <SelectValue placeholder="Elija un servidor" />
          </SelectTrigger>
          <SelectContent>
            {(servidores.data?.results ?? []).map((fila) => (
              <OpcionConIcono
                key={fila.id}
                valor={fila.id}
                icono={ICONO_DEL_ALCANCE.server}
              >
                {fila.name}
              </OpcionConIcono>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sobre-directo">Sobre</Label>
          <Select value={sobre} onValueChange={setSobre} disabled={!elegido}>
            <SelectTrigger id="sobre-directo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <OpcionConIcono valor={TODO_EL_SERVIDOR} icono={ICONO_DEL_ALCANCE.server}>
                Todo el servidor
              </OpcionConIcono>
              {(elegido?.users ?? []).map((credencial) => (
                <OpcionConIcono
                  key={credencial.id}
                  valor={credencial.id}
                  icono={ICONO_DEL_ALCANCE.credential}
                >
                  Solo {credencial.username}
                </OpcionConIcono>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nivel-directo">Nivel</Label>
          <Select value={nivel} onValueChange={(valor) => setNivel(valor as AccessLevel)}>
            <SelectTrigger id="nivel-directo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NIVELES_EN_ORDEN.map((clave) => (
                <OpcionConIcono key={clave} valor={clave} icono={NIVELES[clave].icono}>
                  {NIVELES[clave].etiqueta}
                </OpcionConIcono>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button disabled={!elegido} onClick={anadir}>
          <PlusIcon />
          Añadir
        </Button>
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </DialogFooter>
    </>
  )
}
