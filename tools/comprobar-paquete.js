#!/usr/bin/env node
// Arranca el proceso principal del launcher YA EMPAQUETADO (dist/win-unpacked/resources/app.asar)
// con un Electron simulado, para detectar errores que solo aparecen en la versión instalada
// (por ejemplo, electron-builder quita "build" del package.json al empaquetar).
// Uso: node tools/comprobar-paquete.js   (lo ejecuta "npm run release" antes de publicar)
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const asar = require('@electron/asar')

const raiz = path.join(__dirname, '..')
const paquete = path.join(raiz, 'dist', 'win-unpacked', 'resources', 'app.asar')
if (!fs.existsSync(paquete)) {
  console.error(`No existe ${paquete}. Compila primero con "npm run dist".`)
  process.exit(1)
}

const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'rataland-comprobacion-'))
const app = path.join(temporal, 'app')
asar.extractAll(paquete, app)

const prueba = path.join(temporal, 'prueba.js')
fs.writeFileSync(prueba, `
const Module = require('module')
const path = require('path')
const datos = ${JSON.stringify(path.join(temporal, 'datos'))}
const handlers = {}
const electron = {
  app: {
    isPackaged: true,
    getPath: () => datos, setPath () {}, setName () {}, setAppUserModelId () {},
    getVersion: () => require(${JSON.stringify(path.join(app, 'package.json'))}).version,
    getName: () => 'RataLand', requestSingleInstanceLock: () => true, on () {}, once () {},
    whenReady: () => Promise.resolve(), isReady: () => true, quit () {}, exit () {}
  },
  BrowserWindow: class {
    constructor () { this.webContents = { send () {}, setWindowOpenHandler () {}, on () {} } }
    once () {} loadFile () {} isDestroyed () { return false } show () {} hide () {}
  },
  ipcMain: { handle: (c, f) => { handlers[c] = f }, on () {} },
  shell: { openExternal () {}, openPath () {} },
  Menu: { setApplicationMenu () {} },
  safeStorage: { isEncryptionAvailable: () => false },
  net: { request () { throw new Error('sin red en la comprobación') } }
}
const resolver = Module._resolveFilename
Module._resolveFilename = function (pedido, ...resto) {
  return pedido === 'electron' ? 'electron' : resolver.call(this, pedido, ...resto)
}
require.cache.electron = { id: 'electron', filename: 'electron', loaded: true, exports: electron }
process.on('unhandledRejection', (e) => { console.error('Promesa sin capturar:', e); process.exit(1) })
require(${JSON.stringify(path.join(app, 'src', 'main', 'index.js'))})
setTimeout(async () => {
  try {
    const r = await handlers.inicio()
    if (!r?.launcher?.nombre || !r.actualizacion) throw new Error('"inicio" no devolvió lo esperado')
    console.log('Paquete OK: ' + r.launcher.nombre + ' ' + r.launcher.version)
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}, 1500)
`)

try {
  execFileSync(process.execPath, [prueba], { stdio: 'inherit', timeout: 60000 })
} catch {
  console.error('\nEl launcher empaquetado falla al arrancar. No publiques esta versión.')
  process.exitCode = 1
} finally {
  fs.rmSync(temporal, { recursive: true, force: true })
}
