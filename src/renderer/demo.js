// Solo se activa si se abre index.html en un navegador (sin Electron), para ver el diseño.
// Parámetros: ?sin-cuenta  ?error  ?cerrado  ?apagado  ?escena=cloacas|amanecer|pesca|mina  ?sin-episodio  ?al-cerrar=cerrar
//   ?panel-skin (abre el panel de la skin)  ?skin-lenta (tu skin no termina de cargar, para ver el aviso)
//   ?copiar=Nombre (con ?panel-skin: copia la skin de ese jugador)
if (!window.launcher) {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  const oyentes = { progreso: [], juego: [], perfil: [], sincronizacion: [], cierre: [], codigo: [] }
  let loginCancelado = false
  const emitir = (canal, datos) => oyentes[canal].forEach((f) => f(datos))
  const params = new URLSearchParams(location.search)
  const inicioDemo = Date.now()
  const oyentesActualizacion = []
  let actualizacion = { fase: 'nada', modo: 'arranque', versionActual: '1.0.1' }
  const emitirActualizacion = (cambios) => {
    actualizacion = { ...actualizacion, ...cambios }
    oyentesActualizacion.forEach((f) => f(actualizacion))
  }
  let ajustes = { ram: 4096, alJugar: 'segundoPlano', alCerrar: params.get('al-cerrar') || 'preguntar' }
  let cuenta = params.has('sin-cuenta') ? null
    : params.has('no-premium') ? { tipo: 'sinPremium', nombre: 'JaironEc', uuid: '0' }
      : { tipo: 'microsoft', nombre: 'Steve', uuid: '8667ba71b85a4004af54457a9734eed7' }

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

  // Skin de prueba dibujada aquí mismo (piel, ojos, camiseta del color dado y pantalón)
  const skinDePrueba = (camiseta) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64
    const x = c.getContext('2d')
    const caja = (color, ...r) => { x.fillStyle = color; x.fillRect(...r) }
    caja('#c8956d', 8, 8, 8, 8); caja('#3b2a1f', 8, 8, 8, 2); caja('#fff', 9, 12, 2, 1); caja('#fff', 13, 12, 2, 1); caja('#3a5cc5', 10, 12, 1, 1); caja('#3a5cc5', 14, 12, 1, 1)
    caja(camiseta, 20, 20, 8, 12); caja('#c8956d', 44, 20, 4, 12); caja(camiseta, 44, 20, 4, 4); caja('#c8956d', 36, 52, 4, 12); caja(camiseta, 36, 52, 4, 4)
    caja('#2c3e8c', 4, 20, 4, 12); caja('#2c3e8c', 20, 52, 4, 12); caja('#333', 4, 29, 4, 3); caja('#333', 20, 61, 4, 3)
    return c.toDataURL()
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
    // ?novedad: al cabo de un rato aparece una noticia nueva (para ver que se refresca sola)
    buscarActualizaciones: async () => {
      await espera(400)
      if (params.has('novedad') && Date.now() - inicioDemo > 3000 && !perfil.noticias.some((n) => n.titulo === 'Noticia nueva')) {
        perfil.noticias = [{ fecha: '2026-10-07', titulo: 'Noticia nueva', texto: 'Esta noticia apareció sin cerrar el launcher.' }, ...perfil.noticias]
      }
      return { ok: true, origen: 'red', perfil: JSON.parse(JSON.stringify(perfil)) }
    },
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
    loginNavegador: async () => {
      loginCancelado = false
      await espera(400)
      emitir('codigo', { codigo: 'RQ7KM2XD', pagina: 'https://www.microsoft.com/link' })
      for (let i = 0; i < 40; i++) { await espera(100); if (loginCancelado) return { ok: false, cancelado: true } }
      if (params.has('login-error')) return { ok: false, error: 'Esa cuenta no tiene Minecraft: Java Edition.' }
      cuenta = { tipo: 'microsoft', nombre: 'Steve', uuid: '8667ba71b85a4004af54457a9734eed7' }
      return { ok: true, cuenta }
    },
    abrirLoginNavegador () {},
    cancelarLogin () { loginCancelado = true },
    alCodigoLogin: (f) => oyentes.codigo.push(f),
    loginSinPremium: async (nombre) => /^[A-Za-z0-9_]{3,16}$/.test(nombre)
      ? { ok: true, cuenta: (cuenta = { tipo: 'sinPremium', nombre, uuid: '0' }) }
      : { ok: false, error: 'El nombre debe tener entre 3 y 16 letras, números o guiones bajos.' },
    cerrarSesion: async () => { cuenta = null },
    skinActual: async () => {
      await espera(params.has('skin-lenta') ? 600000 : 500)
      if (params.has('sin-skin')) return { ok: true, imagen: null, modelo: 'classic' }
      return { ok: true, imagen: skinDePrueba('#f6c445'), modelo: 'classic', ...(cuenta?.tipo === 'sinPremium' ? { sinPremium: true, estado: 'puesta' } : {}) }
    },
    cambiarSkin: async (datos, modelo) => {
      await espera(700)
      if (params.has('skin-error')) return { ok: false, error: 'Has hecho muchos cambios seguidos. Espera un minuto y vuelve a probar.' }
      const imagen = datos ? await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(new Blob([datos], { type: 'image/png' })) }) : (await window.launcher.skinActual()).imagen
      return { ok: true, imagen, modelo, ...(cuenta?.tipo === 'sinPremium' ? { sinPremium: true, estado: 'pendiente' } : {}) }
    },
    quitarSkin: async () => { await espera(500); return { ok: true, imagen: null, modelo: 'classic' } },
    // Copiar la skin de un jugador: una de prueba con la camiseta verde ("nadie" no existe)
    skinDeJugador: async (nombre) => {
      await espera(1200)
      if (!/^[A-Za-z0-9_]{3,16}$/.test(nombre)) return { ok: false, error: 'Ese nombre no vale: tiene que tener de 3 a 16 letras, números o _.' }
      if (/nadie/i.test(nombre)) return { ok: false, error: `No hay ninguna cuenta premium que se llame ${nombre}.` }
      const imagen = skinDePrueba('#5ea83a')
      return { ok: true, nombre, imagen, datos: Uint8Array.from(atob(imagen.split(',')[1]), (c) => c.charCodeAt(0)), modelo: 'classic' }
    },
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
    copiar (texto) { console.log('copiado:', texto) },
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
  if (params.has('panel-skin')) {
    window.addEventListener('load', () => setTimeout(() => document.querySelector('.rail [data-accion="abrir-skin"]')?.click(), 1500))
    if (params.has('copiar')) {
      window.addEventListener('load', () => setTimeout(() => {
        const formulario = document.querySelector('[data-skin-jugador]')
        formulario.nombre.value = params.get('copiar')
        formulario.requestSubmit()
      }, 2600))
    }
  }
}
