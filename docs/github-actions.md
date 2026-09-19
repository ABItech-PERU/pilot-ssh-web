# GitHub Actions

Qué hace `.github/workflows/ci.yml` y qué configurar para que la web se
despliegue sola. La API tiene el suyo:
[su guía](../../pilot-ssh-api/docs/github-actions.md).

## Qué hace

| Paso        | Cuándo                                  | Qué hace                                                             |
| ----------- | --------------------------------------- | -------------------------------------------------------------------- |
| `pruebas`   | Siempre                                 | `npm run typecheck` y `npx vitest run`, sin variables de ambiente    |
| `imagenes`  | `staging`, `main` y tags `v*`           | Publica `ghcr.io/abitech-peru/pilotssh-web`                          |
| `desplegar` | Solo `staging` (`uat`) y `main` (`prd`) | Dokploy si hay `DOKPLOY_API_KEY`; si no, SSH si hay `DEPLOY_SSH_KEY` |

Etiquetas: `sha-<7 del commit>` siempre, `uat` o `prd` según la rama, y
`X.Y.Z` con el tag `vX.Y.Z`. Un commit ya compilado se reetiqueta, no se
recompila: `prd` corre la imagen probada en `uat`.

Las `APP_` **no** van en GitHub: van en el `.env` del servidor o en el
_Environment_ de Dokploy.

## Configurar GitHub

1. _Settings → General → Default branch_ → `develop`.
2. _Settings → Branches_: en `staging` y `main`, _pull request_ y pruebas
   obligatorias.
3. _Settings → Environments_: `uat` (solo rama `staging`) y `prd` (solo
   `main`, con _Required reviewers_). En cada uno, las variables de la forma
   elegida, abajo.

## Con Dokploy

Un servicio **Compose de tipo Stack** por ambiente:

| Campo          | Valor                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Provider_     | GitHub, `pilot-ssh-web`, rama `staging` o `main`                                                                                                                        |
| _Compose Path_ | `./docker-compose.yml`                                                                                                                                                  |
| _Trigger Type_ | `On Tag`, con _Autodeploy_ apagado                                                                                                                                      |
| _Environment_  | El `.env` del ambiente, con `IMAGE_TAG=uat` o `IMAGE_TAG=prd`. Ejemplo en [deployment.md](deployment.md#paso-1--instalar-el-ambiente--una-vez-para-uat-y-otra-para-prd) |
| _Registry_     | `ghcr.io`, con un token de GitHub con `read:packages`                                                                                                                   |
| Dominios       | Ninguno si hay CloudPanel: el HTTPS lo pone él                                                                                                                          |

En el ambiente de GitHub:

| Qué      | Nombre               | Valor                                                                             |
| -------- | -------------------- | --------------------------------------------------------------------------------- |
| Variable | `DOKPLOY_URL`        | La dirección de Dokploy, sin `/` al final                                         |
| Variable | `DOKPLOY_COMPOSE_ID` | Lo que va tras `/compose/` en la URL del navegador. **No** el de la _Webhook URL_ |
| Secreto  | `DOKPLOY_API_KEY`    | _Settings → Profile → API/CLI → Generate_                                         |

## Por SSH

En el servidor, la carpeta del ambiente [ya creada](deployment.md#paso-1--instalar-el-ambiente--una-vez-para-uat-y-otra-para-prd),
y un usuario que pueda usar `docker`, hacer `git pull` y con
`docker login ghcr.io` hecho. Una llave solo para desplegar:

```bash
ssh-keygen -t ed25519 -N "" -f despliegue
cat despliegue.pub >> ~/.ssh/authorized_keys
ssh-keyscan -p 22 servidor.sudominio.com   # la huella, para DEPLOY_KNOWN_HOSTS
```

En el ambiente de GitHub: variables `DEPLOY_HOST`, `DEPLOY_PORT` (por defecto
`22`), `DEPLOY_USER`, `DEPLOY_PATH` (por ejemplo `/srv/pilotssh/web-uat`) y
`DEPLOY_KNOWN_HOSTS`; secreto `DEPLOY_SSH_KEY`, la llave privada `despliegue`.

Cada despliegue corre, en esa carpeta:

```bash
git pull --ff-only origin <rama> && IMAGE_TAG=sha-<commit> sh deploy/docker/desplegar.sh
```

## Si algo falla

| Síntoma                                  | Causa                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Dokploy responde `404`                   | `DOKPLOY_COMPOSE_ID` no es el del servicio                                           |
| No baja la imagen                        | Falta `docker login ghcr.io`, o el registro en Dokploy                               |
| El servicio sigue en la versión anterior | La API de ese ambiente no responde. Ver [deployment.md](deployment.md#si-algo-falla) |
| No se despliega tras un push             | Las pruebas fallaron                                                                 |
