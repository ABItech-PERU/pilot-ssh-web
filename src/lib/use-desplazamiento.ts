import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Al cambiar de página, arriba; con ancla (`/#seccion`), a esa sección. */
export function useDesplazamientoAlNavegar() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
}
