import { QueryClient } from '@tanstack/react-query'

import { ApiError, toApiError } from '@/lib/api-error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Reintentar un 403 o un 404 no cambia el resultado y retrasa el aviso
      retry: (intentos, error) => {
        const fallo = error instanceof ApiError ? error : toApiError(error)
        return fallo.isRetryable && intentos < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
})
