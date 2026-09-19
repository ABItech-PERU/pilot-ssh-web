import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'

// Cada prueba construye su mundo: el localStorage de la anterior falsearia
// el estado de sesion de la siguiente
afterEach(() => {
  window.localStorage.clear()
})
