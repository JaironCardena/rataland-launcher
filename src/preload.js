const { contextBridge, ipcRenderer } = require('electron')

const escuchar = (canal) => (fn) => {
  const manejador = (_e, datos) => fn(datos)
  ipcRenderer.on(canal, manejador)
  return () => ipcRenderer.removeListener(canal, manejador)
}

contextBridge.exposeInMainWorld('launcher', {
  inicio: () => ipcRenderer.invoke('inicio'),
  buscarActualizaciones: (opciones) => ipcRenderer.invoke('actualizaciones', opciones),
  estadoServidor: () => ipcRenderer.invoke('estado-servidor'),
  loginMicrosoft: () => ipcRenderer.invoke('login-microsoft'),
  loginNavegador: () => ipcRenderer.invoke('login-navegador'),
  abrirLoginNavegador: () => ipcRenderer.send('abrir-login-navegador'),
  cancelarLogin: () => ipcRenderer.send('cancelar-login'),
  alCodigoLogin: escuchar('codigo-login'),
  loginSinPremium: (nombre) => ipcRenderer.invoke('login-sin-premium', nombre),
  cerrarSesion: () => ipcRenderer.invoke('cerrar-sesion'),
  skinActual: () => ipcRenderer.invoke('skin-actual'),
  cambiarSkin: (datos, modelo) => ipcRenderer.invoke('cambiar-skin', { datos, modelo }),
  quitarSkin: () => ipcRenderer.invoke('quitar-skin'),
  guardarAjustes: (ajustes) => ipcRenderer.invoke('guardar-ajustes', ajustes),
  jugar: (opciones) => ipcRenderer.invoke('jugar', opciones),
  ventana: (accion) => ipcRenderer.send('ventana', accion),
  abrirEnlace: (clave) => ipcRenderer.send('abrir-enlace', clave),
  abrirEpisodio: () => ipcRenderer.send('abrir-episodio'),
  copiar: (texto) => ipcRenderer.send('copiar', String(texto)),
  abrirRegistros: () => ipcRenderer.send('abrir-registros'),
  instalarActualizacion: () => ipcRenderer.send('instalar-actualizacion'),
  abrirDescargaLauncher: () => ipcRenderer.send('abrir-descarga-launcher'),
  seguirSinActualizar: () => ipcRenderer.send('seguir-sin-actualizar'),
  alActualizacionLauncher: escuchar('actualizacion-launcher'),
  alProgreso: escuchar('progreso'),
  alJuego: escuchar('juego'),
  alPerfil: escuchar('perfil'),
  alSincronizacion: escuchar('sincronizacion'),
  alPedirCierre: escuchar('pedir-cierre')
})
