# Seguridad (Pilot SSH Web)

DIRECTIVA: esta interfaz reparte shells de root. `core/05-security-baseline.md`
es el minimo; esto lo endurece y **ninguna regla de proyecto concede
excepciones**.

La premisa que ordena todo lo demas: **el frontend no protege nada.** Quien
autoriza es el backend, en cada peticion. Todo lo de aqui es para no filtrar,
no confundir y no facilitar el trabajo a un atacante.

## Lo que nunca se relaja

1. **NINGUNA DECISION DE ACCESO SE TOMA AQUI.** Esconder una ruta, un boton o
   una columna es cortesia. Un permiso comprobado solo en el cliente es un
   permiso ausente: se cambia con la consola abierta.

2. **NINGUN SECRETO EN EL BUNDLE NI EN `config.js`.** `/config.js` viaja al
   navegador y es publico: lleva el ambiente y la URL de la API, nada mas.
   Una clave de servicio en el bundle o en `config.js` esta publicada.

3. **NADA DE `dangerouslySetInnerHTML` CON DATO DE USUARIO.** El nombre de un
   servidor, de una organizacion o de una persona lo escribe alguien. React
   escapa por defecto: saltarselo es reintroducir XSS a mano.

4. **LOS MENSAJES DEL BACKEND SE MUESTRAN, NO SE REESCRIBEN.** Ya vienen sin
   jerga y sin interioridades. Reescribirlos en el cliente duplica la regla y
   acaba filtrando lo que el backend habia decidido ocultar.

## Sesion y tokens

- `access` de 30 minutos, `refresh` de 7 dias con **rotacion**: el anterior
  queda en lista negra.
- Viven en `localStorage` y **eso es una decision consciente, no un descuido**:
  el WebSocket exige el `access` en la query, luego tiene que ser legible por
  JavaScript. La alternativa real —cookie `httpOnly` mas endpoint de ticket
  para el socket— esta en el roadmap.
  - Consecuencia asumida: un XSS se lleva la sesion. Por eso la regla 3 de
    arriba no se negocia.
- **El refresco es unico.** Con rotacion, varios refrescos simultaneos
  invalidan la sesion y echan al usuario sin motivo aparente.
- **Cerrar sesion limpia la cache de consultas**, no solo el token. Los datos
  de la organizacion anterior siguen en memoria hasta que se limpian, y en un
  equipo compartido los ve el siguiente.

## WebSocket

- El token va en la query porque el navegador no admite cabeceras en el
  handshake. Por eso es corto.
- **Produccion exige `wss://`.** En `ws://` el token viaja en claro y queda en
  los logs de cualquier proxy intermedio.
- **CORS no protege el WebSocket:** los handshake no pasan por la politica de
  origenes. La unica puerta es el JWT.
- Los codigos de cierre se traducen a un mensaje entendible: `4401` sesion o
  cuenta desactivada, `4402` organizacion suspendida, `4403` permiso, `4412`
  creditos. Una terminal abierta tambien puede cerrarse con `4401` o `4402`. Nunca se enseña el numero
  suelto, y el de creditos lleva a Creditos: sin eso no hay por donde seguir.

## Credenciales SSH

- **Nunca llegan al navegador.** La API devuelve `has_password` y
  `has_private_key`. No hay pantalla que muestre una.
- Entran por un formulario y salen del estado en cuanto se envian. No se
  guardan en `localStorage`, ni en la cache de consultas, ni en un `useState`
  que sobreviva al dialogo.
- **Nunca se registran.** Ni en `console.log`, ni en un aviso, ni en un
  informe de error. Un volcado del formulario entero filtra la llave privada.

## Enlaces y navegacion

- Un enlace externo lleva `rel="noopener noreferrer"`. Sin `noopener`, la
  pagina destino puede manipular la de origen.
- Nunca se navega a una URL que venga de la respuesta del servidor sin
  comprobar que es interna: es redireccion abierta.

## Antes de dar algo por terminado

```bash
sh deploy/docker/pruebas.sh
```

Y la pregunta que no puede quedar sin respuesta: **si alguien abre esta
pantalla sin permiso, quien lo para?** Si la respuesta es "el guard de la
ruta", el control de acceso falta.
