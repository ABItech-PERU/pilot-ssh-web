// Aplica el tema antes del primer pintado: sin parpadeo claro-oscuro al
// montar React
;(function () {
  try {
    var elegido = localStorage.getItem('pilotssh.theme')
    var oscuro =
      elegido === 'dark' ||
      (elegido !== 'light' &&
        (elegido !== 'system' ||
          window.matchMedia('(prefers-color-scheme: dark)').matches))
    document.documentElement.classList.toggle('dark', oscuro)
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light'
  } catch (error) {
    document.documentElement.classList.add('dark')
  }
})()
