// Solo se activa si se abre index.html en un navegador (sin Electron), para ver el diseño.
// Parámetros: ?sin-cuenta  ?error  ?cerrado
if (!window.launcher) {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  const oyentes = { progreso: [], juego: [], perfil: [] }
  const emitir = (canal, datos) => oyentes[canal].forEach((f) => f(datos))
  const params = new URLSearchParams(location.search)
  let cuenta = params.has('sin-cuenta') ? null : { tipo: 'microsoft', nombre: 'Steve', uuid: '8667ba71b85a4004af54457a9734eed7' }

  const perfil = {
    minecraft: '1.21.1',
    loader: { tipo: 'fabric', version: '0.19.5' },
    servidor: { ip: 'Rataland-8RN6.aternos.me', puerto: 47702 },
    noticias: [
      { fecha: '2026-10-05', titulo: 'Empieza la temporada', texto: 'El mundo nuevo abre hoy a las 18:00. Pulsa Jugar y el launcher te mete directo al servidor.' },
      { fecha: '2026-10-02', titulo: 'Nuevos mods de decoración', texto: 'Hemos añadido muebles y más bloques de construcción. Se descargan solos al abrir el juego.' },
      { fecha: '2026-09-28', titulo: 'Normas de la serie', texto: 'Nada de granjas de lag ni robos entre bases. Las normas completas están en Discord.' }
    ]
  }

  window.launcher = {
    inicio: async () => ({
      launcher: { nombre: 'RataLand', version: '1.0.0', cuentas: { microsoft: true, noPremium: true }, enlaces: ['discord', 'web'], apariencia: { logo: 'assets/logo.png', fondo: 'assets/fondo.png' } },
      cuenta,
      ajustes: { ram: 4096, cerrarAlJugar: false },
      sistema: { ramTotalMB: 16384 },
      perfil: { ...perfil, noticias: [] }
    }),
    buscarActualizaciones: async () => { await espera(400); return { ok: true, origen: 'red', perfil } },
    estadoServidor: async () => {
      await espera(700)
      return params.has('cerrado') ? { enLinea: false } : { enLinea: true, jugadores: 23, maximo: 60 }
    },
    loginMicrosoft: async () => {
      await espera(800)
      cuenta = { tipo: 'microsoft', nombre: 'Steve', uuid: '8667ba71b85a4004af54457a9734eed7' }
      return { ok: true, cuenta }
    },
    loginSinPremium: async (nombre) => /^[A-Za-z0-9_]{3,16}$/.test(nombre)
      ? { ok: true, cuenta: (cuenta = { tipo: 'sinPremium', nombre, uuid: '0' }) }
      : { ok: false, error: 'El nombre debe tener entre 3 y 16 letras, números o guiones bajos.' },
    cerrarSesion: async () => { cuenta = null },
    guardarAjustes: async (a) => ({ ram: 4096, cerrarAlJugar: false, ...a }),
    jugar: async () => {
      if (params.has('error')) {
        await espera(900)
        return { ok: false, error: 'No se pudo descargar la lista de mods (El servidor respondió 404). Revisa tu conexión a internet.' }
      }
      ;(async () => {
        const etapas = [['Descargando Minecraft 1.21.1', 40], ['Descargando Java 21', 20], ['Instalando Fabric 0.19.5', 10], ['Descargando mods (12 de 40)', 30]]
        for (const [texto, pasos] of etapas) {
          for (let i = 0; i <= pasos; i++) {
            emitir('progreso', { texto, actual: i, total: pasos })
            await espera(70)
          }
        }
        emitir('juego', { estado: 'iniciando' })
        await espera(1500)
        emitir('juego', { estado: 'abierto' })
        await espera(2500)
        emitir('juego', { estado: 'cerrado', error: null })
      })()
      return { ok: true }
    },
    ventana () {},
    abrirEnlace () {},
    abrirRegistros () {},
    instalarActualizacion () {},
    alActualizacionLauncher: (f) => { if (params.has('actualizacion')) setTimeout(() => f({ estado: 'lista', version: '1.0.1' }), 1500) },
    alProgreso: (f) => oyentes.progreso.push(f),
    alJuego: (f) => oyentes.juego.push(f),
    alPerfil: (f) => oyentes.perfil.push(f)
  }
}
