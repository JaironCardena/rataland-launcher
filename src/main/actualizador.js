const { app, ipcMain } = require('electron')

/**
 * Actualizaciones del propio launcher desde GitHub Releases (electron-updater).
 * Solo funciona en la app instalada; con "npm start" no hace nada.
 */
function iniciarActualizador (enviar) {
  if (!app.isPackaged) return
  const { autoUpdater } = require('electron-updater')
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => enviar('actualizacion-launcher', { estado: 'descargando', version: info.version }))
  autoUpdater.on('update-downloaded', (info) => enviar('actualizacion-launcher', { estado: 'lista', version: info.version }))
  autoUpdater.on('error', (e) => console.error('No se pudo buscar actualizaciones del launcher:', e?.message || e))

  ipcMain.on('instalar-actualizacion', () => autoUpdater.quitAndInstall())

  const buscar = () => autoUpdater.checkForUpdates().catch(() => {})
  buscar()
  setInterval(buscar, 60 * 60 * 1000)
}

module.exports = { iniciarActualizador }
