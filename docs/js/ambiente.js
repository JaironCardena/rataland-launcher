'use strict'
// Sonido ambiente de los fondos (launcher y panel). Como en los juegos:
//   - una base de 60 s (agua, viento…) que se repite en bucle exacto (Web Audio, sin huecos);
//   - sonidos sueltos (grillos, gotas, pájaros…) a ratos al azar, con volumen y tono variables.
// Qué suena en cada fondo lo dice window.AMBIENTES (lo genera tools/sonidos.js, igual que los sonidos).
// El juego hace lo mismo en AmbienteFondo.java. Este archivo se copia a docs/js/ con tools/sonidos.js.
;(function () {
  const MAXIMO = 0.6 // el 100 % del deslizador: que no tape la voz de nadie en Discord
  // La frecuencia de los sonidos (tools/sonidos.js): si el contexto usara otra, el navegador los
  // remuestrearía al decodificarlos y el empalme del bucle dejaría de ser exacto.
  const FRECUENCIA = 22050

  /**
   * `cargar(nombre)` devuelve los bytes de `${nombre}.ogg` (en el launcher, por el proceso principal;
   * en el panel, con fetch). `datos` es window.AMBIENTES.
   */
  function crearAmbiente ({ cargar, datos }) {
    let ctx = null
    let maestro = null
    let escena = null
    let volumen = 0.4
    let activo = true
    let sonando = null
    let dormir = null
    const buffers = new Map()

    const nivel = () => (activo && escena ? volumen * MAXIMO : 0)
    const azar = ([a, b]) => a + Math.random() * (b - a)

    function contexto () {
      if (!ctx) {
        try { ctx = new AudioContext({ sampleRate: FRECUENCIA }) } catch { ctx = new AudioContext() }
        maestro = ctx.createGain()
        maestro.gain.value = 0
        maestro.connect(ctx.destination)
      }
      return ctx
    }

    function buffer (nombre) {
      if (!buffers.has(nombre)) {
        buffers.set(nombre, Promise.resolve(cargar(nombre)).then((bytes) => contexto().decodeAudioData(bytes)).catch((e) => {
          buffers.delete(nombre)
          throw e
        }))
      }
      return buffers.get(nombre)
    }

    function rampa (param, valor, segundos) {
      const ahora = ctx.currentTime
      param.cancelScheduledValues(ahora)
      param.setValueAtTime(param.value, ahora)
      param.linearRampToValueAtTime(valor, ahora + segundos)
    }

    function tocar (buf, vol, tono, destino) {
      const fuente = ctx.createBufferSource()
      fuente.buffer = buf
      fuente.playbackRate.value = tono
      const g = ctx.createGain()
      g.gain.value = vol
      fuente.connect(g).connect(destino)
      fuente.start()
    }

    /** Cada suelto vuelve a sonar al cabo de un rato al azar (la primera vez, antes). */
    function programar (s, i, primero) {
      const suelto = s.def.sueltos[i]
      const espera = primero ? Math.random() * suelto.cada[1] : azar(suelto.cada)
      s.temporizadores[i] = setTimeout(async () => {
        if (!s.vivo) return
        if (nivel() > 0) {
          const version = 1 + Math.floor(Math.random() * (datos.grupos[suelto.grupo] || 1))
          try {
            const buf = await buffer(`${suelto.grupo}-${version}`)
            if (s.vivo) tocar(buf, azar(suelto.volumen), azar(suelto.tono), s.salida)
          } catch { /* sin ese sonido, sigue lo demás */ }
        }
        programar(s, i, false)
      }, espera * 1000)
    }

    function empezar (clave) {
      const def = datos && datos.escenas && datos.escenas[clave]
      if (!def) return
      contexto()
      const salida = ctx.createGain()
      salida.gain.value = 0
      salida.connect(maestro)
      const s = { clave, def, salida, fuente: null, temporizadores: [], vivo: true }
      sonando = s
      buffer(def.base).then((buf) => {
        if (!s.vivo) return
        const fuente = ctx.createBufferSource()
        fuente.buffer = buf
        fuente.loop = true
        fuente.connect(salida)
        fuente.start()
        s.fuente = fuente
        rampa(salida.gain, 1, 2)
      }).catch(() => {})
      def.sueltos.forEach((_, i) => programar(s, i, true))
    }

    function parar () {
      const s = sonando
      if (!s) return
      sonando = null
      s.vivo = false
      s.temporizadores.forEach(clearTimeout)
      rampa(s.salida.gain, 0, 0.8)
      setTimeout(() => {
        try { if (s.fuente) s.fuente.stop() } catch { /* ya parada */ }
        s.salida.disconnect()
      }, 1000)
    }

    function aplicar () {
      const n = nivel()
      clearTimeout(dormir)
      if (n === 0) {
        // Se apaga poco a poco y luego se duerme (no gasta nada mientras juegas)
        if (ctx) {
          rampa(maestro.gain, 0, 0.6)
          dormir = setTimeout(() => { if (nivel() === 0) ctx.suspend() }, 800)
        }
        return
      }
      contexto().resume()
      if (!sonando || sonando.clave !== escena) {
        parar()
        empezar(escena)
      }
      rampa(maestro.gain, n, 0.6)
    }

    return {
      /** Fondo actual (null = sin sonido). */
      escena (nueva) {
        if (nueva === escena) return
        escena = nueva
        if (!escena) parar()
        aplicar()
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
        if (nivel() === 0 || !ctx) return
        buffer(nombre).then((buf) => { if (nivel() > 0) tocar(buf, 1, 1, maestro) }).catch(() => {})
      }
    }
  }

  window.crearAmbiente = crearAmbiente
})()
