# Desarrollo local

Cómo levantar la web en su PC para programar. Corre igual que en `uat` y
`prd` (Docker Swarm), pero con Vite y el código montado: al guardar un
archivo, la página se actualiza sola.

## Antes de empezar

| Necesita                                  | Cómo comprobarlo                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Docker Desktop** instalado y abierto    | El ícono de la ballena está en la bandeja de Windows                                                   |
| **Git Bash** (viene con Git para Windows) | En VS Code: _Terminal → New Terminal_, flecha **▾** → **Git Bash**                                     |
| **La API de desarrollo levantada**        | http://127.0.0.1:8000/api/site responde. Si no, siga [su guía](../../pilot-ssh-api/docs/desarrollo.md) |

> **Dónde:** todos los comandos de esta guía se escriben en **Git Bash**, dentro de
> la carpeta de la web. Al abrir la terminal, entre en ella:
>
> ```bash
> cd /c/laragon/www/pilotssh/pilot-ssh-web
> ```

---

## Paso 1 · Preparar · _solo la primera vez_

Crear el archivo de configuración. El ejemplo sirve tal cual:

```bash
cp .env.example .env
```

---

## Paso 2 · Arrancar · _cada vez que va a trabajar_

```bash
sh deploy/docker/desplegar.sh
```

La primera vez instala los paquetes y tarda unos minutos. Termina cuando la
línea dice `converged`.

Compruébelo abriendo http://localhost:5190 en el navegador.

---

## Paso 3 · Trabajar

| Quiero…                                     | Comando                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| Ver lo que pasa en Vite                     | `docker service logs -f pilotssh_web_dev_app`        |
| Comprobar tipos y correr las pruebas        | `sh deploy/docker/pruebas.sh`                        |
| Aplicar un cambio del `.env`                | `sh deploy/docker/desplegar.sh`                      |
| Instalar un paquete nuevo de `package.json` | `docker service update --force pilotssh_web_dev_app` |

> **Nota:** Al guardar un archivo, la página se actualiza sola. Las llamadas a `/api`,
> `/media` y `/ws` van a la API de desarrollo, sin configurar nada.

---

## Paso 4 · Apagar · _al terminar_

```bash
docker stack rm pilotssh_web_dev
```

---

## Si algo falla

| Ve esto                                         | Haga esto                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `this node is not a swarm manager`              | Falta `docker swarm init`: vea el paso 1 de la guía de la API                                |
| `port is already allocated`                     | Otro programa usa el puerto `5190`: ciérrelo                                                 |
| «No pudimos conectar con el servidor» en la web | La API de desarrollo no está levantada                                                       |
| «Tu sesión expiró» nada más entrar              | Vuelva a entrar; si sigue, borre `pilotssh.session` en el almacenamiento del navegador       |
| La página sale en blanco                        | Mire la consola del navegador (F12), no la terminal                                          |
| `Refused to load …` en la consola               | La CSP no permite ese dominio: vea [arquitectura.md](arquitectura.md#cabeceras-de-seguridad) |

<details>
<summary><strong>Extra: generar las páginas prerenderizadas, como en producción</strong></summary>

Quedan en la carpeta `dist/`:

```bash
web=$(docker ps -q -f name=pilotssh_web_dev_app)
docker exec "$web" npm run build
docker exec -e APP_SITE_URL=http://localhost:5190 -e PRERENDER_API_URL=http://localhost "$web" npm run prerender
```

</details>
