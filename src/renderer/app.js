'use strict'

const api = window.launcher
const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)

const NOMBRE_LOADER = { fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge' }
const NOMBRE_ENLACE = { discord: 'Discord', web: 'Web', youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok', x: 'X', twitter: 'X' }
const FONDO_ESCENA = { cloacas: 'assets/fondo-cloacas.png', amanecer: 'assets/fondo-amanecer.png' }

const AYUDA = {
  alJugar: {
    segundoPlano: 'El launcher se esconde junto al reloj de Windows y vuelve solo cuando cierras Minecraft.',
    cerrar: 'El launcher se cierra del todo. Minecraft sigue abierto.',
    abierto: 'El launcher se queda a la vista mientras juegas.'
  },
  alCerrar: {
    preguntar: 'Te pregunta cada vez si lo cierras o lo dejas en segundo plano.',
    segundoPlano: 'Se esconde junto al reloj de Windows. Para cerrarlo del todo, haz clic derecho en su icono.',
    cerrar: 'Se cierra del todo.'
  }
}

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
  pintarFondo()
}

function pintarFondo () {
  const fondo = FONDO_ESCENA[estado.perfil?.escena] || estado.launcher.apariencia?.fondo
  if (fondo) document.documentElement.style.setProperty('--imagen-fondo', `url("${fondo}")`)
}

function pintarCuenta () {
  const cuenta = estado.cuenta
  $('.zona--login').hidden = Boolean(cuenta)
  $('.zona--jugar').hidden = !cuenta
  $('.cuenta').hidden = !cuenta

  const { cuentas = {} } = estado.launcher
  $('.login-opciones').hidden = cuentas.microsoft === false
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
  const { minecraft, loader, noticias, temporada } = estado.perfil
  const chip = $('.temporada')
  chip.textContent = temporada || ''
  chip.hidden = !temporada
  pintarFondo()
  pintarEpisodio()

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
  $('.noticias__vacio').hidden = Boolean(noticias?.length || estado.perfil.episodio)
  pintarEvento()
  pintarEnlaces()
}

let relojEvento = null

function formatearTiempo (ms) {
  const s = Math.floor(ms / 1000)
  const dos = (n) => String(n).padStart(2, '0')
  const [d, h, m, seg] = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]
  return d > 0 ? `${d}d ${dos(h)}h ${dos(m)}m ${dos(seg)}s` : `${dos(h)}h ${dos(m)}m ${dos(seg)}s`
}

/** Cuenta atrás del evento de modpack.json. Al llegar la hora dice "¡Ya empezó!" durante `duracionHoras`. */
function pintarEvento () {
  clearInterval(relojEvento)
  const caja = $('.cuenta-atras')
  const ev = estado.perfil?.evento
  const inicio = ev?.fecha ? new Date(ev.fecha).getTime() : NaN
  if (Number.isNaN(inicio)) {
    caja.hidden = true
    return
  }
  const fin = inicio + (Number(ev.duracionHoras) || 3) * 3600 * 1000
  const nombre = ev.titulo || 'El próximo evento'
  const fecha = new Date(inicio).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  caja.querySelector('.cuenta-atras__fecha').textContent = fecha[0].toUpperCase() + fecha.slice(1)

  const actualizar = () => {
    const ahora = Date.now()
    if (ahora > fin) {
      caja.hidden = true
      clearInterval(relojEvento)
      return
    }
    caja.hidden = false
    const empezado = ahora >= inicio
    caja.querySelector('.cuenta-atras__titulo').textContent = empezado ? nombre : `${nombre} empieza en`
    caja.querySelector('.cuenta-atras__tiempo').textContent = empezado ? '¡Ya empezó!' : formatearTiempo(inicio - ahora)
  }
  actualizar()
  relojEvento = setInterval(actualizar, 1000)
}

/** Último episodio: miniatura de YouTube, título y enlace. */
function pintarEpisodio () {
  const ep = estado.perfil?.episodio
  const tarjeta = $('.episodio')
  tarjeta.hidden = !ep
  if (!ep) return
  const img = tarjeta.querySelector('img')
  const src = `https://i.ytimg.com/vi/${ep.id}/hqdefault.jpg`
  if (img.getAttribute('src') !== src) {
    img.hidden = true
    img.onload = () => { img.hidden = false }
    img.src = src
  }
  tarjeta.querySelector('.episodio__titulo').textContent = ep.titulo || 'Último episodio'
  tarjeta.setAttribute('aria-label', `${ep.titulo || 'Último episodio'}: ver en YouTube`)
}

function pintarEnlaces () {
  const nav = $('.enlaces')
  const enlaces = estado.perfil?.enlaces || {}
  // Discord va el último y destacado: es por donde se une la gente a la serie.
  const claves = Object.keys(enlaces)
    .filter((k) => /^https?:\/\//.test(enlaces[k] || ''))
    .sort((a, b) => (a === 'discord') - (b === 'discord'))
  nav.replaceChildren(...claves.map((clave) => {
    const b = document.createElement('button')
    const nombre = NOMBRE_ENLACE[clave] || clave[0].toUpperCase() + clave.slice(1)
    if (clave === 'discord') {
      b.className = 'boton-discord'
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v13H10l-5 4v-4H3z" /></svg>'
      b.append('Únete al Discord')
    } else {
      b.className = 'enlace'
      b.textContent = nombre
    }
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
  for (const clave of ['alJugar', 'alCerrar']) {
    const valor = estado.ajustes[clave]
    const radio = document.querySelector(`input[name="${clave}"][value="${valor}"]`)
    if (radio) radio.checked = true
    $(`[data-ayuda="${clave}"]`).textContent = AYUDA[clave][valor] || ''
  }
  $('[data-version-launcher]').textContent = `Launcher de ${estado.launcher.nombre}, versión ${estado.launcher.version}`
}

function actualizarBoton () {
  const boton = $('.jugar')
  boton.disabled = estado.ocupado
  document.body.classList.toggle('ocupado', estado.ocupado)
  $('.jugar__texto').textContent = estado.jugando ? 'Jugando' : estado.ocupado ? 'Preparando' : 'Jugar'
}

/* ---------- Progreso y avisos ---------- */

/** Pinta una barra de experiencia (y su número) dentro de `contenedor`. Sin total, la barra se mueve sola. */
function pintarBarra (contenedor, actual, total) {
  const xp = contenedor.querySelector('.xp')
  const relleno = contenedor.querySelector('.xp__relleno')
  const numero = contenedor.querySelector('.progreso__numero')
  if (total > 0) {
    const pct = Math.max(0, Math.min(100, Math.floor((actual / total) * 100)))
    // Al empezar una etapa nueva la barra vuelve a 0 sin animación.
    relleno.style.transition = pct < (Number(xp.getAttribute('aria-valuenow')) || 0) ? 'none' : ''
    xp.classList.remove('xp--indeterminada')
    relleno.style.width = `${pct}%`
    numero.textContent = `${pct}%`
    xp.setAttribute('aria-valuenow', pct)
  } else {
    xp.classList.add('xp--indeterminada')
    relleno.style.width = ''
    numero.textContent = ''
    xp.removeAttribute('aria-valuenow')
  }
}

function mostrarProgreso ({ texto, actual, total }) {
  const caja = $('.progreso')
  caja.hidden = false
  $('.progreso__texto').textContent = texto || ''
  pintarBarra(caja, actual, total)
}

/* ---------- Actualizaciones del launcher ---------- */

function pintarActualizacion (a) {
  estado.actualizacion = a
  const pantalla = $('.actualizando')
  const enArranque = a.modo === 'arranque'
  const visible = a.fase === 'instalando' || a.fase === 'error' ||
    (enArranque && (a.fase === 'descargando' || a.fase === 'lista'))
  const faseAnterior = pantalla.dataset.fase
  pantalla.dataset.fase = a.fase
  pantalla.hidden = !visible

  const error = a.fase === 'error'
  pantalla.querySelector('.actualizando__titulo').textContent = error
    ? 'No se pudo actualizar el launcher'
    : 'Actualizando el launcher'
  pantalla.querySelector('.actualizando__acciones').hidden = !error
  const barra = pantalla.querySelector('.actualizando__progreso')
  barra.hidden = error

  const texto = pantalla.querySelector('.actualizando__texto')
  if (a.fase === 'descargando') {
    texto.textContent = `Descargando la versión ${a.version}.`
    pintarBarra(barra, a.porcentaje || 0, 100)
  } else if (a.fase === 'lista') {
    texto.textContent = `Preparando la versión ${a.version}.`
    pintarBarra(barra, 0, 0)
  } else if (a.fase === 'instalando') {
    texto.textContent = `Instalando la versión ${a.version}. El launcher se cerrará y se volverá a abrir solo en unos segundos.`
    pintarBarra(barra, 0, 0)
  } else if (error) {
    texto.textContent = `${a.mensaje} Puedes descargar la versión ${a.version} e instalarla a mano, o seguir usando la ${a.versionActual || estado.launcher.version}.`
  }
  if (error && faseAnterior !== 'error') pantalla.querySelector('[data-accion="descargar-launcher"]').focus()

  // En segundo plano solo se avisa abajo, sin interrumpir.
  const aviso = $('.actualizacion')
  const boton = aviso.querySelector('button')
  const textoAviso = aviso.querySelector('.actualizacion__texto')
  aviso.classList.remove('actualizacion--hecha')
  if (!enArranque && a.fase === 'descargando') {
    aviso.hidden = false
    boton.hidden = true
    textoAviso.textContent = `Descargando la versión ${a.version} del launcher (${a.porcentaje || 0}%)`
  } else if (!enArranque && a.fase === 'lista') {
    // Mientras se juega no se instala: se hará solo al cerrar Minecraft
    aviso.hidden = false
    boton.hidden = estado.jugando
    textoAviso.textContent = estado.jugando
      ? `Versión ${a.version} del launcher lista: se instalará al cerrar Minecraft`
      : `Hay una versión nueva del launcher (${a.version})`
  } else if (a.fase !== 'instalando') {
    aviso.hidden = true
  }
}

function avisarRecienActualizado (version) {
  const aviso = $('.actualizacion')
  aviso.hidden = false
  aviso.classList.add('actualizacion--hecha')
  aviso.querySelector('button').hidden = true
  aviso.querySelector('.actualizacion__texto').textContent = `Launcher actualizado a la versión ${version}`
  setTimeout(() => { if (aviso.classList.contains('actualizacion--hecha')) aviso.hidden = true }, 15000)
}

/** Lista corta de nombres: "A, B y C" o "A, B, C y 4 más". */
function nombres (lista, max = 3) {
  if (lista.length <= max) return lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0]
  return `${lista.slice(0, max).join(', ')} y ${lista.length - max} más`
}

/** Tras sincronizar: qué mods se añadieron, actualizaron, repararon o quitaron. */
function pintarResumen (r) {
  const p = $('.resumen-mods')
  const grupos = [
    [r.actualizados, 'Actualizado', 'Actualizados'],
    [r.anadidos, 'Añadido', 'Añadidos'],
    [r.reparados, 'Reparado', 'Reparados'],
    [r.quitados, 'Quitado', 'Quitados']
  ].filter(([lista]) => lista?.length)

  if (!grupos.length) {
    p.textContent = r.total ? `Mods al día: los ${r.total} están bien.` : 'Mods al día.'
  } else {
    p.replaceChildren(...grupos.flatMap(([lista, uno, varios], i) => {
      const b = document.createElement('b')
      b.textContent = `${lista.length === 1 ? uno : varios}:`
      return [b, ` ${nombres(lista)}${i < grupos.length - 1 ? '. ' : '.'}`]
    }))
  }
  p.title = grupos.map(([lista, uno, varios]) => `${lista.length === 1 ? uno : varios}: ${lista.join(', ')}`).join('\n')
  p.hidden = false
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
  $('.resumen-mods').hidden = true
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

/** Inicio de sesión en el navegador con un código (ahí funcionan las llaves de acceso). */
async function loginNavegador () {
  const error = $('[data-error-login]')
  const opciones = $('.login-opciones')
  const formulario = $('.sin-premium')
  const caja = $('.login-codigo')
  const formularioVisible = !formulario.hidden
  error.hidden = true
  opciones.hidden = true
  formulario.hidden = true
  caja.querySelector('.login-codigo__valor').textContent = '…'
  caja.hidden = false

  const r = await api.loginNavegador()
  caja.hidden = true
  opciones.hidden = estado.launcher.cuentas?.microsoft === false
  formulario.hidden = !formularioVisible
  if (r.ok) {
    estado.cuenta = r.cuenta
    pintarCuenta()
  } else if (!r.cancelado) {
    error.textContent = r.error
    error.hidden = false
  }
}

async function copiarCodigo () {
  const boton = $('[data-accion="copiar-codigo"]')
  try {
    await navigator.clipboard.writeText($('.login-codigo__valor').textContent)
    boton.textContent = 'Copiado'
    setTimeout(() => { boton.textContent = 'Copiar' }, 2000)
  } catch { /* se puede seleccionar a mano */ }
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
  pintarAjustes()
}

/* ---------- Cerrar o dejar en segundo plano ---------- */

const dialogoCierre = $('[data-dialogo="cierre"]')

function pedirCierre () {
  const eleccion = estado.ajustes?.alCerrar
  if (eleccion === 'cerrar') return api.ventana('cerrar')
  if (eleccion === 'segundoPlano') return api.ventana('segundo-plano')
  if (!dialogoCierre.hidden) return
  dialogoCierre.querySelector('[data-cierre-jugando]').hidden = !estado.jugando
  dialogoCierre.querySelector('[data-recordar-cierre]').checked = false
  dialogoCierre.hidden = false
  dialogoCierre.querySelector('[data-accion="cierre-segundo-plano"]').focus()
}

async function elegirCierre (eleccion) {
  dialogoCierre.hidden = true
  if (dialogoCierre.querySelector('[data-recordar-cierre]').checked) await guardarAjustes({ alCerrar: eleccion })
  api.ventana(eleccion === 'cerrar' ? 'cerrar' : 'segundo-plano')
}

const servidor = { comprobando: false, ultima: 0, siguiente: null }

/** Comprueba el servidor y programa la siguiente: cada 30 s si está abierto, cada 10 s si no. */
async function consultarServidor () {
  if (servidor.comprobando) return
  servidor.comprobando = true
  clearTimeout(servidor.siguiente)

  const p = $('.estado-servidor')
  const r = await api.estadoServidor().catch(() => ({ enLinea: false }))
  p.dataset.estadoServidor = r.enLinea ? 'abierto' : r.encendiendo ? 'encendiendo' : 'cerrado'
  p.querySelector('.estado-servidor__texto').textContent = r.enLinea
    ? 'Servidor abierto'
    : r.encendiendo ? 'El servidor se está encendiendo'
      : r.apagado ? 'El servidor está apagado' : 'No se pudo conectar con el servidor'

  // Cabezas de algunos de los que están dentro, y cuántos son
  const cabezas = p.querySelector('.estado-servidor__cabezas')
  const lista = r.enLinea ? (r.lista || []).slice(0, 5) : []
  cabezas.replaceChildren(...lista.map(({ nombre }) => {
    const img = document.createElement('img')
    img.alt = ''
    img.title = nombre
    img.width = img.height = 22
    img.src = `https://mc-heads.net/avatar/${encodeURIComponent(nombre)}/44`
    img.addEventListener('error', () => img.remove(), { once: true })
    return img
  }))
  cabezas.hidden = !lista.length
  const jugadores = p.querySelector('.estado-servidor__jugadores')
  jugadores.hidden = !r.enLinea
  if (r.enLinea) jugadores.textContent = `${r.jugadores} de ${r.maximo} ${r.maximo === 1 ? 'jugador' : 'jugadores'}`

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
  if (ventana) return ventana.dataset.ventana === 'cerrar' ? pedirCierre() : api.ventana(ventana.dataset.ventana)
  if (e.target === dialogoCierre) dialogoCierre.hidden = true

  const accion = e.target.closest('[data-accion]')?.dataset.accion
  if (accion === 'jugar') jugar(false)
  if (accion === 'reparar') jugar(true)
  if (accion === 'registros') api.abrirRegistros()
  if (accion === 'login-microsoft') loginMicrosoft()
  if (accion === 'login-navegador') loginNavegador()
  if (accion === 'copiar-codigo') copiarCodigo()
  if (accion === 'abrir-login-navegador') api.abrirLoginNavegador()
  if (accion === 'cancelar-login') api.cancelarLogin()
  if (accion === 'cerrar-sesion') cerrarSesion()
  if (accion === 'ajustes') $('.ajustes').hidden ? abrirAjustes() : cerrarAjustes()
  if (accion === 'cerrar-ajustes') cerrarAjustes()
  if (accion === 'instalar-actualizacion') api.instalarActualizacion()
  if (accion === 'descargar-launcher') api.abrirDescargaLauncher()
  if (accion === 'seguir-sin-actualizar') api.seguirSinActualizar()
  if (accion === 'episodio') api.abrirEpisodio()
  if (accion === 'cierre-segundo-plano') elegirCierre('segundoPlano')
  if (accion === 'cierre-cerrar') elegirCierre('cerrar')
  if (accion === 'cancelar-cierre') dialogoCierre.hidden = true
})

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (!dialogoCierre.hidden) dialogoCierre.hidden = true
  else cerrarAjustes()
})

$('.sin-premium').addEventListener('submit', loginSinPremium)
$('#ram').addEventListener('input', (e) => { $('.ajuste__valor').textContent = gb(Number(e.target.value)) })
$('#ram').addEventListener('change', (e) => guardarAjustes({ ram: Number(e.target.value) }))
$('.ajustes').addEventListener('change', (e) => {
  if (e.target.type === 'radio') guardarAjustes({ [e.target.name]: e.target.value })
})
$('.cuenta__cabeza').addEventListener('error', (e) => { e.target.removeAttribute('src') })

api.alProgreso(mostrarProgreso)
api.alActualizacionLauncher(pintarActualizacion)
api.alSincronizacion(pintarResumen)
api.alCodigoLogin(({ codigo }) => { $('.login-codigo__valor').textContent = codigo })
api.alPedirCierre(pedirCierre)
api.alPerfil((perfil) => {
  estado.perfil = perfil
  pintarPerfil()
})
api.alJuego(({ estado: fase, error }) => {
  if (fase === 'iniciando') {
    mostrarProgreso({ texto: 'Abriendo Minecraft', actual: 0, total: 0 })
  } else if (fase === 'abierto') {
    estado.jugando = true
    if (estado.actualizacion) pintarActualizacion(estado.actualizacion)
    ocultarProgreso()
    actualizarBoton()
    aviso(estado.ajustes.alJugar === 'abierto' ? 'Minecraft está abierto.' : 'Minecraft está abierto. El launcher volverá cuando lo cierres.')
  } else if (fase === 'cerrado') {
    estado.ocupado = false
    estado.jugando = false
    if (estado.actualizacion) pintarActualizacion(estado.actualizacion)
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
  pintarAjustes()
  if (estado.actualizacion) {
    pintarActualizacion(estado.actualizacion)
    if (estado.actualizacion.recienActualizado) avisarRecienActualizado(estado.actualizacion.recienActualizado)
  }
  consultarServidor()
  buscarActualizaciones()
})()
