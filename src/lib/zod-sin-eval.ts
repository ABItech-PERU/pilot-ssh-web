import { z } from 'zod'

/** Sin `eval`: la CSP lo bloquea. Se importa antes que ningún esquema. */
z.config({ jitless: true })
