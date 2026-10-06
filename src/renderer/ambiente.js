'use strict'
// Sonido ambiente del fondo en el launcher (grillos y agua, goteo en las cloacas…).
// El bucle se repite sin cortes: dos reproductores se relevan con un fundido al acercarse el final.
// Los sonidos los genera tools/sonidos.js y son los mismos que suenan en los menús del juego.
;(function () {
  const RELEVO = 1.2 // segundos de fundido entre una vuelta y la siguiente
  const MAXIMO = 0.6 // el 100 % del deslizador: que no tape la voz de nadie en Discord

  function crearAmbiente (ruta) {
    let escena = null
    let volumen = 0.4
    let activo = true
    let actual = null
    let vigilante = null

    const nivel = () => (activo && escena ? volumen * MAXIMO : 0)
    const reproductor = (nombre) => {
      const audio = new Audio(`${ruta}${nombre}.ogg`)
      audio.volume = 0
      return audio
    }

    /** Cambia el volumen poco a poco (sin chasquidos). */
    function fundir (audio, hasta, segundos, alTerminar) {
      clearInterval(audio._fundido)
      const desde = audio.volume
      const inicio = performance.now()
      audio._fundido = setInterval(() => {
        const u = Math.min(1, (performance.now() - inicio) / (segundos * 1000))
        audio.volume = Math.max(0, Math.min(1, desde + (hasta - desde) * u))
        if (u >= 1) {
          clearInterval(audio._fundido)
          if (alTerminar) alTerminar()
        }
      }, 40)
    }

    function soltar (audio) {
      fundir(audio, 0, 0.6, () => { audio.pause(); audio.removeAttribute('src'); audio.load() })
    }

    function parar () {
      clearInterval(vigilante)
      vigilante = null
      if (actual) soltar(actual)
      actual = null
    }

    /** Arranca otra vuelta del bucle y cruza las dos. */
    function relevar () {
      const saliente = actual
      actual = reproductor(escena)
      actual.addEventListener('ended', alAcabar)
      actual.play().catch(() => {})
      fundir(actual, nivel(), saliente ? RELEVO : 1.5)
      if (saliente) fundir(saliente, 0, RELEVO, () => { saliente.pause(); saliente.removeAttribute('src'); saliente.load() })
    }

    // Por si la duración no se supo bien y la vuelta acaba antes del fundido
    function alAcabar (e) {
      if (e.target === actual) relevar()
    }

    function empezar () {
      parar()
      if (nivel() === 0) return
      relevar()
      // Antes de que acabe la vuelta, arranca la siguiente
      vigilante = setInterval(() => {
        if (actual && actual.duration && actual.duration - actual.currentTime <= RELEVO) relevar()
      }, 100)
    }

    function aplicar () {
      if (nivel() === 0) parar()
      else if (!actual) empezar()
      else fundir(actual, nivel(), 0.3)
    }

    return {
      /** Escena del fondo actual (null = sin sonido). */
      escena (nueva) {
        if (nueva === escena) return
        escena = nueva
        if (actual) empezar()
        else aplicar()
      },
      /** De 0 a 100, como el deslizador de Ajustes. */
      volumen (porcentaje) {
        volumen = Math.max(0, Math.min(100, Number(porcentaje) || 0)) / 100
        aplicar()
      },
      /** Se calla con la ventana escondida o mientras se juega. */
      activo (si) {
        if (si === activo) return
        activo = si
        aplicar()
      },
      /** Un sonido suelto de la escena, como el «plop» cuando pica el pez. */
      evento (nombre) {
        if (nivel() === 0) return
        const audio = new Audio(`${ruta}${nombre}.ogg`)
        audio.volume = Math.min(1, nivel() * 1.2)
        audio.play().catch(() => {})
      }
    }
  }

  window.crearAmbiente = crearAmbiente
})()
