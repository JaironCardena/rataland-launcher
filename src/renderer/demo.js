// Solo se activa si se abre index.html en un navegador (sin Electron), para ver el diseño.
// Parámetros: ?sin-cuenta  ?error  ?cerrado  ?apagado  ?escena=cloacas|amanecer  ?sin-episodio  ?al-cerrar=cerrar
if (!window.launcher) {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  const oyentes = { progreso: [], juego: [], perfil: [], sincronizacion: [], cierre: [] }
  const emitir = (canal, datos) => oyentes[canal].forEach((f) => f(datos))
  const params = new URLSearchParams(location.search)
  const oyentesActualizacion = []
  let actualizacion = { fase: 'nada', modo: 'arranque', versionActual: '1.0.1' }
  const emitirActualizacion = (cambios) => {
    actualizacion = { ...actualizacion, ...cambios }
    oyentesActualizacion.forEach((f) => f(actualizacion))
  }
  let ajustes = { ram: 4096, alJugar: 'segundoPlano', alCerrar: params.get('al-cerrar') || 'preguntar' }
  let cuenta = params.has('sin-cuenta') ? null : { tipo: 'microsoft', nombre: 'Steve', uuid: '8667ba71b85a4004af54457a9734eed7' }

  const perfil = {
    minecraft: '1.21.1',
    loader: { tipo: 'fabric', version: '0.19.5' },
    servidor: { ip: 'Rataland-8RN6.aternos.me', puerto: 25565 },
    temporada: 'Temporada 1',
    escena: params.get('escena') || 'noche',
    episodio: params.has('sin-episodio') ? null : { titulo: 'RataLand 1x01: La primera noche', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', id: 'jNQXAC9IVRw' },
    enlaces: { discord: 'https://discord.gg/ejemplo', web: '' },
    evento: params.has('sin-evento') ? null : { titulo: 'Episodio 2', fecha: new Date(Date.now() + (params.has('empezado') ? -60000 : 2 * 86400000 + 4 * 3600000 + 754000)).toISOString(), duracionHoras: 3 },
    noticias: [
      { fecha: '2026-10-05', titulo: 'Empieza la temporada', texto: 'El mundo nuevo abre hoy a las 18:00. Pulsa Jugar y el launcher te mete directo al servidor.' },
      { fecha: '2026-10-02', titulo: 'Nuevos mods de decoración', texto: 'Hemos añadido muebles y más bloques de construcción. Se descargan solos al abrir el juego.' },
      { fecha: '2026-09-28', titulo: 'Normas de la serie', texto: 'Nada de granjas de lag ni robos entre bases. Las normas completas están en Discord.' }
    ]
  }

  window.launcher = {
    inicio: async () => ({
      launcher: { nombre: 'RataLand', version: '1.0.0', cuentas: { microsoft: true, noPremium: true }, apariencia: { logo: 'assets/logo.png', fondo: 'assets/fondo.png' } },
      cuenta,
      ajustes,
      sistema: { ramTotalMB: 16384 },
      perfil: { ...perfil, noticias: [] },
      actualizacion: { ...actualizacion, recienActualizado: params.has('actualizado') ? '1.0.2' : null }
    }),
    buscarActualizaciones: async () => { await espera(400); return { ok: true, origen: 'red', perfil } },
    estadoServidor: async () => {
      await espera(700)
      if (params.has('cerrado')) return { enLinea: false, motivo: 'sin respuesta' }
      if (params.has('apagado')) return { enLinea: false, apagado: true }
      if (params.has('encendiendo')) return { enLinea: false, encendiendo: true }
      return { enLinea: true, jugadores: 3, maximo: 20, lista: [{ nombre: 'Notch' }, { nombre: 'jeb_' }, { nombre: 'Dinnerbone' }] }
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
    guardarAjustes: async (a) => (ajustes = { ...ajustes, ...a }),
    jugar: async () => {
      if (params.has('error')) {
        await espera(900)
        return { ok: false, error: 'No se pudo descargar la lista de mods (El servidor respondió 404). Revisa tu conexión a internet.' }
      }
      ;(async () => {
        const etapas = [['Descargando Minecraft 1.21.1', 30], ['Instalando Fabric 0.19.5', 8], ['Comprobando mods (40 de 40)', 10], ['Actualizando RataLand (1 de 3)', 10], ['Actualizando Sodium (2 de 3)', 10], ['Añadiendo Iris (3 de 3)', 10]]
        for (const [texto, pasos] of etapas) {
          for (let i = 0; i <= pasos; i++) {
            emitir('progreso', { texto, actual: i, total: pasos })
            await espera(60)
          }
        }
        emitir('progreso', { texto: 'Quitando JourneyMap', actual: 0, total: 0 })
        await espera(600)
        emitir('sincronizacion', { anadidos: ['Iris'], actualizados: ['RataLand', 'Sodium'], reparados: [], quitados: ['JourneyMap'], total: 40 })
        emitir('juego', { estado: 'iniciando' })
        await espera(1500)
        emitir('juego', { estado: 'abierto' })
        await espera(2500)
        emitir('juego', { estado: 'cerrado', error: null })
      })()
      return { ok: true }
    },
    ventana (accion) { console.log('ventana:', accion) },
    abrirEnlace () {},
    abrirEpisodio () {},
    abrirRegistros () {},
    instalarActualizacion () {},
    abrirDescargaLauncher () {},
    seguirSinActualizar () { emitirActualizacion({ fase: 'lista', modo: 'fondo' }) },
    // ?actualizacion (aviso abajo), ?actualizando (al abrir), ?actualizacion-error
    alActualizacionLauncher: (f) => {
      oyentesActualizacion.push(f)
      if (params.has('actualizacion')) setTimeout(() => emitirActualizacion({ fase: 'lista', modo: 'fondo', version: '1.0.2' }), 1500)
      if (params.has('actualizando') || params.has('actualizacion-error')) {
        ;(async () => {
          await espera(500)
          for (let p = 0; p <= 100; p += 5) {
            emitirActualizacion({ fase: 'descargando', modo: 'arranque', version: '1.0.2', porcentaje: p })
            await espera(90)
          }
          emitirActualizacion({ fase: 'instalando' })
          if (params.has('actualizacion-error')) {
            await espera(2500)
            emitirActualizacion({ fase: 'error', mensaje: 'Windows no dejó abrir el instalador de la actualización.' })
          }
        })()
      }
    },
    alProgreso: (f) => oyentes.progreso.push(f),
    alJuego: (f) => oyentes.juego.push(f),
    alPerfil: (f) => oyentes.perfil.push(f),
    alSincronizacion: (f) => oyentes.sincronizacion.push(f),
    alPedirCierre: (f) => oyentes.cierre.push(f)
  }
}
