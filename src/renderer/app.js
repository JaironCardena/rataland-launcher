'use strict'

const api = window.launcher
const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)

const NOMBRE_LOADER = { fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge' }
const NOMBRE_ENLACE = { discord: 'Discord', web: 'Web', youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok', x: 'X', twitter: 'X' }
const FONDO_ESCENA = { cloacas: 'assets/fondo-cloacas.png', amanecer: 'assets/fondo-amanecer.png', pesca: 'assets/fondo-pesca.png' }
// Iconos pixel (8×8) de los enlaces en la barra lateral
const ICONO_ENLACE = {
  discord: 'M1 1h6v1h-6zM0 2h8v1h-8zM0 3h2v1h-2zM3 3h2v1h-2zM6 3h2v1h-2zM0 4h8v1h-8zM0 5h8v1h-8zM1 6h1v1h-1zM6 6h1v1h-1z',
  video: 'M1 1h6v1h-6zM0 2h2v1h-2zM3 2h5v1h-5zM0 3h2v1h-2zM4 3h4v1h-4zM0 4h2v1h-2zM5 4h3v1h-3zM0 5h2v1h-2zM4 5h4v1h-4zM0 6h2v1h-2zM3 6h5v1h-5zM1 7h6v1h-6z',
  enlace: 'M4 0h3v1h-3zM5 1h2v1h-2zM4 2h1v1h-1zM6 2h1v1h-1zM3 3h1v1h-1zM2 4h1v1h-1zM1 5h1v1h-1zM0 6h1v1h-1z'
}
const TIPO_ICONO = { discord: 'discord', youtube: 'video', twitch: 'video', tiktok: 'video' }

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

let fondoAnimado = null

function pintarFondo () {
  const escena = estado.perfil?.escena
  const fondo = FONDO_ESCENA[escena] || estado.launcher.apariencia?.fondo
  if (fondo) document.documentElement.style.setProperty('--imagen-fondo', `url("${fondo}")`)

  // Las escenas animadas se dibujan en un <canvas> encima de la imagen fija
  const animada = window.FondoAnimado && window.ESCENAS_FONDO?.[escena]
  if (fondoAnimado?.escena === escena && animada) return
  fondoAnimado?.animacion.parar()
  fondoAnimado?.lienzo.remove()
  fondoAnimado = null
  if (!animada) return
  const lienzo = document.createElement('canvas')
  lienzo.className = 'fondo__lienzo'
  $('.fondo').append(lienzo)
  fondoAnimado = { escena, lienzo, animacion: window.FondoAnimado.animar(lienzo, { escena: animada, ruta: 'assets/' }) }
}

function pintarCuenta () {
  const cuenta = estado.cuenta
  $$('[data-accion="abrir-skin"]').forEach((b) => { b.hidden = !cuenta })
  if (!cuenta) cerrarSkin()
  $('.zona--login').hidden = Boolean(cuenta)
  $('.zona--jugar').hidden = !cuenta
  $('.cuenta').hidden = !cuenta
  $('.jugar').hidden = !cuenta
  $('[data-ajuste-cuenta]').hidden = !cuenta
  document.body.classList.toggle('sin-cuenta', !cuenta)

  const { cuentas = {} } = estado.launcher
  $('.login-opciones').hidden = cuentas.microsoft === false
  $('.sin-premium').hidden = !cuentas.noPremium

  if (!cuenta) {
    cerrarAjustes()
    skin.imagen = null
    pintarPersonaje()
    pintarHud()
    return
  }
  const tipo = cuenta.tipo === 'microsoft' ? 'Cuenta de Microsoft' : 'Sin premium'
  $('.cuenta__nombre').textContent = cuenta.nombre
  $('.cuenta__tipo').textContent = tipo
  $('[data-texto-cuenta]').textContent = `Has entrado como ${cuenta.nombre} (${tipo.toLowerCase()}).`
  // Primero la última cabeza que vimos (o la de mc-heads.net); luego la de la skin real
  $('.cuenta__cabeza').src = cabezaGuardada(cuenta) || (cuenta.tipo === 'microsoft'
    ? `https://mc-heads.net/avatar/${encodeURIComponent(cuenta.uuid)}/72`
    : 'https://mc-heads.net/avatar/MHF_Steve/72')
  cargarSkinDeCuenta()
  pintarHud()
}

/** Skin de la cuenta: para el personaje del paisaje (y la cabeza de abajo, sin premium). */
async function cargarSkinDeCuenta () {
  const cuenta = estado.cuenta
  const r = await api.skinActual().catch(() => null)
  if (estado.cuenta !== cuenta) return
  skin.imagen = r?.ok ? r.imagen : null
  skin.modelo = r?.ok ? r.modelo : 'classic'
  if (skin.imagen) await ponerCabeza(skin.imagen)
  pintarPersonaje()
}

/*
 * La cabeza de abajo sale de la skin de verdad: mc-heads.net guarda las skins viejas varias horas.
 * Se recuerda la última para no enseñar la vieja ni un momento al abrir.
 */
const claveCabeza = (cuenta) => `rataland-cabeza-${cuenta.uuid}`

function cabezaGuardada (cuenta) {
  try { return localStorage.getItem(claveCabeza(cuenta)) } catch { return null }
}

async function ponerCabeza (imagen) {
  const cuenta = estado.cuenta
  if (!cuenta) return
  if (!imagen) {
    try { localStorage.removeItem(claveCabeza(cuenta)) } catch { /* sin almacenamiento */ }
    $('.cuenta__cabeza').src = 'https://mc-heads.net/avatar/MHF_Steve/72'
    return
  }
  const cabeza = cabezaDe(await cargarImagen(imagen))
  $('.cuenta__cabeza').src = cabeza
  try { localStorage.setItem(claveCabeza(cuenta), cabeza) } catch { /* sin almacenamiento */ }
}

/** Tu personaje, de pie en el paisaje con su nombre encima (como en el juego). */
async function pintarPersonaje () {
  const caja = $('.personaje')
  if (!estado.cuenta || !skin.imagen) {
    caja.hidden = true
    return
  }
  caja.querySelector('.personaje__nombre').textContent = estado.cuenta.nombre
  dibujarSkin(caja.querySelector('.personaje__lienzo'), await cargarImagen(skin.imagen), skin.modelo === 'slim')
  caja.hidden = false
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
  pintarHud()
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
    b.className = `rail__boton${clave === 'discord' ? ' rail__boton--discord' : ''}`
    b.title = clave === 'discord' ? 'Únete al Discord de la serie' : `Abrir ${nombre}`
    b.innerHTML = `<span class="rail__icono px" aria-hidden="true"><svg viewBox="0 0 8 8"><path d="${ICONO_ENLACE[TIPO_ICONO[clave] || 'enlace']}" /></svg></span>`
    b.append(nombre)
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
  pintarHud()
}

/** HUD en reposo: qué toca ahora y, al lado, la versión o lo que cambió en los mods. */
function pintarHud () {
  const hud = $('.hud')
  if (hud.classList.contains('hud--progreso')) return
  // Sin cuenta el aviso para entrar ya está en la portada: aquí solo la versión
  $('[data-hud-texto]').textContent = !estado.cuenta
    ? ''
    : estado.jugando ? 'Minecraft está abierto' : 'Listo para jugar'
  $('[data-version]').hidden = !$('.resumen-mods').hidden
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

/** El progreso va en el HUD: el texto arriba y la barra de experiencia debajo. */
function mostrarProgreso ({ texto, actual, total }) {
  $('.hud').classList.add('hud--progreso')
  $('[data-hud-texto]').textContent = texto || ''
  pintarBarra($('.hud__estado'), actual, total)
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
  $('[data-version]').hidden = true
}

function ocultarProgreso () {
  $('.hud').classList.remove('hud--progreso')
  pintarHud()
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
  $('[data-version]').hidden = false
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

function copiarCodigo () {
  const boton = $('[data-accion="copiar-codigo"]')
  api.copiar($('.login-codigo__valor').textContent)
  boton.textContent = 'Copiado'
  setTimeout(() => { boton.textContent = 'Copiar' }, 2000)
}

/** Copia la dirección del servidor (para dársela a alguien o añadirla a mano). */
function copiarIp () {
  const s = estado.perfil?.servidor
  if (!s?.ip) return
  const boton = $('.estado-servidor__copiar')
  api.copiar(Number(s.puerto) && Number(s.puerto) !== 25565 ? `${s.ip}:${s.puerto}` : s.ip)
  boton.classList.add('copiado')
  boton.title = 'Dirección copiada'
  setTimeout(() => {
    boton.classList.remove('copiado')
    boton.title = 'Copiar la dirección del servidor'
  }, 1800)
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

/* ---------- Skin (cuentas de Microsoft) ---------- */

const skin = { imagen: null, modelo: 'classic', nueva: null, imagenNueva: null, ocupado: false }

/**
 * Dibuja la skin de frente en un lienzo de 16×32 (cabeza, cuerpo, brazos y piernas, y encima la
 * capa exterior). Las skins antiguas de 64×32 no tienen brazo ni pierna izquierdos: se reflejan los derechos.
 */
function dibujarSkin (lienzo, img, delgado) {
  const c = lienzo.getContext('2d')
  c.imageSmoothingEnabled = false
  c.clearRect(0, 0, lienzo.width, lienzo.height)
  if (!img) return
  const moderna = img.height === 64
  const brazo = delgado ? 3 : 4
  const pieza = (sx, sy, w, h, dx, dy, espejo) => {
    if (!espejo) return c.drawImage(img, sx, sy, w, h, dx, dy, w, h)
    c.save()
    c.translate(dx + w, dy)
    c.scale(-1, 1)
    c.drawImage(img, sx, sy, w, h, 0, 0, w, h)
    c.restore()
  }
  pieza(8, 8, 8, 8, 4, 0)
  pieza(20, 20, 8, 12, 4, 8)
  pieza(44, 20, brazo, 12, 4 - brazo, 8)
  if (moderna) pieza(36, 52, brazo, 12, 12, 8)
  else pieza(44, 20, brazo, 12, 12, 8, true)
  pieza(4, 20, 4, 12, 4, 20)
  if (moderna) pieza(20, 52, 4, 12, 8, 20)
  else pieza(4, 20, 4, 12, 8, 20, true)
  // Capa exterior (gorro, chaqueta, mangas y pantalón)
  if (moderna || !capaOpaca(img)) pieza(40, 8, 8, 8, 4, 0)
  if (moderna) {
    pieza(20, 36, 8, 12, 4, 8)
    pieza(44, 36, brazo, 12, 4 - brazo, 8)
    pieza(52, 52, brazo, 12, 12, 8)
    pieza(4, 36, 4, 12, 4, 20)
    pieza(4, 52, 4, 12, 8, 20)
  }
}

/** En las skins antiguas, un gorro sin ningún píxel transparente es relleno: Minecraft no lo pinta. */
function capaOpaca (img) {
  const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  c.canvas.width = 8
  c.canvas.height = 8
  c.drawImage(img, 40, 8, 8, 8, 0, 0, 8, 8)
  const pixeles = c.getImageData(0, 0, 8, 8).data
  for (let i = 3; i < pixeles.length; i += 4) if (pixeles[i] < 255) return false
  return true
}

/** Cabeza (con gorro) de la skin, para la foto de la cuenta abajo a la izquierda. */
function cabezaDe (img) {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 8
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8)
  if (img.height === 64 || !capaOpaca(img)) ctx.drawImage(img, 40, 8, 8, 8, 0, 0, 8, 8)
  return c.toDataURL('image/png')
}

// Con onload y no con decode(): decode() no termina mientras la ventana está oculta (en segundo plano)
function cargarImagen (src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}

function estadoSkin (texto, tipo = '') {
  const p = $('[data-estado-skin]')
  p.textContent = texto || ''
  p.className = `aviso skin-estado${tipo ? ` skin-estado--${tipo}` : ''}`
}

function modeloElegido () {
  return document.querySelector('input[name="modeloSkin"]:checked')?.value || 'classic'
}

async function pintarSkin () {
  const lienzo = $('.skin-vista__lienzo')
  const fuente = skin.imagenNueva || skin.imagen
  const img = fuente ? (typeof fuente === 'string' ? await cargarImagen(fuente) : fuente) : null
  dibujarSkin(lienzo, img, modeloElegido() === 'slim')
  $('.skin-vista__vacia').hidden = Boolean(img)
  const hayCambios = Boolean(skin.nueva) || (Boolean(skin.imagen) && modeloElegido() !== skin.modelo)
  $('[data-accion="guardar-skin"]').disabled = skin.ocupado || !hayCambios
  $('[data-accion="quitar-skin"]').disabled = skin.ocupado || !skin.imagen
}

/** Marca en la barra lateral la sección que se ve. */
function marcarRail () {
  const actual = !$('.ajustes').hidden ? 'ajustes' : !$('.panel-skin').hidden ? 'abrir-skin' : 'ir-inicio'
  $$('.rail__boton[data-accion]').forEach((b) => {
    if (b.dataset.accion === actual) b.setAttribute('aria-current', 'page')
    else b.removeAttribute('aria-current')
  })
  $$('[data-accion="abrir-skin"]').forEach((b) => b.setAttribute('aria-expanded', String(actual === 'abrir-skin')))
  $('[data-accion="ajustes"]').setAttribute('aria-expanded', String(actual === 'ajustes'))
}

async function abrirSkin () {
  cerrarAjustes()
  $('.panel-skin').hidden = false
  $('.noticias').hidden = true
  marcarRail()
  skin.nueva = null
  skin.imagenNueva = null
  estadoSkin('Cargando tu skin…')
  const r = await api.skinActual()
  if (!r.ok) return estadoSkin(r.error, 'error')
  skin.imagen = r.imagen
  skin.modelo = r.modelo
  document.querySelector(`input[name="modeloSkin"][value="${r.modelo}"]`).checked = true
  $('[data-nota-skin]').hidden = !r.sinPremium
  estadoSkin(r.estado === 'pendiente'
    ? 'Se pondrá sola la próxima vez que entres al servidor.'
    : r.estado === 'puesta' ? 'Ya está puesta en el servidor.' : '', r.estado === 'puesta' ? 'bien' : '')
  await pintarSkin()
}

function cerrarSkin () {
  const panel = $('.panel-skin')
  if (panel.hidden) return
  panel.hidden = true
  $('.noticias').hidden = false
  marcarRail()
}

async function elegirSkin (archivo) {
  if (!archivo) return
  if (archivo.type && archivo.type !== 'image/png') return estadoSkin('La skin tiene que ser una imagen PNG.', 'error')
  let img
  try {
    img = await createImageBitmap(archivo)
  } catch {
    return estadoSkin('No se pudo abrir esa imagen.', 'error')
  }
  if (img.width !== 64 || (img.height !== 64 && img.height !== 32)) {
    return estadoSkin(`La skin tiene que medir 64×64 píxeles; esta mide ${img.width}×${img.height}.`, 'error')
  }
  skin.nueva = new Uint8Array(await archivo.arrayBuffer())
  skin.imagenNueva = img
  estadoSkin('Así quedará. Pulsa "Guardar skin" para ponértela.')
  await pintarSkin()
}

async function guardarSkin () {
  skin.ocupado = true
  await pintarSkin()
  estadoSkin('Guardando…')
  const r = await api.cambiarSkin(skin.nueva, modeloElegido())
  skin.ocupado = false
  if (r.ok) {
    skin.imagen = r.imagen
    skin.modelo = r.modelo
    skin.nueva = null
    skin.imagenNueva = null
    estadoSkin(r.sinPremium
      ? 'Lista. Se pondrá sola la próxima vez que entres al servidor.'
      : 'Skin guardada. La verás la próxima vez que entres al juego.', 'bien')
    if (r.imagen) await ponerCabeza(r.imagen)
    pintarPersonaje()
  } else {
    estadoSkin(r.error, 'error')
  }
  await pintarSkin()
}

let confirmarQuitar = null
async function quitarSkin () {
  const boton = $('[data-accion="quitar-skin"]')
  // Primer clic: pide confirmación en el propio botón
  if (!confirmarQuitar) {
    boton.textContent = 'Pulsa otra vez para quitarla'
    confirmarQuitar = setTimeout(() => { confirmarQuitar = null; boton.textContent = 'Quitar mi skin' }, 4000)
    return
  }
  clearTimeout(confirmarQuitar)
  confirmarQuitar = null
  boton.textContent = 'Quitar mi skin'
  skin.ocupado = true
  await pintarSkin()
  estadoSkin('Quitando…')
  const r = await api.quitarSkin()
  skin.ocupado = false
  if (r.ok) {
    skin.imagen = r.imagen
    skin.modelo = r.modelo
    skin.nueva = null
    skin.imagenNueva = null
    estadoSkin(r.sinPremium ? 'Se quitará la próxima vez que entres al servidor.' : 'Listo: ahora tienes la skin por defecto.', 'bien')
    await ponerCabeza(r.imagen)
    pintarPersonaje()
  } else {
    estadoSkin(r.error, 'error')
  }
  await pintarSkin()
}

function abrirAjustes () {
  cerrarSkin()
  $('.ajustes').hidden = false
  $('.noticias').hidden = true
  marcarRail()
  $('#ram').focus()
}

function cerrarAjustes () {
  const panel = $('.ajustes')
  if (panel.hidden) return
  panel.hidden = true
  $('.noticias').hidden = false
  marcarRail()
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
  // Y las novedades, con el último commit de GitHub (como mucho cada 5 minutos)
  if (Date.now() - refresco.ultimoCompleto > 5 * 60 * 1000) refrescarPerfil(true)
})

/*
 * Novedades al día con el launcher abierto: cada 3 minutos se mira el modpack publicado
 * (noticias, episodio, cuenta atrás, temporada, enlaces...). Mientras se prepara el juego, no.
 */
const refresco = { ultimoCompleto: Date.now() }
async function refrescarPerfil (completo) {
  if (estado.ocupado || !estado.perfil) return
  if (completo) refresco.ultimoCompleto = Date.now()
  const r = await api.buscarActualizaciones({ rapido: !completo }).catch(() => null)
  if (!r?.ok || r.origen === 'copia' || r.sinCambios || estado.ocupado) return
  if (JSON.stringify(r.perfil) === JSON.stringify(estado.perfil)) return
  estado.perfil = r.perfil
  pintarPerfil()
}
setInterval(() => refrescarPerfil(false), 3 * 60 * 1000)

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
  if (accion === 'abrir-skin') $('.panel-skin').hidden ? abrirSkin() : cerrarSkin()
  if (accion === 'cerrar-skin') cerrarSkin()
  if (accion === 'ir-inicio') { cerrarAjustes(); cerrarSkin() }
  if (accion === 'copiar-ip') copiarIp()
  if (accion === 'elegir-skin') $('[data-archivo-skin]').click()
  if (accion === 'guardar-skin') guardarSkin()
  if (accion === 'quitar-skin') quitarSkin()
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
  else { cerrarAjustes(); cerrarSkin() }
})

$('.sin-premium').addEventListener('submit', loginSinPremium)
$('#ram').addEventListener('input', (e) => { $('.ajuste__valor').textContent = gb(Number(e.target.value)) })
$('#ram').addEventListener('change', (e) => guardarAjustes({ ram: Number(e.target.value) }))
$('[data-archivo-skin]').addEventListener('change', (e) => { elegirSkin(e.target.files[0]); e.target.value = '' })
document.querySelectorAll('input[name="modeloSkin"]').forEach((r) => r.addEventListener('change', pintarSkin))
const panelSkin = $('.panel-skin')
panelSkin.addEventListener('dragover', (e) => { e.preventDefault(); panelSkin.classList.add('soltando') })
panelSkin.addEventListener('dragleave', (e) => { if (!panelSkin.contains(e.relatedTarget)) panelSkin.classList.remove('soltando') })
panelSkin.addEventListener('drop', (e) => {
  e.preventDefault()
  panelSkin.classList.remove('soltando')
  elegirSkin(e.dataTransfer.files[0])
})

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
