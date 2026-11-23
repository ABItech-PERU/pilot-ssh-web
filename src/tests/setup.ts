import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'

// Cada prueba construye su mundo: el localStorage de la anterior falsearia
// el estado de sesion de la siguiente
afterEach(() => {
  window.localStorage.clear()
})

// jsdom no trae estas APIs del navegador y los componentes de Radix las usan
// para medir y para el puntero. Basta con que existan
class ResizeObserverDePrueba {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverDePrueba
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
