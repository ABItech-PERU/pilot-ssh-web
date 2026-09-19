# GitHub Actions

Qué hace el flujo de `.github/workflows/ci.yml` y qué hay que configurar en
GitHub y en el servidor para que la web se despliegue sola.

## Ramas

Cada rama lleva a un ambiente, igual que en la API:

| Rama        | Al subir                                    | Ambiente                                         |
| ----------- | ------------------------------------------- | ------------------------------------------------ |
| `feature/*` | Nada. Se abre un _pull request_ a `develop` | —                                                |
| `develop`   | Pruebas                                     | `dev`: la máquina de cada quien, no se despliega |
| `staging`   | Pruebas y despliegue                        | `uat`                                            |
| `main`      | Pruebas y despliegue, con aprobación        | `prd`                                            |

Se promueve con _pull requests_: `develop → staging → main`.

## Qué hace

1. **Pruebas.** `npm run typecheck` y `npx vitest run`.
2. **Despliegue.** Solo en `staging` y `main`, y solo si las pruebas pasan.
   Usa la forma que tenga configurada el ambiente en GitHub:

   | Forma                   | Sirve para                    | Qué hace                                              |
   | ----------------------- | ----------------------------- | ----------------------------------------------------- |
   | [Dokploy](#con-dokploy) | Un servidor con Dokploy       | Le pide a Dokploy que despliegue                      |
   | [SSH](#por-ssh)         | Cualquier servidor con Docker | Entra al servidor y actualiza la carpeta del ambiente |

   Si el ambiente tiene las dos, usa Dokploy. Sin ninguna, no despliega.

Para lanzarlo a mano: _Actions → Web → Run workflow_, eligiendo la rama.

**Antes de desplegar la web, la API de ese ambiente tiene que estar arriba:**
la compilación le pide el contacto, la empresa y los precios.

## Configurar GitHub

1. **Rama por defecto:** _Settings → General → Default branch_ → `develop`.
2. **Protección de ramas:** _Settings → Branches_. En `staging` y `main`,
   exigir _pull request_ y que las pruebas pasen.
3. **Ambientes:** _Settings → Environments_, uno llamado `uat` y otro `prd`.
   - **Deployment branches:** solo `staging` en `uat` y solo `main` en `prd`.
   - **Required reviewers**, solo en `prd`: quién aprueba cada despliegue.
   - Las variables y el secreto de la forma elegida, abajo.

Las `VITE_` no van en GitHub: van en el `.env` del servidor, porque la
imagen se compila allí.

## Con Dokploy

En Dokploy, un servicio **Compose** por ambiente:

1. **Provider:** GitHub, el repositorio `pilot-ssh-web` y la rama del
   ambiente (`staging` o `main`). _Compose Path:_ `./docker-compose.yml`.
2. **Trigger Type:** `On Tag`, y **Autodeploy** apagado. Así Dokploy solo
   despliega cuando GitHub se lo pide, con las pruebas ya pasadas.
3. **Environment:** el `.env` del ambiente. Ver [entorno.md](entorno.md).

   ```env
   VITE_APP_ENV=uat
   VITE_API_URL=https://uat-api-pilotssh.abitech.com.pe
   VITE_SITE_URL=https://uat-pilotssh.abitech.com.pe
   PRERENDER_API_URL=
   WEB_PORT=8192
   ```

4. **Sin dominio en Dokploy** si el servidor tiene CloudPanel: el HTTPS lo
   pone CloudPanel. Ver [docker.md](docker.md#https).

En el ambiente de GitHub:

| Qué      | Nombre               | Valor                                                                             |
| -------- | -------------------- | --------------------------------------------------------------------------------- |
| Variable | `DOKPLOY_URL`        | La dirección de Dokploy, sin `/` al final                                         |
| Variable | `DOKPLOY_COMPOSE_ID` | Lo que va tras `/compose/` en la dirección del navegador, con el servicio abierto |
| Secreto  | `DOKPLOY_API_KEY`    | _Settings → Profile → API/CLI → Generate_                                         |

El id **no** es el que aparece al final de la _Webhook URL_: ese es otro.

## Por SSH

En el servidor, una sola vez por ambiente:

1. **La carpeta**, levantada como explica [docker.md](docker.md): el
   repositorio clonado en la rama del ambiente y su `.env`.
2. **Una llave para desplegar.** Sin contraseña y solo para esto:

   ```bash
   ssh-keygen -t ed25519 -N "" -f despliegue
   cat despliegue.pub >> ~/.ssh/authorized_keys
   ```

   El usuario tiene que poder usar `docker` y hacer `git pull` de esa carpeta.

3. **La huella del servidor**, para que GitHub sepa que habla con él:

   ```bash
   ssh-keyscan -p 22 servidor.sudominio.com
   ```

En el ambiente de GitHub:

| Qué      | Nombre               | Valor                                                        |
| -------- | -------------------- | ------------------------------------------------------------ |
| Variable | `DEPLOY_HOST`        | El servidor                                                  |
| Variable | `DEPLOY_PORT`        | El puerto SSH. Sin ella, `22`                                |
| Variable | `DEPLOY_USER`        | El usuario                                                   |
| Variable | `DEPLOY_PATH`        | La carpeta del ambiente, por ejemplo `/srv/pilotssh/web-uat` |
| Variable | `DEPLOY_KNOWN_HOSTS` | Lo que imprimió `ssh-keyscan`                                |
| Secreto  | `DEPLOY_SSH_KEY`     | El contenido del archivo `despliegue`, la llave privada      |

Cada despliegue corre, en esa carpeta:

```bash
git pull --ff-only origin <rama> && docker compose up -d --build
```

## Si algo falla

| Síntoma                                  | Causa                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| _Desplegar_ responde `404` de Dokploy    | `DOKPLOY_COMPOSE_ID` no es el del servicio                                       |
| La web da `502` en el navegador          | CloudPanel apunta a otro puerto que `WEB_PORT`. Ver [docker.md](docker.md#https) |
| La compilación se detiene al leer la API | La API de ese ambiente no responde, o falta `PRERENDER_API_URL`                  |
| En Dokploy no cambia nada tras un push   | Las pruebas fallaron: el despliegue solo corre si pasan                          |
