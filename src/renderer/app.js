'use strict'

const api = window.launcher
const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)

const NOMBRE_LOADER = { fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge' }
const NOMBRE_ENLACE = { discord: 'Discord', web: 'Web', youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok', x: 'X', twitter: 'X' }

const estado = {
  launcher: null,
  cuenta: null,
  ajustes: null,
  sistema: null,
  perfil: null,
  ocupado: false,
  jugando: false
}

const gb = (mb) => `${(mb / 1024).toLocaleString('es', { maximumFractionDigits: 1 })} GB`

/* ---------- Pintado ---------- */

function pintarMarca () {
  const { nombre, apariencia = {} } = estado.launcher
  document.title = nombre
  $$('[data-nombre]').forEach((el) => { el.textContent = nombre })

  if (apariencia.logo) {
    const logo = $('.marca__logo')
    logo.alt = nombre
    logo.addEventListener('load', () => { logo.hidden = false }, { once: true })
    logo.src = apariencia.logo
  }
  if (apariencia.fondo) {
    document.documentElement.style.setProperty('--imagen-fondo', `url("${apariencia.fondo}")`)
  }
}

function pintarCuenta () {
  const cuenta = estado.cuenta
  $('.zona--login').hidden = Boolean(cuenta)
  $('.zona--jugar').hidden = !cuenta
  $('.cuenta').hidden = !cuenta

  const { cuentas = {} } = estado.launcher
  $('.boton-microsoft').hidden = cuentas.microsoft === false
  $('.sin-premium').hidden = !cuentas.noPremium

  if (!cuenta) {
    cerrarAjustes()
    return
  }
  $('.cuenta__nombre').textContent = cuenta.nombre
  $('.cuenta__tipo').textContent = cuenta.tipo === 'microsoft' ? 'Cuenta de Microsoft' : 'Sin premium'
  const cabeza = $('.cuenta__cabeza')
  cabeza.src = cuenta.tipo === 'microsoft'
    ? `https://mc-heads.net/avatar/${encodeURIComponent(cuenta.uuid)}/72`
    : 'https://mc-heads.net/avatar/MHF_Steve/72'
}

function pintarPerfil () {
  const { minecraft, loader, noticias } = estado.perfil
  const nombreLoader = NOMBRE_LOADER[loader?.tipo]
  $('[data-version]').textContent = nombreLoader
    ? `Minecraft ${minecraft} con ${nombreLoader}`
    : `Minecraft ${minecraft}`

  const lista = $('.noticias__lista')
  lista.replaceChildren(...(noticias || []).map((n) => {
    const li = document.createElement('li')
    li.className = 'noticia'
    if (n.fecha) {
      const fecha = document.createElement('time')
      fecha.className = 'noticia__fecha'
      fecha.dateTime = n.fecha
      const d = new Date(`${n.fecha}T12:00:00`)
      fecha.textContent = Number.isNaN(d.getTime())
        ? n.fecha
        : d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
      li.append(fecha)
    }
    if (n.titulo) {
      const h = document.createElement('h3')
      h.className = 'noticia__titulo'
      h.textContent = n.titulo
      li.append(h)
    }
    if (n.texto) {
      const p = document.createElement('p')
      p.className = 'noticia__texto'
      p.textContent = n.texto
      li.append(p)
    }
    return li
  }))
  $('.noticias__vacio').hidden = Boolean(noticias?.length)
}

function pintarEnlaces () {
  const nav = $('.enlaces')
  nav.replaceChildren(...(estado.launcher.enlaces || []).map((clave) => {
    const b = document.createElement('button')
    b.className = 'enlace'
    b.textContent = NOMBRE_ENLACE[clave] || clave[0].toUpperCase() + clave.slice(1)
    b.addEventListener('click', () => api.abrirEnlace(clave))
    return b
  }))
}

function pintarAjustes () {
  const total = estado.sistema.ramTotalMB
  const ram = $('#ram')
  ram.max = Math.max(2048, Math.floor(Math.min(total - 1024, 16384) / 512) * 512)
  ram.value = estado.ajustes.ram
  $('.ajuste__valor').textContent = gb(Number(ram.value))
  $('[data-ayuda-ram]').textContent = `Tu equipo tiene ${gb(total)}. Con muchos mods, entre 4 y 6 GB suele ir bien.`
  $('#cerrar-al-jugar').checked = estado.ajustes.cerrarAlJugar
  $('[data-version-launcher]').textContent = `Launcher de ${estado.launcher.nombre}, versión ${estado.launcher.version}`
}

function actualizarBoton () {
  const boton = $('.jugar')
  boton.disabled = estado.ocupado
  $('.jugar__texto').textContent = estado.jugando ? 'Jugando' : estado.ocupado ? 'Preparando' : 'Jugar'
}

/* ---------- Progreso y avisos ---------- */

function mostrarProgreso ({ texto, actual, total }) {
  const caja = $('.progreso')
  const xp = $('.xp')
  caja.hidden = false
  $('.progreso__texto').textContent = texto || ''
  if (total > 0) {
    const pct = Math.max(0, Math.min(100, Math.floor((actual / total) * 100)))
    const relleno = $('.xp__relleno')
    // Al empezar una etapa nueva la barra vuelve a 0 sin animación.
    relleno.style.transition = pct < (Number(xp.getAttribute('aria-valuenow')) || 0) ? 'none' : ''
    xp.classList.remove('xp--indeterminada')
    relleno.style.width = `${pct}%`
    $('.progreso__numero').textContent = `${pct}%`
    xp.setAttribute('aria-valuenow', pct)
  } else {
    xp.classList.add('xp--indeterminada')
    $('.xp__relleno').style.width = ''
    $('.progreso__numero').textContent = ''
    xp.removeAttribute('aria-valuenow')
  }
}

function ocultarProgreso () {
  $('.progreso').hidden = true
}

function mostrarError (mensaje, lineas = []) {
  const caja = $('[data-error-juego]')
  caja.hidden = false
  caja.querySelector('.aviso__mensaje').textContent = mensaje
  const pre = caja.querySelector('.aviso__lineas')
  pre.hidden = !lineas.length
  pre.textContent = lineas.join('\n')
}

function ocultarError () {
  $('[data-error-juego]').hidden = true
}

function aviso (texto) {
  const p = $('[data-aviso]')
  p.hidden = !texto
  p.textContent = texto || ''
}

/* ---------- Acciones ---------- */

async function jugar (reparar = false) {
  if (estado.ocupado || !estado.cuenta) return
  cerrarAjustes()
  ocultarError()
  aviso('')
  estado.ocupado = true
  actualizarBoton()
  mostrarProgreso({ texto: reparar ? 'Preparando la reparación' : 'Preparando', actual: 0, total: 0 })

  const r = await api.jugar({ reparar })
  if (!r.ok) {
    estado.ocupado = false
    ocultarProgreso()
    actualizarBoton()
    mostrarError(r.error)
  }
}

async function loginMicrosoft () {
  const boton = $('.boton-microsoft')
  const error = $('[data-error-login]')
  error.hidden = true
  boton.disabled = true
  const r = await api.loginMicrosoft()
  boton.disabled = false
  if (r.ok) {
    estado.cuenta = r.cuenta
    pintarCuenta()
  } else if (!r.cancelado) {
    error.textContent = r.error
    error.hidden = false
  }
}

async function loginSinPremium (evento) {
  evento.preventDefault()
  const error = $('[data-error-login]')
  const r = await api.loginSinPremium($('#nombre-jugador').value)
  error.hidden = r.ok
  if (r.ok) {
    estado.cuenta = r.cuenta
    pintarCuenta()
  } else {
    error.textContent = r.error
  }
}

async function cerrarSesion () {
  await api.cerrarSesion()
  estado.cuenta = null
  pintarCuenta()
}

function abrirAjustes () {
  $('.ajustes').hidden = false
  $('.noticias').hidden = true
  $('[data-accion="ajustes"]').setAttribute('aria-expanded', 'true')
  $('#ram').focus()
}

function cerrarAjustes () {
  const panel = $('.ajustes')
  if (panel.hidden) return
  panel.hidden = true
  $('.noticias').hidden = false
  $('[data-accion="ajustes"]').setAttribute('aria-expanded', 'false')
}

async function guardarAjustes (cambios) {
  estado.ajustes = await api.guardarAjustes(cambios)
}

const servidor = { comprobando: false, ultima: 0, siguiente: null }

/** Comprueba el servidor y programa la siguiente: cada 30 s si está abierto, cada 10 s si no. */
async function consultarServidor () {
  if (servidor.comprobando) return
  servidor.comprobando = true
  clearTimeout(servidor.siguiente)

  const p = $('.estado-servidor')
  const texto = p.querySelector('.estado-servidor__texto')
  const r = await api.estadoServidor().catch(() => ({ enLinea: false }))
  p.dataset.estadoServidor = r.enLinea ? 'abierto' : 'cerrado'
  texto.textContent = r.enLinea
    ? `Servidor abierto, ${r.jugadores} de ${r.maximo} ${r.maximo === 1 ? 'jugador' : 'jugadores'}`
    : 'El servidor está apagado o no responde'

  servidor.comprobando = false
  servidor.ultima = Date.now()
  servidor.siguiente = setTimeout(consultarServidor, r.enLinea ? 30000 : 10000)
}

// Al volver a la ventana (por ejemplo tras encender el servidor en Aternos) se comprueba enseguida.
window.addEventListener('focus', () => {
  if (Date.now() - servidor.ultima > 5000) consultarServidor()
})

async function buscarActualizaciones () {
  const r = await api.buscarActualizaciones()
  if (r.ok) {
    estado.perfil = r.perfil
    pintarPerfil()
    if (r.origen === 'copia') aviso('Sin conexión: se usará la última versión descargada del modpack.')
  } else {
    aviso('No se pudo comprobar si hay actualizaciones. Se volverá a intentar al pulsar Jugar.')
  }
  consultarServidor()
}

/* ---------- Eventos ---------- */

document.addEventListener('click', (e) => {
  const ventana = e.target.closest('[data-ventana]')
  if (ventana) return api.ventana(ventana.dataset.ventana)

  const accion = e.target.closest('[data-accion]')?.dataset.accion
  if (accion === 'jugar') jugar(false)
  if (accion === 'reparar') jugar(true)
  if (accion === 'registros') api.abrirRegistros()
  if (accion === 'login-microsoft') loginMicrosoft()
  if (accion === 'cerrar-sesion') cerrarSesion()
  if (accion === 'ajustes') $('.ajustes').hidden ? abrirAjustes() : cerrarAjustes()
  if (accion === 'cerrar-ajustes') cerrarAjustes()
  if (accion === 'instalar-actualizacion') api.instalarActualizacion()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarAjustes()
})

$('.sin-premium').addEventListener('submit', loginSinPremium)
$('#ram').addEventListener('input', (e) => { $('.ajuste__valor').textContent = gb(Number(e.target.value)) })
$('#ram').addEventListener('change', (e) => guardarAjustes({ ram: Number(e.target.value) }))
$('#cerrar-al-jugar').addEventListener('change', (e) => guardarAjustes({ cerrarAlJugar: e.target.checked }))
$('.cuenta__cabeza').addEventListener('error', (e) => { e.target.removeAttribute('src') })

api.alProgreso(mostrarProgreso)
api.alActualizacionLauncher(({ estado: fase, version }) => {
  const caja = $('.actualizacion')
  caja.hidden = false
  const lista = fase === 'lista'
  caja.querySelector('.actualizacion__texto').textContent = lista
    ? `Versión ${version} del launcher lista`
    : `Descargando la versión ${version} del launcher`
  caja.querySelector('button').hidden = !lista
})
api.alPerfil((perfil) => {
  estado.perfil = perfil
  pintarPerfil()
})
api.alJuego(({ estado: fase, error }) => {
  if (fase === 'iniciando') {
    mostrarProgreso({ texto: 'Abriendo Minecraft', actual: 0, total: 0 })
  } else if (fase === 'abierto') {
    estado.jugando = true
    ocultarProgreso()
    actualizarBoton()
    aviso('Minecraft está abierto. El launcher volverá cuando lo cierres.')
  } else if (fase === 'cerrado') {
    estado.ocupado = false
    estado.jugando = false
    ocultarProgreso()
    actualizarBoton()
    aviso('')
    if (error) mostrarError(error.mensaje, error.ultimasLineas)
    consultarServidor()
  }
})

/* ---------- Arranque ---------- */

;(async () => {
  Object.assign(estado, await api.inicio())
  pintarMarca()
  pintarCuenta()
  pintarPerfil()
  pintarEnlaces()
  pintarAjustes()
  consultarServidor()
  buscarActualizaciones()
})()
