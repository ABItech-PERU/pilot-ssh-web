/** Zona en que se leen las horas y se cortan los días: la del perfil o,
 *  sin ella, la del navegador. Vive fuera de React: la leen funciones de
 *  formato llamadas desde cualquier sitio. */

export function zonaDelNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

let zona = zonaDelNavegador()

export function zonaActual(): string {
  return zona
}

/** La fija la sesión con el perfil; en blanco, vuelve a la del navegador. */
export function fijarZona(nueva: string) {
  zona = nueva || zonaDelNavegador()
}

/** «UTC-05:00». Se calcula para un momento dado: Madrid no está a la misma
 *  distancia de UTC en enero que en julio. */
export function desfase(nombre: string, fecha = new Date()): string {
  const parte = new Intl.DateTimeFormat('en-US', {
    timeZone: nombre,
    timeZoneName: 'longOffset',
  })
    .formatToParts(fecha)
    .find((una) => una.type === 'timeZoneName')?.value
  // «GMT» a secas es el desfase cero
  return !parte || parte === 'GMT' ? 'UTC+00:00' : parte.replace('GMT', 'UTC')
}

/** El día del calendario de un instante en una zona: `AAAA-MM-DD`, como viaja
 *  a la API. «en-CA» escribe justo ese formato. */
export function diaEnZona(fecha: Date, nombre: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: nombre,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha)
}

/** Todas las que conoce el navegador. UTC no siempre viene en la lista. */
export function zonasDisponibles(): string[] {
  const todas = Intl.supportedValuesOf('timeZone')
  return todas.includes('UTC') ? todas : ['UTC', ...todas]
}

/** Nombres en español de las ciudades que cambian. Algunas van dos veces:
 *  hay navegadores que usan el nombre antiguo de la zona. */
const CIUDADES_EN_ESPANOL: Record<string, string> = {
  'Africa/Cairo': 'El Cairo',
  'Africa/Johannesburg': 'Johannesburgo',
  'America/Asuncion': 'Asunción',
  'America/Bogota': 'Bogotá',
  'America/Cancun': 'Cancún',
  'America/Havana': 'La Habana',
  'America/Los_Angeles': 'Los Ángeles',
  'America/Mazatlan': 'Mazatlán',
  'America/Merida': 'Mérida',
  'America/Mexico_City': 'Ciudad de México',
  'America/New_York': 'Nueva York',
  'America/Panama': 'Panamá',
  'America/Sao_Paulo': 'São Paulo',
  'Asia/Calcutta': 'Calcuta',
  'Asia/Dubai': 'Dubái',
  'Asia/Ho_Chi_Minh': 'Ciudad Ho Chi Minh',
  'Asia/Jakarta': 'Yakarta',
  'Asia/Jerusalem': 'Jerusalén',
  'Asia/Kolkata': 'Calcuta',
  'Asia/Riyadh': 'Riad',
  'Asia/Saigon': 'Ciudad Ho Chi Minh',
  'Asia/Seoul': 'Seúl',
  'Asia/Shanghai': 'Shanghái',
  'Asia/Singapore': 'Singapur',
  'Asia/Taipei': 'Taipéi',
  'Asia/Tehran': 'Teherán',
  'Asia/Tokyo': 'Tokio',
  'Atlantic/Canary': 'Canarias',
  'Australia/Sydney': 'Sídney',
  'Europe/Amsterdam': 'Ámsterdam',
  'Europe/Athens': 'Atenas',
  'Europe/Berlin': 'Berlín',
  'Europe/Brussels': 'Bruselas',
  'Europe/Bucharest': 'Bucarest',
  'Europe/Copenhagen': 'Copenhague',
  'Europe/Dublin': 'Dublín',
  'Europe/Istanbul': 'Estambul',
  'Europe/Kyiv': 'Kiev',
  'Europe/Lisbon': 'Lisboa',
  'Europe/London': 'Londres',
  'Europe/Moscow': 'Moscú',
  'Europe/Paris': 'París',
  'Europe/Prague': 'Praga',
  'Europe/Rome': 'Roma',
  'Europe/Stockholm': 'Estocolmo',
  'Europe/Vienna': 'Viena',
  'Europe/Warsaw': 'Varsovia',
  'Europe/Zurich': 'Zúrich',
  'Pacific/Easter': 'Isla de Pascua',
  'Pacific/Galapagos': 'Galápagos',
}

export interface Zona {
  /** El nombre técnico, el que se guarda: `America/Lima`. */
  nombre: string
  ciudad: string
  /** «hora de Perú»; vacío si el navegador no le conoce nombre propio. */
  region: string
  desfase: string
  minutos: number
  /** La hora actual allí: confirma la elección mejor que un desfase. */
  hora: string
}

/** Cómo la busca la gente: «Lima», «hora de Perú», «UTC-05:00» y la hora
 *  de allí, no `America/Lima`. */
export function describirZona(nombre: string, fecha = new Date()): Zona {
  const texto = desfase(nombre, fecha)
  return {
    nombre,
    ciudad:
      CIUDADES_EN_ESPANOL[nombre] ??
      (nombre.split('/').at(-1) ?? nombre).replaceAll('_', ' '),
    region: regionDe(nombre, fecha),
    desfase: texto,
    minutos: minutosDe(texto),
    hora: new Intl.DateTimeFormat('es', {
      timeZone: nombre,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(fecha),
  }
}

/** Por desfase y no por nombre: las de la misma hora quedan juntas, que es
 *  como se busca «la mía». */
export function ordenarPorDesfase(zonas: string[], fecha = new Date()): Zona[] {
  return zonas
    .map((nombre) => describirZona(nombre, fecha))
    .sort(
      (una, otra) => una.minutos - otra.minutos || una.nombre.localeCompare(otra.nombre),
    )
}

/** Sin nombre propio el navegador da el desfase, que ya se ve al lado: no
 *  se repite. */
function regionDe(nombre: string, fecha: Date): string {
  const parte =
    new Intl.DateTimeFormat('es', { timeZone: nombre, timeZoneName: 'longGeneric' })
      .formatToParts(fecha)
      .find((una) => una.type === 'timeZoneName')?.value ?? ''
  return /^(GMT|UTC)/.test(parte) ? '' : parte
}

function minutosDe(texto: string): number {
  const partes = /UTC([+-])(\d{2}):(\d{2})/.exec(texto)
  if (!partes) return 0
  const [, signo, horas, minutos] = partes
  return (signo === '-' ? -1 : 1) * (Number(horas) * 60 + Number(minutos))
}
