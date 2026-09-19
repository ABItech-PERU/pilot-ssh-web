import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { AlertCircleIcon, ArrowRightIcon, CheckIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { BrandLockup } from '@/components/brand'
import { Container } from '@/components/container'
import { FieldError } from '@/components/field-error'
import { ThemeToggle } from '@/components/theme-toggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailCodeField } from '@/features/account/EmailCodeField'
import {
  useConfirmarCorreo,
  useRegaloAlConfirmar,
} from '@/features/account/use-confirmar-correo'
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO, useSession } from '@/features/auth/session'
import * as organizationsApi from '@/features/organizations/api'
import { isOwnSpace } from '@/features/organizations/current'
import {
  aplicarPlantilla,
  ETIQUETAS_POR_DEFECTO,
  LabelTemplateField,
} from '@/features/organizations/LabelTemplateField'
import {
  applyFieldErrors,
  looksAllLowercase,
  normalizeSpacing,
  suggestNameCasing,
} from '@/lib/form'

const esquema = z.object({
  full_name: z
    .string()
    .transform(normalizeSpacing)
    .pipe(z.string().min(2, 'Indique el nombre.')),
  organization_name: z
    .string()
    .transform(normalizeSpacing)
    .pipe(z.string().min(2, 'Indique cómo se llama su espacio.')),
})

type Formulario = z.infer<typeof esquema>

type Paso = 'correo' | 'datos' | 'espacio'

/** Pasos con pantalla propia, en orden; «Cuenta creada» no tiene. */
const ORDEN: Paso[] = ['correo', 'datos', 'espacio']

const TITULOS: Record<Paso, string> = {
  correo: 'Confirme su correo',
  datos: 'Ya casi está',
  espacio: '¿Cómo llamamos a su espacio?',
}

const CAMPOS = ['full_name'] as const

/** Alta tras crear la cuenta: correo, nombre y espacio.
 *
 *  Nombre obligatorio: identifica a la persona en la auditoría.
 *  El espacio personal ya existe con un nombre de oficio; aquí se renombra.
 *  **Aquí no se crea ninguna organización**: las demás, desde el selector. */
export function OnboardingPage() {
  const { user, signOut } = useSession()
  const cliente = useQueryClient()
  const navegar = useNavigate()
  const regalo = useRegaloAlConfirmar()
  const correoConfirmado = Boolean(user?.has_verified_email)
  // El código se envía con el alta: se confirma con el correo reciente
  const inicial: Paso = correoConfirmado ? 'datos' : 'correo'
  const [paso, setPaso] = useState<Paso>(inicial)
  // Paso más lejano alcanzado: se vuelve atrás con un clic, nunca se adelanta
  const [alcanzado, setAlcanzado] = useState(ORDEN.indexOf(inicial))
  const [etiquetas, setEtiquetas] = useState<string[]>(ETIQUETAS_POR_DEFECTO)
  const [avisoGeneral, setAvisoGeneral] = useState<string | null>(null)
  const [nombreTocado, setNombreTocado] = useState(false)

  const personal = user?.organizations.find(isOwnSpace)

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      organization_name: '',
    },
  })

  const terminar = useMutation({
    mutationFn: async (valores: Formulario) => {
      await authApi.updateProfile({ full_name: valores.full_name })

      if (!personal) return []

      await organizationsApi.updateOrganization(personal.slug, {
        name: valores.organization_name,
      })
      return aplicarPlantilla(personal.slug, etiquetas)
    },
    onSuccess: async (fallidas) => {
      await authApi.completeOnboarding()
      // Perfil y organizaciones cambiaron: /me queda obsoleto
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })

      if (fallidas.length > 0) {
        toast.error(`Añada ${fallidas.join(' y ')} desde Equipo: no se pudo ahora.`)
      }
      // Sin forzar el espacio: quien llega por invitación queda en ese equipo
      navegar('/app/servers', { replace: true })
    },
    onError: (error) => setAvisoGeneral(applyFieldErrors(error, setError, CAMPOS)),
  })

  // Se propone al salir del campo y con todo en minúscula; al teclear,
  // parpadearía
  const nombre = watch('full_name')
  const propuesta = suggestNameCasing(nombre ?? '')
  const hayPropuesta =
    nombreTocado && looksAllLowercase(nombre ?? '') && propuesta !== nombre

  const ocupado = terminar.isPending

  const irA = (destino: Paso) => {
    setPaso(destino)
    setAlcanzado((actual) => Math.max(actual, ORDEN.indexOf(destino)))
  }

  /** Propone el espacio con el nombre tecleado. Sin nombre válido se queda
   *  en «Sus datos», donde se ve el error. */
  const irAlEspacio = async () => {
    if (!(await trigger('full_name'))) {
      irA('datos')
      return
    }

    // Con mayúsculas: nada de «Espacio de ana quispe»
    if (!watch('organization_name')) {
      setValue('organization_name', `Espacio de ${suggestNameCasing(watch('full_name'))}`)
    }
    irA('espacio')
  }

  /** Al espacio, con el nombre validado igual que con «Continuar». */
  const elegirPaso = (destino: Paso) => {
    if (destino === 'espacio') {
      void irAlEspacio()
      return
    }
    irA(destino)
  }

  const salir = async () => {
    await signOut()
    navegar('/login', { replace: true })
  }

  const progreso = buildPasos(paso, alcanzado, correoConfirmado)

  return (
    <div className="bg-background flex min-h-pantalla flex-col">
      {/* Única salida de quien entra por error: no hay otra navegación */}
      <header className="py-4">
        <Container className="flex items-center justify-between gap-4">
          <BrandLockup />

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={salir} disabled={ocupado}>
              Cerrar sesión
            </Button>
          </div>
        </Container>
      </header>

      <main className="flex flex-1 items-center py-8">
        <Container className="max-w-md lg:grid lg:max-w-3xl lg:grid-cols-[13rem_1fr] lg:gap-12">
          <div className="lg:hidden">
            <ProgresoHorizontal pasos={progreso} onElegir={elegirPaso} />
          </div>
          <div className="hidden lg:block lg:pt-1">
            <ProgresoVertical pasos={progreso} onElegir={elegirPaso} />
          </div>

          <div className="mt-6 lg:col-start-2 lg:mt-0">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {paso === 'correo' && correoConfirmado
                  ? 'Correo confirmado'
                  : TITULOS[paso]}
              </h1>
              <p className="text-muted-foreground text-sm text-pretty">
                {paso === 'correo' ? (
                  correoConfirmado ? (
                    <>
                      <span className="text-foreground font-medium">{user?.email}</span>{' '}
                      ya está confirmado, y sus créditos de regalo están en su espacio.
                    </>
                  ) : (
                    <>
                      Le enviamos un código a{' '}
                      <span className="text-foreground font-medium">{user?.email}</span>.
                      Al confirmarlo recibe {regalo}.
                    </>
                  )
                ) : paso === 'datos' ? (
                  <>
                    Su cuenta ya está activa
                    {user?.email ? (
                      <>
                        {' '}
                        como{' '}
                        <span className="text-foreground font-medium">{user.email}</span>
                      </>
                    ) : null}
                    . Falta su nombre, que es como le reconocerá su equipo.
                  </>
                ) : (
                  'Es donde va a registrar sus servidores. Puede cambiarlo cuando quiera.'
                )}
              </p>
            </div>

            {avisoGeneral && (
              <Alert variant="destructive" className="mt-6">
                <AlertCircleIcon />
                <AlertDescription>{avisoGeneral}</AlertDescription>
              </Alert>
            )}

            {paso === 'correo' ? (
              <PasoCorreo confirmado={correoConfirmado} onListo={() => irA('datos')} />
            ) : (
              <>
                <form
                  // Uno por paso: reusado, el nombre hereda el del espacio
                  key={paso}
                  id="alta-guiada"
                  // En «Sus datos», Enter es «Continuar», no terminar el alta
                  onSubmit={
                    paso === 'datos'
                      ? (evento) => {
                          evento.preventDefault()
                          void irAlEspacio()
                        }
                      : handleSubmit((valores) => terminar.mutate(valores))
                  }
                  className="border-border/70 bg-card mt-6 space-y-6 rounded-lg border p-5 sm:p-6"
                  noValidate
                >
                  {paso === 'datos' ? (
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre y apellidos</Label>
                      <Input
                        id="full_name"
                        autoComplete="off"
                        autoCapitalize="words"
                        spellCheck={false}
                        autoFocus
                        aria-invalid={Boolean(errors.full_name)}
                        aria-describedby="pista-nombre"
                        {...register('full_name', {
                          onBlur: () => setNombreTocado(true),
                          onChange: () => setNombreTocado(false),
                        })}
                      />
                      {errors.full_name?.message ? (
                        <FieldError message={errors.full_name.message} />
                      ) : hayPropuesta ? (
                        <p className="text-muted-foreground text-xs" role="status">
                          ¿Lo escribimos{' '}
                          <button
                            type="button"
                            className="text-foreground focus-visible:outline-ring font-medium underline underline-offset-2 focus-visible:-outline-offset-2 focus-visible:outline-1"
                            onClick={() => {
                              setValue('full_name', propuesta, { shouldValidate: true })
                              setNombreTocado(false)
                            }}
                          >
                            {propuesta}
                          </button>
                          ?
                        </p>
                      ) : (
                        <p id="pista-nombre" className="text-muted-foreground text-xs">
                          Aparece en el registro de sesiones y al compartir servidores.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="organization_name">Nombre del espacio</Label>
                        <Input
                          id="organization_name"
                          autoComplete="off"
                          autoCapitalize="words"
                          spellCheck={false}
                          autoFocus
                          aria-invalid={Boolean(errors.organization_name)}
                          aria-describedby="pista-espacio"
                          // Enter no envía: lo termina el botón,
                          // no un Enter repetido desde «Sus datos»
                          onKeyDown={(evento) => {
                            if (evento.key === 'Enter') evento.preventDefault()
                          }}
                          {...register('organization_name')}
                        />
                        {errors.organization_name?.message ? (
                          <FieldError message={errors.organization_name.message} />
                        ) : (
                          <p id="pista-espacio" className="text-muted-foreground text-xs">
                            Su nombre, su empresa o su proyecto.
                          </p>
                        )}
                      </div>

                      <LabelTemplateField elegidas={etiquetas} onChange={setEtiquetas} />
                    </>
                  )}
                </form>

                {/* Fuera del <form>, bajo la tarjeta; enlazado por `form`
                    para que Enter siga enviando */}
                <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                  {paso === 'datos' ? (
                    <Button
                      // Clave propia: reusado por React, enviaría
                      // el alta en pleno clic de «Continuar»
                      key="continuar"
                      type="button"
                      size="lg"
                      className="flex-1"
                      onClick={irAlEspacio}
                    >
                      <ArrowRightIcon />
                      Continuar
                    </Button>
                  ) : (
                    <Button
                      key="terminar"
                      type="submit"
                      form="alta-guiada"
                      size="lg"
                      className="flex-1"
                      disabled={ocupado}
                    >
                      {terminar.isPending ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <ArrowRightIcon />
                      )}
                      Ir a mi panel
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={ocupado}
                    onClick={() => irA(paso === 'datos' ? 'correo' : 'datos')}
                  >
                    Volver
                  </Button>
                </div>
              </>
            )}
          </div>
        </Container>
      </main>
    </div>
  )
}

interface PasoDelProgreso {
  etiqueta: string
  detalle: string
  hecho: boolean
  actual: boolean
  /** Solo pasos ya alcanzados y con pantalla. */
  destino?: Paso
}

/** Pasos con nombre, no «paso 2 de 4»: ver lo hecho anima a terminar.
 *  El correo pospuesto queda sin marca.
 *
 *  Dos formas, no una adaptable: la columna lleva línea y descripción; en
 *  fila no caben. Se muestra una sola, y el lector de pantalla lee una. */
function buildPasos(
  paso: Paso,
  alcanzado: number,
  correoConfirmado: boolean,
): PasoDelProgreso[] {
  const conPantalla = (
    clave: Paso,
    etiqueta: string,
    detalle: string,
    hecho: boolean,
  ) => ({
    etiqueta,
    detalle,
    hecho,
    actual: clave === paso,
    destino: clave !== paso && ORDEN.indexOf(clave) <= alcanzado ? clave : undefined,
  })

  return [
    {
      etiqueta: 'Cuenta creada',
      detalle: 'El correo ya está registrado',
      hecho: true,
      actual: false,
    },
    conPantalla(
      'correo',
      'Su correo',
      correoConfirmado
        ? 'Confirmado, con 500 créditos de regalo'
        : 'Para recibir 500 créditos de regalo',
      correoConfirmado,
    ),
    conPantalla(
      'datos',
      'Sus datos',
      'Su nombre, para la auditoría',
      alcanzado > ORDEN.indexOf('datos'),
    ),
    conPantalla(
      'espacio',
      'Su espacio',
      'Cómo se llama y con qué etiquetas empieza',
      false,
    ),
  ]
}

interface Progreso {
  pasos: PasoDelProgreso[]
  onElegir: (paso: Paso) => void
}

function ProgresoHorizontal({ pasos, onElegir }: Progreso) {
  return (
    <ol className="flex items-center gap-3" aria-label="Progreso del alta">
      {pasos.map(({ etiqueta, hecho, actual, destino }) => {
        const contenido = (
          <>
            <span
              className={cn(
                'h-1 rounded-full',
                hecho || actual ? 'bg-primary' : 'bg-primary/35',
              )}
            />
            <span
              className={cn(
                'flex items-center gap-1.5 text-xs',
                actual ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {hecho && <CheckIcon className="text-primary size-3.5" />}
              {etiqueta}
            </span>
          </>
        )

        return (
          <li
            key={etiqueta}
            className="flex flex-1"
            aria-current={actual ? 'step' : undefined}
          >
            {destino ? (
              <button
                type="button"
                onClick={() => onElegir(destino)}
                className="focus-visible:outline-ring flex w-full flex-col gap-2 rounded-sm text-left hover:[&>span:last-child]:underline focus-visible:outline-1 focus-visible:outline-offset-2"
              >
                {contenido}
              </button>
            ) : (
              <span className="flex w-full flex-col gap-2">{contenido}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function ProgresoVertical({ pasos, onElegir }: Progreso) {
  return (
    <ol aria-label="Progreso del alta">
      {pasos.map(({ etiqueta, detalle, hecho, actual, destino }, indice) => {
        const ultimo = indice === pasos.length - 1
        const contenido = (
          <>
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                hecho
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-primary text-primary',
                actual && 'ring-primary/25 ring-4',
              )}
              aria-hidden
            >
              {hecho ? <CheckIcon className="size-3.5" /> : indice + 1}
            </span>

            <span className="min-w-0 pt-0.5">
              <span
                className={cn(
                  'block text-sm font-medium',
                  destino && 'underline-offset-2 group-hover:underline',
                )}
              >
                {etiqueta}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs text-pretty">
                {detalle}
              </span>
            </span>
          </>
        )

        return (
          <li
            key={etiqueta}
            className={cn('relative', !ultimo && 'pb-10')}
            aria-current={actual ? 'step' : undefined}
          >
            {!ultimo && (
              <span className="bg-border absolute top-8 left-3.25 h-[calc(100%-2rem)] w-px" />
            )}

            {destino ? (
              <button
                type="button"
                onClick={() => onElegir(destino)}
                className="group focus-visible:outline-ring flex gap-3 rounded-md text-left focus-visible:outline-1 focus-visible:outline-offset-2"
              >
                {contenido}
              </button>
            ) : (
              <div className="flex gap-3">{contenido}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Posponible: el aviso de la aplicación lo recuerda. Sin confirmar no
 *  llegan los créditos de regalo ni lo gratuito de cada día. */
function PasoCorreo({
  confirmado,
  onListo,
}: {
  confirmado: boolean
  onListo: () => void
}) {
  const [codigo, setCodigo] = useState('')
  const { pedir, confirmar, aviso, limpiarAviso } = useConfirmarCorreo(onListo)

  // Desde el progreso con el correo ya confirmado: solo continuar
  if (confirmado) {
    return (
      <Button type="button" size="lg" className="mt-6 w-full" onClick={onListo}>
        <ArrowRightIcon />
        Continuar
      </Button>
    )
  }

  return (
    <>
      {aviso && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      <div className="border-border/70 bg-card mt-6 rounded-lg border p-5 sm:p-6">
        <EmailCodeField
          id="codigo-del-alta"
          autoFocus
          codigo={codigo}
          onCodigo={(valor) => {
            setCodigo(valor)
            limpiarAviso()
          }}
          pedir={pedir}
        />
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="button"
          size="lg"
          className="flex-1"
          disabled={codigo.length < 6 || confirmar.isPending}
          onClick={() => confirmar.mutate(codigo)}
        >
          {confirmar.isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <ArrowRightIcon />
          )}
          Confirmar
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onListo}>
          Hacerlo después
        </Button>
      </div>
    </>
  )
}
