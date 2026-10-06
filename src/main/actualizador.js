const { app, ipcMain, shell } = require('electron')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * Actualizaciones del propio launcher desde GitHub Releases.
 *
 * Al abrir y al cerrar Minecraft: si hay versión nueva se descarga mostrando el progreso, se
 * instala en silencio y el launcher se vuelve a abrir solo. Si aparece mientras el launcher está
 * abierto (se mira cada 15 minutos y al volver a la ventana) se descarga en segundo plano, se
 * avisa y se ofrece "Actualizar ahora"; si se está jugando, se instala al cerrar el juego.
 *
 * El instalador lo lanzamos nosotros (no con quitAndInstall) para no cerrar el launcher
 * hasta saber que Windows lo ha dejado arrancar, y para no recurrir a elevate.exe,
 * que pide permisos de administrador sin motivo: la instalación es solo para el usuario.
 */
function crearActualizador ({ enviar, dirDatos, estaJugando, paginaDescarga, alLista = () => {} }) {
  // Ojo: no leer package.json "build" aquí; electron-builder lo quita al empaquetar.
  const PAGINA_DESCARGA = paginaDescarga
  const marcaActualizado = path.join(dirDatos, 'actualizado.json')
  const registro = path.join(dirDatos, 'actualizador.log')
  const log = (nivel, mensaje) => fs.appendFile(registro, `${new Date().toISOString()} [${nivel}] ${mensaje}\n`, () => {})

  // Si venimos de instalar una actualización, se avisa una vez en la interfaz.
  let recienActualizado = null
  try {
    const { version } = JSON.parse(fs.readFileSync(marcaActualizado, 'utf8'))
    if (version === app.getVersion()) recienActualizado = version
    fs.rmSync(marcaActualizado, { force: true })
  } catch { /* no hubo actualización */ }

  // fase: nada | descargando | lista | instalando | error ; modo: arranque | fondo
  let estado = { fase: 'nada', modo: 'arranque', paginaDescarga: PAGINA_DESCARGA }
  const avisar = (cambios) => {
    estado = { ...estado, ...cambios }
    enviar('actualizacion-launcher', estado)
  }

  const api = {
    estado: () => ({ ...estado, recienActualizado, versionActual: app.getVersion() }),
    iniciar () {},
    /** Al volver a la ventana: busca si hace rato que no se mira. */
    comprobar () {},
    /** Al cerrar Minecraft: instala lo que esté listo, o busca si hay algo nuevo. */
    alTerminarJuego () {},
    instalar () {}
  }
  ipcMain.on('abrir-descarga-launcher', () => shell.openExternal(PAGINA_DESCARGA))
  ipcMain.on('seguir-sin-actualizar', () => avisar({ fase: estado.version ? 'lista' : 'nada', modo: 'fondo' }))

  if (!app.isPackaged) return api

  const { autoUpdater } = require('electron-updater')
  autoUpdater.logger = {
    info: (m) => log('info', m),
    warn: (m) => log('aviso', m),
    error: (m) => log('error', m),
    debug () {}
  }
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  function instalar () {
    const instalador = autoUpdater.installerPath
    if (!instalador || !fs.existsSync(instalador)) {
      log('error', 'no se encuentra el instalador descargado')
      return avisar({ fase: 'error', mensaje: 'No se encontró la actualización descargada.' })
    }
    avisar({ fase: 'instalando' })
    fs.writeFileSync(marcaActualizado, JSON.stringify({ version: estado.version }))

    let intentos = 0
    const intentar = () => {
      intentos++
      // /S: sin ventanas del instalador. --force-run: vuelve a abrir el launcher al terminar.
      const proceso = spawn(instalador, ['--updated', '/S', '--force-run'], { detached: true, stdio: 'ignore' })
      proceso.once('spawn', () => {
        proceso.unref()
        log('info', `instalador de la versión ${estado.version} iniciado`)
        setTimeout(() => app.exit(0), 300)
      })
      proceso.once('error', (e) => {
        log('error', `Windows no dejó abrir el instalador (intento ${intentos}, ${e.code}): ${e.message}`)
        // El antivirus puede tener bloqueado el archivo recién descargado unos segundos.
        if (intentos < 3) return setTimeout(intentar, 2000)
        fs.rmSync(marcaActualizado, { force: true })
        avisar({ fase: 'error', mensaje: 'Windows no dejó abrir el instalador de la actualización.' })
      })
    }
    // Un momento para que se vea "Instalando…" antes de que se cierre la ventana.
    setTimeout(intentar, 1200)
  }

  autoUpdater.on('update-available', (info) => avisar({ fase: 'descargando', version: info.version, porcentaje: 0 }))
  autoUpdater.on('download-progress', (p) => avisar({ fase: 'descargando', porcentaje: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => {
    avisar({ fase: 'lista', version: info.version })
    if (estado.modo === 'arranque' && !estaJugando()) instalar()
    else alLista(info.version)
  })
  autoUpdater.on('error', (e) => {
    log('error', e?.message || String(e))
    if (estado.fase === 'descargando') avisar({ fase: 'nada', modo: 'fondo' })
  })

  api.instalar = () => {
    if (estado.fase === 'lista' || estado.fase === 'error') instalar()
  }
  ipcMain.on('instalar-actualizacion', api.instalar)

  // modo "arranque": lo que se encuentre se instala enseguida (al abrir o al salir del juego).
  // modo "fondo": se descarga sin molestar y se ofrece con un botón.
  let ultimaBusqueda = 0
  function buscar (modo) {
    if (estado.fase !== 'nada') return
    ultimaBusqueda = Date.now()
    avisar({ modo })
    autoUpdater.checkForUpdates()
      .then((r) => { if (!r?.isUpdateAvailable && estado.fase === 'nada') avisar({ modo: 'fondo' }) })
      .catch(() => { if (estado.fase === 'nada') avisar({ modo: 'fondo' }) })
  }

  api.iniciar = () => {
    buscar('arranque')
    setInterval(() => buscar('fondo'), 15 * 60 * 1000)
  }
  api.comprobar = () => {
    if (Date.now() - ultimaBusqueda > 5 * 60 * 1000) buscar('fondo')
  }
  api.alTerminarJuego = () => {
    if (estado.fase === 'lista') {
      avisar({ modo: 'arranque' })
      instalar()
    } else if (estado.fase === 'descargando') {
      // Se instalará en cuanto termine de bajar, enseñando el progreso
      avisar({ modo: 'arranque' })
    } else {
      buscar('arranque')
    }
  }
  return api
}

module.exports = { crearActualizador }
