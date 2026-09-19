# Despliegue en el servidor

Cómo instalar la web en un servidor para `uat` (pruebas) y `prd`
(producción). Hay dos copias que se relevan sin corte, y la misma imagen
sirve a los dos ambientes: al arrancar lee su `.env`. Una vez instalada,
GitHub despliega solo: vea [GitHub Actions](github-actions.md).

## Antes de empezar

| Necesita                                                                                       | Para qué                                                               |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **La API del mismo ambiente ya instalada** ([su guía](../../pilot-ssh-api/docs/deployment.md)) | La web lee de ella el contacto y los precios al arrancar               |
| En el `.env` de esa API, `SECURITY_CORS_ORIGINS` y `APP_WEB_URL` con la dirección de la web    | Sin ellos, el navegador bloquea las llamadas y los correos enlazan mal |
| El dominio de la web apuntando al servidor (registro `A`)                                      | Por ejemplo `uat-pilotssh.abitech.com.pe`                              |

> **Dónde:** todos los comandos de esta guía se escriben **en el servidor**. Desde
> su PC, conéctese así:
>
> ```bash
> ssh root@<ip-del-servidor>
> ```

Los datos de cada ambiente:

|                     | `uat`                   | `prd`                   |
| ------------------- | ----------------------- | ----------------------- |
| Rama                | `staging`               | `main`                  |
| Carpeta             | `/srv/pilotssh/web-uat` | `/srv/pilotssh/web-prd` |
| Puerto (`WEB_PORT`) | `8192`                  | `8092`                  |

Los ejemplos de esta guía son de `uat`.

---

## Paso 1 · Instalar el ambiente · _una vez para `uat` y otra para `prd`_

**1.1 Descargar el código**

```bash
git clone -b staging <url-del-repositorio> /srv/pilotssh/web-uat
cd /srv/pilotssh/web-uat
```

> **Nota:** Desde aquí, los comandos se corren **dentro de la carpeta del ambiente**.

**1.2 Crear la configuración**

```bash
cp .env.example .env
```

Y déjelo así ([qué es cada variable](entorno.md)):

```env
APP_ENV=uat
APP_API_URL=https://uat-api-pilotssh.abitech.com.pe
APP_SITE_URL=https://uat-pilotssh.abitech.com.pe
PRERENDER_API_URL=
IMAGE_TAG=
WEB_PORT=8192
```

**1.3 Levantar**

```bash
sh deploy/docker/desplegar.sh
```

Termina cuando la línea dice `converged`. Compruébelo:

```bash
docker service ls
```

Debe ver el servicio `app` de la web con `2/2`.

---

## Paso 2 · Publicar con HTTPS · _en CloudPanel, desde el navegador_

1. **Sites → Add Site → Create a Reverse Proxy.**
2. _Domain Name:_ `uat-pilotssh.abitech.com.pe` · _Reverse Proxy Url:_
   `http://127.0.0.1:8192`
3. En el sitio creado: **SSL/TLS → Actions → New Let's Encrypt Certificate.**

Compruébelo abriendo `https://uat-pilotssh.abitech.com.pe`.

---

## Mantener

Las versiones nuevas las despliega GitHub solo.

**Desplegar a mano** · en el servidor, dentro de la carpeta del ambiente:

| Quiero…                       | Comando                                               |
| ----------------------------- | ----------------------------------------------------- |
| Desplegar la última versión   | `git pull && sh deploy/docker/desplegar.sh`           |
| Aplicar un cambio del `.env`  | `sh deploy/docker/desplegar.sh`                       |
| Volver a una versión anterior | `IMAGE_TAG=sha-1a2b3c4 sh deploy/docker/desplegar.sh` |

Con un panel de despliegue, use su botón de desplegar; para volver a una
versión, cambie `IMAGE_TAG` en su configuración.

**Revisar** · en el servidor, por SSH. El nombre del servicio sale con
`docker service ls`:

| Quiero…                       | Comando                              |
| ----------------------------- | ------------------------------------ |
| Ver lo que pasa en la web     | `docker service logs -f <servicio>`  |
| Deshacer el último despliegue | `docker service rollback <servicio>` |

---

## Si algo falla

| Ve esto                                       | Haga esto                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| El dominio da `502`                           | En CloudPanel, el puerto del _Reverse Proxy_ no es el `WEB_PORT`       |
| `La API no responde en …` en el registro      | Instale o levante antes la API del mismo ambiente                      |
| `… tiene que ser un origen público con https` | `APP_API_URL` y `APP_SITE_URL` con `https://`, sin ruta ni `localhost` |
| `port is already allocated`                   | Otro ambiente usa ese `WEB_PORT`                                       |
