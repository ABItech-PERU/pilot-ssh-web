import { createContext, use, useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const CLAVE = 'pilotssh.theme'

interface ThemeContextValue {
  theme: Theme
  /** El tema efectivo, con 'system' resuelto. */
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStored(): Theme {
  try {
    const guardado = window.localStorage.getItem(CLAVE)
    if (guardado === 'light' || guardado === 'dark' || guardado === 'system') {
      return guardado
    }
  } catch {
    // Almacenamiento bloqueado: se arranca en oscuro
  }
  // Oscuro de partida: una herramienta de terminales no debe deslumbrar
  return 'dark'
}

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored)
  const [systemIsDark, setSystemIsDark] = useState(prefersDark)

  // El tema del sistema puede cambiar con la pagina abierta
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const sincronizar = (evento: MediaQueryListEvent) => setSystemIsDark(evento.matches)
    consulta.addEventListener('change', sincronizar)
    return () => consulta.removeEventListener('change', sincronizar)
  }, [])

  const resolvedTheme = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = useCallback((siguiente: Theme) => {
    setThemeState(siguiente)
    try {
      window.localStorage.setItem(CLAVE, siguiente)
    } catch {
      // Sin almacenamiento la eleccion dura lo que la pestana
    }
  }, [])

  return (
    <ThemeContext value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext>
  )
}

export function useTheme() {
  const contexto = use(ThemeContext)
  if (!contexto) throw new Error('useTheme necesita estar dentro de ThemeProvider')
  return contexto
}
