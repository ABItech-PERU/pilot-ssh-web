export interface Pregunta {
  pregunta: string
  respuesta: string
}

export const PREGUNTAS_GENERALES: Pregunta[] = [
  {
    pregunta: '¿Puedo probarlo con mi equipo sin pagar?',
    respuesta:
      'Sí. Cada día hay un uso sin costo y al confirmar su correo recibe créditos de regalo. No pedimos tarjeta.',
  },
  {
    pregunta: '¿Tengo que instalar algo?',
    respuesta: 'No. Su equipo entra a los servidores desde el navegador.',
  },
  {
    pregunta: '¿Alguien puede ver mis contraseñas?',
    respuesta:
      'No. Se guardan cifradas y no se muestran a nadie, tampoco a nuestro equipo.',
  },
  {
    pregunta: '¿Qué servidores puedo conectar?',
    respuesta: 'Cualquier servidor con SSH al que se pueda llegar desde internet.',
  },
  {
    pregunta: '¿Cómo quito el acceso a alguien?',
    respuesta:
      'Desde su equipo, en un clic. También puede darlo con fecha de fin y se cierra solo.',
  },
  {
    pregunta: '¿Cuánto cuesta?',
    respuesta:
      'Empezar es gratis. Después paga en soles solo los días que su equipo se conecta.',
  },
]

export const PREGUNTAS_DE_PRECIOS: Pregunta[] = [
  {
    pregunta: '¿Los créditos caducan?',
    respuesta: 'No. Se descuentan solo los días que alguien abre una terminal.',
  },
  {
    pregunta: '¿Cómo pago?',
    respuesta: 'Con tarjeta, Yape o PagoEfectivo, en soles.',
  },
  {
    pregunta: '¿Añadir personas o servidores cuesta?',
    respuesta: 'No. Solo cuentan los días en que se usan.',
  },
  {
    pregunta: '¿Qué pasa si me quedo sin créditos?',
    respuesta: 'Le avisamos antes. Tiene unos días para recargar y no se borra nada.',
  },
]
