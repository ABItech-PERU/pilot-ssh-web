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
    id: 'responsable',
    titulo: 'Responsable',
    contenido: (
      <>
        <p>
          El responsable del tratamiento de sus datos personales, conforme a la Ley 29733
          y su reglamento, es:
        </p>
        <Titular />
      </>
    ),
  },
  {
    id: 'datos',
    titulo: 'Qué datos tratamos',
    contenido: (
      <ul>
        <li>
          <strong>De su cuenta:</strong> correo, contraseña (guardada de forma
          irreversible) y, si los da, nombre, teléfono y foto.
        </li>
        <li>
          <strong>De uso y seguridad:</strong> dirección IP, navegador, inicios de sesión,
          sesiones de terminal (servidor, credencial, inicio y fin) y acciones en la
          plataforma.
        </li>
        <li>
          <strong>De pagos:</strong> recargas, importes, medio de pago y comprobantes. Los
          datos de tarjeta los recibe Mercado Pago; nosotros no los guardamos.
        </li>
        <li>
          <strong>De sus servidores:</strong> dirección, usuario y contraseña o llave, que
          guardamos cifradas.
        </li>
      </ul>
    ),
  },
  {
    id: 'finalidades',
    titulo: 'Para qué los usamos',
    contenido: (
      <>
        <ul>
          <li>Prestar el servicio y administrar su cuenta.</li>
          <li>Proteger las cuentas y los servidores, y prevenir fraudes.</li>
          <li>Cobrar y emitir comprobantes.</li>
          <li>Atender sus consultas y enviarle avisos del servicio.</li>
        </ul>
        <p>
          No grabamos lo que se escribe ni lo que se ve en la terminal. No enviamos
          publicidad ni vendemos sus datos.
        </p>
      </>
    ),
  },
  {
    id: 'base',
    titulo: 'Base legal',
    contenido: (
      <p>
        Tratamos sus datos porque son necesarios para darle el servicio que contrata al
        crear su cuenta (artículo 14 de la Ley 29733). Si alguna vez quisiéramos usarlos
        para otra finalidad, como publicidad, le pediremos antes su consentimiento.
      </p>
    ),
  },
  {
    id: 'obligatorios',
    titulo: 'Datos obligatorios',
    contenido: (
      <p>
        El correo y la contraseña son obligatorios: sin ellos no se puede crear la cuenta.
        El nombre, el teléfono y la foto son opcionales.
      </p>
    ),
  },
  {
    id: 'destinatarios',
    titulo: 'Con quién los compartimos',
    contenido: (
      <>
        <p>Solo con los proveedores que necesitamos para dar el servicio:</p>
        <ul>
          <li>Proveedores de servidores en la nube, donde funciona Pilot SSH.</li>
          <li>Mercado Pago, para procesar los pagos.</li>
          <li>Proveedores de correo, para enviarle códigos y avisos.</li>
        </ul>
        <p>
          Algunos están fuera del Perú. Esas transferencias son necesarias para prestar el
          servicio (artículo 15 de la Ley 29733) y se hacen con garantías adecuadas.
          También entregaremos datos a las autoridades cuando la ley lo exija.
        </p>
      </>
    ),
  },
  {
    id: 'conservacion',
    titulo: 'Cuánto tiempo los guardamos',
    contenido: (
      <p>
        Mientras su cuenta esté activa. Al cerrarla, los eliminamos o anonimizamos, salvo
        el registro de actividad y los pagos, que conservamos el tiempo que exigen las
        normas de seguridad y tributarias.
      </p>
    ),
  },
  {
    id: 'derechos',
    titulo: 'Sus derechos',
    contenido: (
      <>
        <p>
          Puede pedir acceso, rectificación, cancelación u oposición al tratamiento de sus
          datos, y revocar su consentimiento. Escríbanos a <CorreoDeContacto /> con su
          nombre y lo que solicita. Respondemos en los plazos que fija el reglamento de la
          Ley 29733.
        </p>
        <p>
          Si no está conforme con la respuesta, puede presentar una reclamación ante la
          Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia
          y Derechos Humanos.
        </p>
      </>
    ),
  },
  {
    id: 'seguridad',
    titulo: 'Seguridad',
    contenido: (
      <p>
        Ciframos las credenciales de sus servidores, protegemos las cuentas con
        verificación en dos pasos y registramos los accesos. Más detalles en{' '}
        <Link to="/security">Seguridad</Link>.
      </p>
    ),
  },
  {
    id: 'almacenamiento',
    titulo: 'Cookies y almacenamiento',
    contenido: (
      <p>
        No usamos cookies de publicidad ni de analítica. Guardamos en su navegador la
        sesión y sus preferencias, como el tema. Al pagar, el formulario de Mercado Pago
        puede usar sus propias cookies para prevenir fraudes.
      </p>
    ),
  },
  {
    id: 'decisiones',
    titulo: 'Decisiones automatizadas',
    contenido: (
      <p>
        No tomamos decisiones sobre usted basadas solo en el tratamiento automatizado de
        sus datos. Las reglas del servicio, como no abrir terminales sin créditos, se
        aplican a todos por igual.
      </p>
    ),
  },
  {
    id: 'menores',
    titulo: 'Menores de edad',
    contenido: <p>Pilot SSH no está dirigido a menores de 18 años.</p>,
  },
  {
    id: 'cambios',
    titulo: 'Cambios a esta política',
    contenido: (
      <p>
        Si hacemos cambios importantes, le avisaremos por correo o en la aplicación antes
        de que entren en vigor.
      </p>
    ),
  },
]

export function PrivacyPage() {
  useTituloDePagina('/privacy')
  return (
    <DocumentoLegal
      titulo="Política de privacidad"
      resumen="Qué datos tratamos, para qué y cómo ejercer sus derechos."
      apartados={APARTADOS}
    />
  )
}
