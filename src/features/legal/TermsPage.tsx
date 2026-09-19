import { Link } from 'react-router'

import {
  CorreoDeContacto,
  DocumentoLegal,
  Titular,
  type Apartado,
} from '@/features/legal/DocumentoLegal'
import { useTituloDePagina } from '@/features/sitio/partes'

const APARTADOS: Apartado[] = [
  {
    id: 'quienes-somos',
    titulo: 'Quiénes somos',
    contenido: (
      <>
        <p>Pilot SSH es un servicio de:</p>
        <Titular />
      </>
    ),
  },
  {
    id: 'aceptacion',
    titulo: 'Aceptación',
    contenido: (
      <p>
        Al crear una cuenta acepta estos términos y la{' '}
        <Link to="/privacy">Política de privacidad</Link>. Si usa Pilot SSH en nombre de
        una empresa, declara que puede obligarla.
      </p>
    ),
  },
  {
    id: 'servicio',
    titulo: 'El servicio',
    contenido: (
      <p>
        Pilot SSH permite guardar los datos de acceso a sus servidores, dar acceso a otras
        personas y abrir sesiones SSH desde el navegador, con un registro de la actividad.
      </p>
    ),
  },
  {
    id: 'cuenta',
    titulo: 'Su cuenta',
    contenido: (
      <ul>
        <li>Debe ser mayor de 18 años y dar datos verdaderos.</li>
        <li>Cuide su contraseña. Lo que se haga con su cuenta es su responsabilidad.</li>
        <li>
          Si sospecha un uso indebido, escríbanos de inmediato a <CorreoDeContacto />.
        </li>
      </ul>
    ),
  },
  {
    id: 'uso-permitido',
    titulo: 'Uso permitido',
    contenido: (
      <>
        <p>
          Solo puede conectar servidores que le pertenecen o que está autorizado a
          administrar. No está permitido:
        </p>
        <ul>
          <li>Entrar a sistemas sin autorización, escanearlos o atacarlos.</li>
          <li>
            Distribuir programas maliciosos, enviar spam o minar criptomonedas sin
            permiso.
          </li>
          <li>Intentar vulnerar Pilot SSH o usarlo para actividades ilegales.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'sus-servidores',
    titulo: 'Sus servidores y su equipo',
    contenido: (
      <>
        <p>
          Usted responde por lo que se hace en sus servidores y por las personas a las que
          da acceso.
        </p>
        <p>
          Sobre los datos de sus servidores y de su equipo actuamos como encargados: los
          usamos solo para prestar el servicio y no los compartimos con fines propios.
        </p>
      </>
    ),
  },
  {
    id: 'creditos-y-pagos',
    titulo: 'Créditos y pagos',
    contenido: (
      <ul>
        <li>
          El uso se paga con créditos prepagados, según las tarifas publicadas en{' '}
          <Link to="/pricing">Precios</Link>.
        </li>
        <li>Los créditos no caducan. Los precios están en soles.</li>
        <li>
          Los pagos con tarjeta, Yape o PagoEfectivo los procesa Mercado Pago. No
          guardamos datos de tarjetas.
        </li>
        <li>
          Si cambian las tarifas, avisaremos con al menos 15 días de anticipación. El
          cambio no afecta los días ya cobrados.
        </li>
        <li>Devolvemos cualquier cobro indebido o duplicado.</li>
      </ul>
    ),
  },
  {
    id: 'disponibilidad',
    titulo: 'Disponibilidad',
    contenido: (
      <p>
        Trabajamos para que Pilot SSH esté siempre disponible, pero puede haber
        interrupciones por mantenimiento o fallas. Avisaremos los mantenimientos
        programados cuando sea posible.
      </p>
    ),
  },
  {
    id: 'suspension',
    titulo: 'Suspensión y cierre',
    contenido: (
      <>
        <p>
          Podemos suspender una cuenta u organización si incumple estos términos, si hay
          un riesgo de seguridad o por mandato legal. Le diremos el motivo.
        </p>
        <p>Puede cerrar su cuenta cuando quiera.</p>
      </>
    ),
  },
  {
    id: 'responsabilidad',
    titulo: 'Responsabilidad',
    contenido: (
      <p>
        Respondemos por los daños que causemos conforme a la ley peruana. No respondemos
        por el uso que usted o su equipo den a los accesos, ni por fallas de sus
        servidores o de redes de terceros.
      </p>
    ),
  },
  {
    id: 'propiedad',
    titulo: 'Propiedad intelectual',
    contenido: (
      <p>El software y la marca Pilot SSH son nuestros. Sus datos siguen siendo suyos.</p>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios a estos términos',
    contenido: (
      <p>
        Si hacemos cambios importantes, le avisaremos por correo o en la aplicación antes
        de que entren en vigor.
      </p>
    ),
  },
  {
    id: 'ley',
    titulo: 'Ley aplicable',
    contenido: (
      <p>
        Estos términos se rigen por las leyes del Perú. Si es consumidor, puede acudir
        también al Indecopi.
      </p>
    ),
  },
]

export function TermsPage() {
  useTituloDePagina('/terms')
  return (
    <DocumentoLegal
      titulo="Términos y condiciones"
      resumen="Las reglas para usar Pilot SSH."
      apartados={APARTADOS}
    />
  )
}
