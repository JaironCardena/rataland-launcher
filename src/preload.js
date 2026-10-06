const { contextBridge, ipcRenderer } = require('electron')

const escuchar = (canal) => (fn) => {
  const manejador = (_e, datos) => fn(datos)
  ipcRenderer.on(canal, manejador)
  return () => ipcRenderer.removeListener(canal, manejador)
}

contextBridge.exposeInMainWorld('launcher', {
  inicio: () => ipcRenderer.invoke('inicio'),
  buscarActualizaciones: () => ipcRenderer.invoke('actualizaciones'),
  estadoServidor: () => ipcRenderer.invoke('estado-servidor'),
  loginMicrosoft: () => ipcRenderer.invoke('login-microsoft'),
  loginSinPremium: (nombre) => ipcRenderer.invoke('login-sin-premium', nombre),
  cerrarSesion: () => ipcRenderer.invoke('cerrar-sesion'),
  guardarAjustes: (ajustes) => ipcRenderer.invoke('guardar-ajustes', ajustes),
  jugar: (opciones) => ipcRenderer.invoke('jugar', opciones),
  ventana: (accion) => ipcRenderer.send('ventana', accion),
  abrirEnlace: (clave) => ipcRenderer.send('abrir-enlace', clave),
  abrirRegistros: () => ipcRenderer.send('abrir-registros'),
  instalarActualizacion: () => ipcRenderer.send('instalar-actualizacion'),
  alActualizacionLauncher: escuchar('actualizacion-launcher'),
  alProgreso: escuchar('progreso'),
  alJuego: escuchar('juego'),
  alPerfil: escuchar('perfil')
})
