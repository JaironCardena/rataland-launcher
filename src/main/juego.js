const fs = require('fs')
const path = require('path')
const { launch, createMinecraftProcessWatcher, LaunchPrecheck } = require('@xmcl/core')
const { extraerNativos } = require('./nativos')

/** Desde 1.20 el juego usa --quickPlayMultiplayer; antes, --server/--port. */
function usaQuickPlay (mc) {
  const m = /^1\.(\d+)/.exec(mc)
  return m ? Number(m[1]) >= 20 : true
}

/**
 * Arranca Minecraft y entra directo al servidor.
 * `eventos`: { listo(), salida({ codigo, error }) }
 */
async function lanzarJuego ({ raiz, instalacion, sesion, ramMB, servidor, launcher }, eventos = {}) {
  const opciones = {
    gamePath: raiz,
    javaPath: instalacion.java,
    version: instalacion.versionId,
    gameProfile: { id: sesion.uuid, name: sesion.nombre },
    accessToken: sesion.token,
    userType: sesion.tipo === 'microsoft' ? 'msa' : 'legacy',
    launcherName: launcher.nombre,
    launcherBrand: launcher.version,
    minMemory: Math.min(1024, ramMB),
    maxMemory: ramMB,
    // Valores extra para los argumentos ${auth_xuid} y ${clientid} del JSON de versión.
    features: { valoresLauncher: { auth_xuid: sesion.xuid || '0', clientid: sesion.uuid } },
    prechecks: [LaunchPrecheck.checkVersion, LaunchPrecheck.checkLibraries, extraerNativos, LaunchPrecheck.linkAssets],
    extraExecOption: { detached: true }
  }

  // Con "entrarDirecto": false el jugador ve el menú de la serie y entra con su botón Jugar.
  if (servidor?.ip && servidor.entrarDirecto !== false) {
    const puerto = Number(servidor.puerto) || 25565
    if (usaQuickPlay(instalacion.minecraft)) opciones.quickPlayMultiplayer = `${servidor.ip}:${puerto}`
    else opciones.server = { ip: servidor.ip, port: puerto }
  }

  const dirRegistros = path.join(raiz, 'logs')
  fs.mkdirSync(dirRegistros, { recursive: true })
  const rutaRegistro = path.join(dirRegistros, 'launcher.log')
  const registro = fs.createWriteStream(rutaRegistro)
  const ultimasLineas = []
  const guardar = (trozo) => {
    const texto = trozo.toString()
    registro.write(texto)
    // El juego escribe en XML (log4j) cuando lo abre un launcher; nos quedamos con los mensajes.
    const mensajes = [...texto.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((m) => m[1])
    const lineas = (mensajes.length ? mensajes.join('\n') : texto).split(/\r?\n/)
    ultimasLineas.push(...lineas.filter((l) => l.trim()))
    if (ultimasLineas.length > 60) ultimasLineas.splice(0, ultimasLineas.length - 60)
  }

  const proceso = await launch(opciones)
  proceso.stdout?.on('data', guardar)
  proceso.stderr?.on('data', guardar)

  const vigilante = createMinecraftProcessWatcher(proceso)
  vigilante.on('minecraft-window-ready', () => eventos.listo?.())
  vigilante.on('minecraft-exit', ({ code, signal, crashReportLocation }) => {
    registro.end()
    const fallo = code !== 0 && code !== null && !signal
    eventos.salida?.({
      codigo: code,
      error: fallo
        ? {
            mensaje: 'Minecraft se cerró con un error.',
            informe: crashReportLocation || null,
            registro: rutaRegistro,
            ultimasLineas: ultimasLineas.slice(-15)
          }
        : null
    })
  })
  vigilante.on('error', (e) => eventos.salida?.({
    codigo: -1,
    error: { mensaje: `No se pudo abrir Minecraft: ${e.message}`, registro: rutaRegistro, ultimasLineas: [] }
  }))

  return proceso
}

module.exports = { lanzarJuego, usaQuickPlay }
