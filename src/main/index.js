const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, Notification, clipboard } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { execFile } = require('child_process')

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'launcher.config.json'), 'utf8'))

// Todo (juego, mods, Java, datos del launcher) vive en %APPDATA%\<carpeta>, oculta en Windows.
const raiz = path.join(app.getPath('appData'), config.carpeta)
const dirDatos = path.join(raiz, '.launcher')
app.setPath('userData', path.join(dirDatos, 'electron'))
app.setName(config.nombre)
// Hace que Windows agrupe la ventana con el acceso directo y use su icono en la barra de tareas.
if (process.platform === 'win32') app.setAppUserModelId('com.rataland.launcher')

const { leerJson, escribirJson } = require('./util')
const { obtenerManifiesto, combinarPerfil } = require('./manifiesto')
const { prepararJuego } = require('./minecraft')
const { sincronizar } = require('./sincronizar')
const { prepararPrimerArranque, escribirConfigMenu, activarPacks, prepararNeoForge } = require('./extras')
const { lanzarJuego } = require('./juego')
const { consultarServidor, direccionDeJuego } = require('./servidor')
const { crearCuentas } = require('./cuentas')
const { crearSkins } = require('./skins')
const { crearActualizador } = require('./actualizador')

const cuentas = crearCuentas(dirDatos)
const skins = crearSkins(cuentas, { raiz, dirDatos, agente: `RataLand-Launcher/${app.getVersion()}` })
const ramTotalMB = Math.floor(os.totalmem() / 1048576)
const rutaAjustes = path.join(dirDatos, 'ajustes.json')
let ajustes
let perfil = combinarPerfil(config, {})
let perfilGenerado = '' // fecha del modpack que se está enseñando
let ventana = null
let jugando = false
let actualizador = null
let bandeja = null
let saliendo = false

const AL_JUGAR = ['segundoPlano', 'cerrar', 'abierto']
const AL_CERRAR = ['preguntar', 'cerrar', 'segundoPlano']

function ajustesPorDefecto () {
  const ram = Math.max(2048, Math.min(config.ramPredeterminada || 4096, ramTotalMB - 2048))
  return { ram, alJugar: 'segundoPlano', alCerrar: 'preguntar', sonido: 40 }
}

/** Ajustes guardados, pasando el antiguo "cerrarAlJugar" a la opción nueva. */
function leerAjustes (guardados) {
  const a = { ...ajustesPorDefecto(), ...guardados }
  if (guardados.cerrarAlJugar === true && !guardados.alJugar) a.alJugar = 'cerrar'
  delete a.cerrarAlJugar
  if (!AL_JUGAR.includes(a.alJugar)) a.alJugar = 'segundoPlano'
  if (!AL_CERRAR.includes(a.alCerrar)) a.alCerrar = 'preguntar'
  return a
}

/* ---------- Segundo plano: la ventana se oculta y queda un icono junto al reloj ---------- */

function pasarASegundoPlano () {
  ventana?.hide()
  if (!bandeja) {
    const icono = nativeImage.createFromPath(path.join(__dirname, '..', 'renderer', 'assets', 'icono.png')).resize({ width: 16, height: 16 })
    bandeja = new Tray(icono)
    bandeja.on('click', mostrarVentana)
  }
  bandeja.setToolTip(jugando ? `${config.nombre}: Minecraft está abierto` : `${config.nombre} sigue abierto en segundo plano`)
  const actualizacion = actualizador?.estado()
  const lista = actualizacion?.fase === 'lista'
  bandeja.setContextMenu(Menu.buildFromTemplate([
    { label: `Abrir ${config.nombre}`, click: mostrarVentana },
    ...(lista
      ? [jugando
          ? { label: `Versión ${actualizacion.version} lista: se instalará al cerrar Minecraft`, enabled: false }
          : { label: `Actualizar a la versión ${actualizacion.version}`, click: () => { mostrarVentana(); actualizador.instalar() } }]
      : []),
    { type: 'separator' },
    { label: `Cerrar ${config.nombre}`, click: cerrarDelTodo }
  ]))
}

/** Hay una versión nueva del launcher descargada: si no se está viendo el launcher, aviso de Windows. */
function avisarActualizacionLista (version) {
  if (bandeja) pasarASegundoPlano() // pone "Actualizar" en el menú del icono
  const aLaVista = ventana && !ventana.isDestroyed() && ventana.isVisible() && !ventana.isMinimized() && ventana.isFocused()
  if ((aLaVista && !jugando) || !Notification.isSupported()) return
  const aviso = new Notification({
    title: `Actualización de ${config.nombre} lista`,
    body: jugando
      ? `La versión ${version} se instalará sola cuando cierres Minecraft.`
      : `Abre el launcher para instalar la versión ${version}.`,
    icon: nativeImage.createFromPath(path.join(__dirname, '..', 'renderer', 'assets', 'icono.png'))
  })
  aviso.on('click', mostrarVentana)
  aviso.show()
}

function mostrarVentana () {
  if (!ventana || ventana.isDestroyed()) return
  if (ventana.isMinimized()) ventana.restore()
  ventana.show()
  ventana.focus()
  bandeja?.destroy()
  bandeja = null
}

/** Cierra el launcher de verdad (si Minecraft está abierto, sigue abierto). */
function cerrarDelTodo () {
  saliendo = true
  bandeja?.destroy()
  bandeja = null
  app.quit()
}

function enviar (canal, datos) {
  if (ventana && !ventana.isDestroyed()) ventana.webContents.send(canal, datos)
}

const ERRORES_ARCHIVOS = {
  MissingLibraries: 'Faltan archivos del juego.',
  CorruptedVersionJar: 'El archivo principal del juego está dañado.',
  MissingVersionJson: 'Falta la instalación de esta versión.',
  BadVersionJson: 'La instalación de esta versión está dañada.'
}

function mensajeError (e) {
  if (e instanceof Error) return e.message
  if (e && typeof e.error === 'string') return ERRORES_ARCHIVOS[e.error] || `Error del juego: ${e.error}`
  return String(e)
}

async function jugar (reparar) {
  if (jugando) return { ok: false, error: 'Minecraft ya está abierto.' }
  jugando = true
  const reportar = (p) => enviar('progreso', p)

  try {
    reportar({ etapa: 'cuenta', texto: 'Comprobando tu cuenta', actual: 0, total: 0 })
    const sesion = await cuentas.sesionParaJugar()

    reportar({ etapa: 'actualizaciones', texto: 'Buscando actualizaciones', actual: 0, total: 0 })
    const { manifiesto } = await obtenerManifiesto(config, dirDatos)
    perfil = combinarPerfil(config, manifiesto)
    perfilGenerado = manifiesto.generado || perfilGenerado
    enviar('perfil', perfil)

    let instalacion = await prepararJuego(perfil, raiz, { reportar, reparar })
    const resumen = await sincronizar(manifiesto, raiz, { reportar, reparar })
    enviar('sincronizacion', resumen)
    // Dirección real del servidor ahora mismo (en Aternos el puerto cambia al reiniciarlo)
    const servidor = perfil.servidor?.ip
      ? { ...perfil.servidor, ...await direccionDeJuego(perfil.servidor.ip, Number(perfil.servidor.puerto) || 25565) }
      : perfil.servidor
    await prepararPrimerArranque(raiz, { nombre: config.nombre, ...perfil.servidor })
    if (perfil.loader?.tipo === 'neoforge') await prepararNeoForge(raiz)
    // Tu skin, para el personaje del menú del juego (premium o la que pondrá SkinRestorer)
    const skinJuego = await skins.actual().catch(() => null)
    await escribirConfigMenu(raiz, {
      nombre: config.nombre,
      ...perfil.servidor,
      destino: servidor?.ip ? `${servidor.ip}:${servidor.puerto}` : '',
      discord: perfil.enlaces?.discord,
      escena: perfil.escena,
      sonido: perfil.sonidoFondo,
      temporada: perfil.temporada,
      frases: perfil.frases,
      evento: perfil.evento,
      skinModelo: skinJuego?.modelo
    })
    const pngPersonaje = path.join(raiz, 'config', 'rataland-personaje.png')
    if (skinJuego?.ok && skinJuego.imagen) await fs.promises.writeFile(pngPersonaje, Buffer.from(skinJuego.imagen.split(',')[1], 'base64'))
    else await fs.promises.rm(pngPersonaje, { force: true })
    await activarPacks(raiz, manifiesto.packsActivos)

    const lanzar = () => {
      reportar({ etapa: 'iniciando', texto: 'Abriendo Minecraft', actual: 0, total: 0 })
      return lanzarJuego({
        raiz,
        instalacion,
        sesion,
        ramMB: ajustes.ram,
        servidor,
        launcher: { nombre: config.nombre, version: app.getVersion() }
      }, {
        listo: () => {
          enviar('juego', { estado: 'abierto' })
          if (ajustes.alJugar === 'cerrar') cerrarDelTodo()
          else if (ajustes.alJugar === 'segundoPlano') pasarASegundoPlano()
        },
        salida: ({ error }) => {
          jugando = false
          if (ventana && !ventana.isDestroyed() && !ventana.isVisible()) mostrarVentana()
          enviar('juego', { estado: 'cerrado', error })
          // Si hay una versión nueva del launcher, ahora que no se juega se instala (salvo que haya
          // que leer un error del juego: entonces se ofrece con el botón).
          if (!error) actualizador.alTerminarJuego()
        }
      })
    }

    try {
      await lanzar()
    } catch (e) {
      // Si al arrancar faltan archivos, se repara una vez automáticamente.
      if (reparar || !(e && ERRORES_ARCHIVOS[e.error])) throw e
      instalacion = await prepararJuego(perfil, raiz, { reportar, reparar: true })
      await lanzar()
    }
    enviar('juego', { estado: 'iniciando' })
    return { ok: true }
  } catch (e) {
    jugando = false
    console.error(e)
    return { ok: false, error: mensajeError(e) }
  }
}

function registrarIpc () {
  ipcMain.handle('inicio', async () => ({
    launcher: {
      nombre: config.nombre,
      version: app.getVersion(),
      cuentas: config.cuentas,
      apariencia: config.apariencia || {}
    },
    cuenta: await cuentas.actual(),
    ajustes,
    sistema: { ramTotalMB },
    perfil,
    actualizacion: actualizador.estado()
  }))

  ipcMain.handle('actualizaciones', async (_e, opciones) => {
    try {
      const { manifiesto, origen } = await obtenerManifiesto(config, dirDatos, { rapido: Boolean(opciones?.rapido) })
      // Nunca se vuelve a un modpack más antiguo que el que ya se tiene (la caché de GitHub puede dar uno viejo)
      if (manifiesto.generado && perfilGenerado && manifiesto.generado < perfilGenerado) return { ok: true, perfil, origen, sinCambios: true }
      perfil = combinarPerfil(config, manifiesto)
      perfilGenerado = manifiesto.generado || perfilGenerado
      return { ok: true, perfil, origen }
    } catch (e) {
      return { ok: false, error: mensajeError(e) }
    }
  })

  ipcMain.handle('estado-servidor', async () => {
    const { ip, puerto } = perfil.servidor || {}
    if (!ip) return { enLinea: false }
    const r = await consultarServidor(ip, Number(puerto) || 25565)
    if (!r.enLinea) {
      // Registro para poder ver por qué el launcher creyó que el servidor estaba apagado.
      const linea = `${new Date().toISOString()} ${ip}:${puerto} ${r.apagado ? 'apagado según el host' : r.encendiendo ? 'encendiéndose' : r.motivo}\n`
      fs.appendFile(path.join(dirDatos, 'servidor.log'), linea, () => {})
    }
    return r
  })

  ipcMain.handle('login-microsoft', () => cuentas.loginMicrosoft(ventana))
  let enlaceLogin = null
  ipcMain.handle('login-navegador', () => cuentas.loginNavegador((datos) => {
    // Se abre la página de Microsoft en el navegador del jugador, con el código ya puesto y copiado
    enlaceLogin = datos.enlace
    clipboard.writeText(datos.codigo)
    shell.openExternal(datos.enlace)
    enviar('codigo-login', { codigo: datos.codigo, pagina: datos.pagina })
  }))
  ipcMain.on('abrir-login-navegador', () => { if (enlaceLogin) shell.openExternal(enlaceLogin) })
  ipcMain.on('cancelar-login', () => cuentas.cancelarLogin())
  ipcMain.on('copiar', (_e, texto) => { if (typeof texto === 'string') clipboard.writeText(texto.slice(0, 200)) })
  ipcMain.handle('login-sin-premium', (_e, nombre) => config.cuentas?.noPremium
    ? cuentas.loginSinPremium(nombre)
    : { ok: false, error: 'Este servidor solo admite cuentas de Microsoft.' })
  ipcMain.handle('cerrar-sesion', () => cuentas.cerrarSesion())
  ipcMain.handle('skin-actual', () => skins.actual())
  ipcMain.handle('cambiar-skin', (_e, cambio) => skins.cambiar({
    datos: cambio?.datos instanceof Uint8Array ? cambio.datos : null,
    modelo: cambio?.modelo
  }))
  ipcMain.handle('quitar-skin', () => skins.quitar())

  ipcMain.handle('guardar-ajustes', async (_e, nuevos) => {
    const ram = Math.round(Number(nuevos?.ram))
    if (Number.isFinite(ram)) ajustes.ram = Math.max(1024, Math.min(ram, ramTotalMB))
    if (AL_JUGAR.includes(nuevos?.alJugar)) ajustes.alJugar = nuevos.alJugar
    if (AL_CERRAR.includes(nuevos?.alCerrar)) ajustes.alCerrar = nuevos.alCerrar
    const sonido = Math.round(Number(nuevos?.sonido))
    if (Number.isFinite(sonido)) ajustes.sonido = Math.max(0, Math.min(100, sonido))
    await escribirJson(rutaAjustes, ajustes)
    return ajustes
  })

  ipcMain.handle('jugar', (_e, opciones) => jugar(Boolean(opciones?.reparar)))

  // Sonidos ambiente de los fondos (la ventana no puede leer archivos por su cuenta)
  ipcMain.handle('leer-sonido', (_e, nombre) => {
    if (typeof nombre !== 'string' || !/^[a-z0-9-]+$/.test(nombre)) throw new Error('Nombre de sonido no válido.')
    return fs.promises.readFile(path.join(__dirname, '..', 'renderer', 'assets', 'sonidos', `${nombre}.ogg`))
  })

  ipcMain.on('ventana', (_e, accion) => {
    if (accion === 'minimizar') ventana?.minimize()
    if (accion === 'cerrar') cerrarDelTodo()
    if (accion === 'segundo-plano') pasarASegundoPlano()
  })
  ipcMain.on('abrir-episodio', () => {
    const url = perfil.episodio?.url
    if (perfil.episodio?.id) shell.openExternal(url)
  })
  ipcMain.on('abrir-enlace', (_e, clave) => {
    const url = perfil.enlaces?.[clave]
    if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url)
  })
  ipcMain.on('abrir-registros', () => {
    const dir = path.join(raiz, 'logs')
    fs.mkdirSync(dir, { recursive: true })
    shell.openPath(dir)
  })
}

function crearVentana () {
  ventana = new BrowserWindow({
    width: 1100,
    height: 680,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    title: config.nombre,
    backgroundColor: '#0d1424',
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'icono.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  ventana.webContents.on('will-navigate', (e) => e.preventDefault())
  if (!app.isPackaged) {
    ventana.webContents.on('console-message', (e, nivel, mensaje) => {
      console.log('[interfaz]', e?.message ?? mensaje)
    })
  }
  ventana.once('ready-to-show', () => ventana.show())
  ventana.on('focus', () => actualizador?.comprobar())
  // La X de la ventana (o Alt+F4) no cierra sin más: la interfaz pregunta o hace lo elegido en Ajustes.
  ventana.on('close', (e) => {
    // Si la interfaz se colgó, nadie contestaría: se deja cerrar.
    if (saliendo || ventana.webContents.isCrashed()) return
    e.preventDefault()
    enviar('pedir-cierre')
  })
  ventana.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
}

async function prepararCarpeta () {
  const nueva = !fs.existsSync(raiz)
  fs.mkdirSync(dirDatos, { recursive: true })
  if (nueva && process.platform === 'win32') execFile('attrib', ['+h', raiz], () => {})
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', mostrarVentana)
  app.on('before-quit', () => { saliendo = true })

  app.whenReady().then(async () => {
    await prepararCarpeta()
    ajustes = leerAjustes(await leerJson(rutaAjustes, {}))
    Menu.setApplicationMenu(null)
    actualizador = crearActualizador({ enviar, dirDatos, estaJugando: () => jugando, paginaDescarga: config.paginaDescarga, alLista: avisarActualizacionLista })
    registrarIpc()
    crearVentana()
    actualizador.iniciar()
  })

  app.on('window-all-closed', () => {
    // Si el juego está abierto con la ventana oculta, el launcher sigue vivo para volver a mostrarse.
    if (!jugando) app.quit()
  })
}
