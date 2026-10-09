import * as n from './nucleo.js'

const $ = (selector, raiz = document) => raiz.querySelector(selector)
const CLAVE_LLAVE = 'rataland-panel-llave'
// v2: ahora también guarda dependencias e incompatibilidades
const CLAVE_INFO_MODS = 'rataland-panel-info-mods-2'
const IRIS = 'YL57xq9U'
const PAGINA_ATERNOS = 'https://aternos.org/servers/'

/** Crea elementos sin usar innerHTML (los textos de Modrinth no son de fiar). */
function h (etiqueta, props = {}, ...hijos) {
  const el = document.createElement(etiqueta)
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (k === 'value') el.value = v
    else if (k === 'checked') el.checked = v
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo == null || hijo === false) continue
    el.append(hijo instanceof Node ? hijo : String(hijo))
  }
  return el
}

/* ---------- Iconos pixel-art (8x8) ---------- */

const ICONOS = {
  resumen: ['##....##', '###..###', '.######.', '.#.##.#.', '.######.', '..####..', '...##...', '........'],
  mods: ['########', '#......#', '#.####.#', '#.#..#.#', '#.#..#.#', '#.####.#', '#......#', '########'],
  texturas: ['......##', '.....###', '....###.', '...###..', '..###...', '.##.....', '###.....', '##......'],
  shaders: ['#..##..#', '.#....#.', '..####..', '#.####.#', '#.####.#', '..####..', '.#....#.', '#..##..#'],
  servidor: ['########', '#.....##', '########', '........', '########', '#.....##', '########', '........'],
  noticias: ['#######.', '#.....##', '#.###..#', '#......#', '#.####.#', '#......#', '#.###..#', '########'],
  evento: ['########', '.#....#.', '..#..#..', '...##...', '...##...', '..####..', '.######.', '########'],
  enlaces: ['.....##.', '....#..#', '....#..#', '...#.##.', '.##.#...', '#..#....', '#..#....', '.##.....'],
  descargar: ['...##...', '...##...', '...##...', '.######.', '..####..', '...##...', '........', '########'],
  temporada: ['########', '#......#', '#....#.#', '#......#', '#..#...#', '#.###.##', '########', '........'],
  launcher: ['..####..', '.#....#.', '#......#', '#.#..#.#', '#......#', '#.####.#', '.#....#.', '..####..']
}

function pixel (nombre) {
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 8 8')
  svg.setAttribute('class', 'pixel')
  svg.setAttribute('aria-hidden', 'true')
  ICONOS[nombre].forEach((fila, y) => [...fila].forEach((c, x) => {
    if (c !== '#') return
    const r = document.createElementNS(NS, 'rect')
    r.setAttribute('x', x)
    r.setAttribute('y', y)
    r.setAttribute('width', 1)
    r.setAttribute('height', 1)
    svg.append(r)
  }))
  return svg
}

const SECCIONES = [
  { id: 'resumen', nombre: 'Resumen' },
  { grupo: 'Modpack' },
  { id: 'mods', nombre: 'Mods', categoria: true },
  { id: 'texturas', nombre: 'Packs de texturas', categoria: true },
  { id: 'shaders', nombre: 'Shaders', categoria: true },
  { grupo: 'Servidor' },
  { id: 'servidor', nombre: 'Servidor y versión' },
  { grupo: 'Lo que ven los jugadores' },
  { id: 'temporada', nombre: 'Temporada y fondo' },
  { id: 'noticias', nombre: 'Noticias' },
  { id: 'evento', nombre: 'Cuenta atrás' },
  { id: 'enlaces', nombre: 'Enlaces' }
]
const IDS = new Set(SECCIONES.filter((s) => s.id).map((s) => s.id))
const NOMBRE_CATEGORIA = { mods: 'mods', texturas: 'packs de texturas', shaders: 'shaders' }
const NOMBRES_ENLACE = { discord: 'Discord', youtube: 'YouTube', tiktok: 'TikTok', twitch: 'Twitch', x: 'X', web: 'Web' }

/* ---------- Formatos ---------- */

/** Cargador de mods del modpack ("fabric" o "neoforge") y su nombre para mostrar. */
const loaderDe = () => ajustes?.loader?.tipo || 'fabric'
const nombreLoader = () => n.nombreLoader(loaderDe())

const tamano = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
const descargas = (x) => x >= 1e6 ? `${(x / 1e6).toFixed(1).replace('.', ',')} M` : x >= 1000 ? `${Math.round(x / 1000)} mil` : String(x)
const fecha = (iso) => new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })

function haceCuanto (iso) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  for (const [unidad, seg] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(s) >= seg) return rtf.format(Math.round(s / seg), unidad)
  }
  return 'hace un momento'
}

function cuentaAtras (ev) {
  const ms = new Date(ev?.fecha).getTime() - Date.now()
  if (!ev?.fecha || Number.isNaN(ms)) return null
  if (ms <= 0) return `${ev.titulo || 'El evento'}: ¡Ya empezó!`
  const s = Math.floor(ms / 1000)
  return `${ev.titulo || 'El próximo evento'} empieza en ${Math.floor(s / 86400)}d ${String(Math.floor(s / 3600) % 24).padStart(2, '0')}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m`
}

/* ---------- Estado ---------- */

let gh = new n.GitHub(leerLlave())
let usuario = null
let base = null // lo que hay publicado en GitHub
let ajustes = null // copia editable de modpack.json
let nuevos = new Map() // ruta -> archivo subido sin publicar
let borrados = new Set() // rutas del repositorio que se quitarán
let identificados = new Map() // sha1 -> datos del proyecto en Modrinth
let actualizaciones = new Map() // ruta -> { entrada, origen }
let seccion = IDS.has(location.hash.slice(1)) ? location.hash.slice(1) : 'resumen'
let versionesMc = []
let versionesLoader = []
let compatibilidad = null
let servidor = { cargando: false, datos: null, error: null, hora: 0 }
let historia = { publicacion: undefined, launcher: undefined }
let comparacion = { texto: '', cargando: false, progreso: '', resultado: null, registro: null, error: null }
let cajon = { categoria: 'mods', texto: '', resultados: null, cargando: false }
let menuCuentaAbierto = false
let listaCambiosAbierta = false

function leerLlave () {
  try { return localStorage.getItem(CLAVE_LLAVE) || sessionStorage.getItem(CLAVE_LLAVE) || '' } catch { return '' }
}

function guardarLlave (llave, recordar) {
  try {
    localStorage.removeItem(CLAVE_LLAVE)
    sessionStorage.removeItem(CLAVE_LLAVE)
    if (llave) (recordar ? localStorage : sessionStorage).setItem(CLAVE_LLAVE, llave)
  } catch { /* almacenamiento no disponible: la llave dura lo que la pestaña */ }
}

function llaveRecordada () {
  try { return Boolean(localStorage.getItem(CLAVE_LLAVE)) } catch { return false }
}

/* ---------- Avisos y confirmaciones ---------- */

function avisar (texto, tipo = 'ok') {
  const el = h('div', { class: `aviso${tipo === 'error' ? ' aviso--error' : ''}`, role: tipo === 'error' ? 'alert' : 'status' }, texto)
  $('[data-avisos]').append(el)
  setTimeout(() => el.remove(), tipo === 'error' ? 9000 : 5000)
}

/**
 * Pide confirmación con un diálogo del panel (no el del navegador).
 * El foco empieza en "cancelar" para que un Enter sin querer no borre nada.
 */
function confirmar ({ titulo, texto, lista = [], aceptar, cancelar = 'Cancelar' }) {
  const d = $('[data-dialogo="confirmar"]')
  $('[data-confirmar-titulo]', d).textContent = titulo
  $('[data-confirmar-texto]', d).textContent = texto
  const ul = $('[data-confirmar-lista]', d)
  ul.replaceChildren(...lista.map((x) => h('li', {}, x)))
  ul.hidden = !lista.length
  const botonAceptar = $('[data-confirmar-aceptar]', d)
  const botonCancelar = $('[data-confirmar-cancelar]', d)
  botonAceptar.textContent = aceptar
  botonCancelar.textContent = cancelar
  d.showModal()
  botonCancelar.focus()

  // Se responde al botón pulsado (o a Escape) directamente, sin esperar al evento "close".
  return new Promise((resolve) => {
    const terminar = (respuesta) => (e) => {
      e.preventDefault()
      botonAceptar.removeEventListener('click', alAceptar)
      botonCancelar.removeEventListener('click', alCancelar)
      d.removeEventListener('cancel', alCancelar)
      if (d.open) d.close()
      resolve(respuesta)
    }
    const alAceptar = terminar(true)
    const alCancelar = terminar(false)
    botonAceptar.addEventListener('click', alAceptar)
    botonCancelar.addEventListener('click', alCancelar)
    d.addEventListener('cancel', alCancelar)
  })
}

function abrirDialogo (nombre) {
  const d = $(`[data-dialogo="${nombre}"]`)
  if (!d.open) d.showModal()
  return d
}

/* ---------- Datos derivados ---------- */

function sha1DeRepo (ruta) {
  const a = base.archivos.get(ruta)
  const m = base.manifiesto.archivos?.find((x) => x.ruta === ruta)
  return m && (!m.git || m.git === a?.git) ? m.sha1 : null
}

function elementosDe (categoria) {
  const prefijo = n.CATEGORIAS[categoria].carpeta + '/'
  const lista = []
  for (const a of base.archivos.values()) {
    if (!a.ruta.startsWith(prefijo) || borrados.has(a.ruta) || nuevos.has(a.ruta)) continue
    const sha1 = sha1DeRepo(a.ruta)
    const info = identificados.get(sha1)
    lista.push({ tipo: 'repo', ruta: a.ruta, tamano: a.tamano, sha1, nombre: info?.nombre, icono: info?.icono, numero: info?.numero, proyecto: info?.proyecto })
  }
  for (const nn of nuevos.values()) {
    if (!nn.ruta.startsWith(prefijo)) continue
    const info = identificados.get(nn.sha1)
    lista.push({ tipo: 'nuevo', ruta: nn.ruta, tamano: nn.tamano, sha1: nn.sha1, nombre: info?.nombre || nn.nombre, icono: info?.icono, numero: info?.numero || nn.version, aviso: nn.aviso, reemplaza: nn.reemplaza, proyecto: info?.proyecto })
  }
  for (const e of ajustes.externos || []) {
    if (!e.ruta.startsWith(prefijo)) continue
    lista.push({ tipo: 'modrinth', ruta: e.ruta, url: e.url, tamano: e.tamano, sha1: e.sha1, nombre: e.modrinth?.nombre, icono: e.modrinth?.icono, numero: e.modrinth?.numero, proyecto: e.modrinth?.proyecto })
  }
  for (const x of lista) {
    if (!x.nombre && /rataland-menu/i.test(x.ruta)) {
      x.nombre = 'RataLand (menús y pantalla de carga)'
      x.icono = 'img/icono.png'
    }
  }
  const nombre = (x) => (x.nombre || x.ruta.split('/').pop()).toLowerCase()
  return lista.sort((a, b) => nombre(a).localeCompare(nombre(b)))
}

function rutaOcupada (ruta) {
  return (base.archivos.has(ruta) && !borrados.has(ruta)) || nuevos.has(ruta) || (ajustes.externos || []).some((e) => e.ruta === ruta)
}

function proyectosPresentes () {
  const ids = new Set()
  for (const c of Object.keys(n.CATEGORIAS)) for (const e of elementosDe(c)) if (e.proyecto) ids.add(e.proyecto)
  return ids
}

/** Archivos del repositorio tal como quedarán al publicar. */
function archivosFinales () {
  const m = new Map()
  for (const a of base.archivos.values()) if (!borrados.has(a.ruta)) m.set(a.ruta, { ...a, sha1: sha1DeRepo(a.ruta) || undefined })
  for (const nn of nuevos.values()) m.set(nn.ruta, { ruta: nn.ruta, git: nn.git, tamano: nn.tamano, sha1: nn.sha1 })
  return m
}

/** Lista legible de lo que se va a publicar. */
function cambios () {
  if (!base) return []
  const quitados = []
  const anadidos = []
  for (const r of borrados) {
    if (nuevos.has(r)) continue
    const info = identificados.get(sha1DeRepo(r))
    quitados.push({ nombre: info?.nombre || r.split('/').pop(), proyecto: info?.proyecto })
  }
  for (const nn of nuevos.values()) {
    const info = identificados.get(nn.sha1)
    anadidos.push({ nombre: info?.nombre || nn.nombre, proyecto: info?.proyecto, numero: nn.version, reemplaza: nn.reemplaza })
  }
  const antes = new Map((base.ajustes.externos || []).map((e) => [e.ruta, e]))
  const ahora = new Map((ajustes.externos || []).map((e) => [e.ruta, e]))
  for (const [r, e] of ahora) if (!antes.has(r)) anadidos.push({ nombre: e.modrinth?.nombre || r, proyecto: e.modrinth?.proyecto, numero: e.modrinth?.numero })
  for (const [r, e] of antes) if (!ahora.has(r)) quitados.push({ nombre: e.modrinth?.nombre || r, proyecto: e.modrinth?.proyecto })

  const lista = []
  for (const a of anadidos) {
    const i = a.proyecto ? quitados.findIndex((q) => q.proyecto === a.proyecto) : -1
    if (i >= 0) {
      quitados.splice(i, 1)
      lista.push(`Actualizar ${a.nombre}${a.numero ? ` a ${a.numero}` : ''}`)
    } else {
      lista.push(`${a.reemplaza ? 'Reemplazar' : 'Añadir'} ${a.nombre}`)
    }
  }
  for (const q of quitados) lista.push(`Quitar ${q.nombre}`)

  // Lo vacío cuenta como "nada" (p. ej. abrir Cuenta atrás sin rellenarla no es un cambio).
  const normal = (k, v) => {
    if (k === 'evento') return v?.fecha ? v : null
    if (k === 'episodio') return v?.url ? v : null
    if (k === 'escena') return v && v !== 'noche' ? v : null
    if (k === 'frases') return v?.some((t) => t.trim()) ? v.filter((t) => t.trim()) : null
    if (typeof v === 'string') return v || null
    if (k === 'enlaces') return v && Object.values(v).some(Boolean) ? Object.fromEntries(Object.entries(v).filter(([, url]) => url)) : null
    if (Array.isArray(v)) return v.length ? v : null
    return v ?? null
  }
  const igual = (k) => JSON.stringify(normal(k, base.ajustes[k])) === JSON.stringify(normal(k, ajustes[k]))
  if (!igual('minecraft') || !igual('loader')) lista.push(`Cambiar a Minecraft ${ajustes.minecraft} con ${nombreLoader()} ${ajustes.loader?.version}`)
  if (!igual('servidor')) lista.push('Cambiar los datos del servidor')
  if (!igual('temporada')) lista.push(ajustes.temporada ? `Llamar a la temporada "${ajustes.temporada}"` : 'Quitar el nombre de la temporada')
  if (!igual('escena')) lista.push(`Cambiar el fondo a ${n.ESCENAS[ajustes.escena] || n.ESCENAS.noche}`)
  if (!igual('episodio')) lista.push(ajustes.episodio?.url ? 'Cambiar el último episodio' : 'Quitar el último episodio')
  if (!igual('frases')) lista.push('Cambiar las frases del menú')
  if (!igual('noticias')) lista.push('Cambiar las noticias')
  if (!igual('evento')) lista.push(ajustes.evento?.fecha ? 'Cambiar la cuenta atrás' : 'Quitar la cuenta atrás')
  if (!igual('enlaces')) lista.push('Cambiar los enlaces')
  if (!igual('packsActivos')) lista.push('Cambiar qué packs de texturas se activan')
  return lista
}

/* ---------- Cuenta de GitHub (cabecera) ---------- */

/** Sin conexión: botón para conectar. Conectado: tu foto y nombre, con un menú donde está "Desconectar". */
function pintarCuenta () {
  const cuenta = $('[data-cuenta]')
  if (!usuario) {
    menuCuentaAbierto = false
    cuenta.replaceChildren(
      h('span', {}, 'Solo lectura'),
      h('button', { class: 'boton boton--pequeno', onclick: () => abrirDialogo('llave') }, 'Conectar con GitHub'))
    return
  }
  const boton = h('button', {
    class: 'cuenta-boton',
    'aria-haspopup': 'true',
    'aria-expanded': String(menuCuentaAbierto),
    'aria-controls': 'menu-cuenta',
    'aria-label': `Cuenta de GitHub: ${usuario}`,
    onclick: () => alternarMenuCuenta()
  },
  h('img', { class: 'cuenta-boton__foto', src: `https://github.com/${encodeURIComponent(usuario)}.png?size=60`, alt: '' }),
  h('span', {}, usuario),
  h('span', { class: 'cuenta-boton__flecha', 'aria-hidden': 'true' }))

  const menu = h('div', { class: 'menu-cuenta', id: 'menu-cuenta', hidden: !menuCuentaAbierto },
    h('p', {}, 'Conectado con GitHub como ', h('strong', {}, usuario), '.'),
    h('p', { class: 'menu-cuenta__nota' }, llaveRecordada()
      ? 'La llave está guardada en este navegador, así que puedes publicar desde aquí.'
      : 'La llave solo dura mientras esta pestaña esté abierta.'),
    h('div', { class: 'menu-cuenta__separador' }),
    h('button', { class: 'boton-quitar', onclick: pedirDesconectar }, 'Desconectar este navegador'))
  cuenta.replaceChildren(boton, menu)
}

function alternarMenuCuenta (abrir = !menuCuentaAbierto) {
  if (menuCuentaAbierto === abrir) return
  menuCuentaAbierto = abrir
  pintarCuenta()
  if (abrir) $('#menu-cuenta button')?.focus()
}

async function pedirDesconectar () {
  alternarMenuCuenta(false)
  const pendientes = cambios().length
  const si = await confirmar({
    titulo: '¿Desconectar este navegador?',
    texto: 'Se borrará la llave de GitHub de este navegador y el panel quedará en solo lectura. ' +
      'Para volver a publicar tendrás que pegar la llave otra vez, o crear una nueva si no la guardaste.' +
      (pendientes === 1 ? ' Tu cambio sin publicar no se pierde.' : pendientes > 1 ? ` Tus ${pendientes} cambios sin publicar no se pierden.` : ''),
    aceptar: 'Desconectar',
    cancelar: 'Seguir conectado'
  })
  if (!si) return
  desconectar()
  avisar('Desconectado. El panel está en modo solo lectura.')
}

/* ---------- Marco: cabecera, menú lateral y barra de cambios ---------- */

function pintarMarco () {
  pintarCuenta()
  const lista = cambios()

  const estado = $('[data-estado-cambios]')
  estado.hidden = !base
  estado.textContent = lista.length ? `${lista.length} ${lista.length === 1 ? 'cambio' : 'cambios'} sin publicar` : 'Todo publicado'
  estado.classList.toggle('barra__estado--pendiente', lista.length > 0)

  const dock = $('[data-dock]')
  dock.hidden = !lista.length
  if (!lista.length) listaCambiosAbierta = false
  $('[data-dock-texto]').textContent = `${lista.length} ${lista.length === 1 ? 'cambio sin publicar' : 'cambios sin publicar'}`
  $('[data-dock-lista]').replaceChildren(...lista.map((c) => h('li', {}, c)))
  $('[data-dock-lista]').hidden = !listaCambiosAbierta
  const ver = $('[data-accion="ver-cambios"]')
  ver.setAttribute('aria-expanded', String(listaCambiosAbierta))
  ver.textContent = listaCambiosAbierta ? 'Ocultar' : 'Ver cuáles'

  $('[data-lateral]').replaceChildren(...SECCIONES.map((s) => {
    if (s.grupo) return h('p', { class: 'lateral__grupo' }, s.grupo)
    return h('button', {
      class: 'lateral__opcion',
      'aria-current': s.id === seccion ? 'page' : null,
      onclick: () => irA(s.id)
    }, pixel(s.id), s.nombre, s.categoria && base ? h('span', { class: 'lateral__cuenta' }, elementosDe(s.id).length) : null)
  }))
}

function pintar () {
  pintarMarco()
  if (!base) return
  const vistas = { resumen: vistaResumen, servidor: vistaServidor, temporada: vistaTemporada, noticias: vistaNoticias, evento: vistaEvento, enlaces: vistaEnlaces }
  const vista = (vistas[seccion] || (() => vistaCategoria(seccion)))()
  $('[data-contenido]').replaceChildren(vista)
  if (seccion === 'mods' && revision.clave !== claveMods() && elementosDe('mods').length) setTimeout(revisarMods, 0)
}

function irA (id) {
  if (location.hash !== `#${id}`) location.hash = id
  else cambiarSeccion(id)
}

function cambiarSeccion (id) {
  seccion = IDS.has(id) ? id : 'resumen'
  pintar()
  window.scrollTo(0, 0)
  $('[data-contenido]').focus({ preventScroll: true })
  if (seccion === 'resumen' || seccion === 'servidor') consultarServidor()
}

window.addEventListener('hashchange', () => cambiarSeccion(location.hash.slice(1)))

function encabezado (titulo, descripcion, ...acciones) {
  return h('div', { class: 'encabezado' },
    h('div', {}, h('h1', {}, titulo), descripcion ? h('p', {}, descripcion) : null),
    acciones.length ? h('div', { class: 'encabezado__acciones' }, acciones) : null)
}

function campo (etiqueta, control, ayuda) {
  return h('label', { class: 'campo' }, h('span', { class: 'campo__etiqueta' }, etiqueta), control, ayuda ? h('span', { class: 'campo__ayuda' }, ayuda) : null)
}

/* ---------- Estado del servidor ---------- */

async function consultarServidor (forzar = false) {
  const { ip, puerto } = ajustes?.servidor || {}
  if (!ip || servidor.cargando) return
  if (!forzar && Date.now() - servidor.hora < 60000) return
  servidor = { ...servidor, cargando: true, error: null }
  pintar()
  try {
    servidor = { cargando: false, datos: await n.estadoServidor(ip, puerto), error: null, hora: Date.now() }
    // Mientras arranca, se vuelve a mirar en 30 segundos
    if (servidor.datos.encendiendo) setTimeout(() => { if (seccion === 'resumen' || seccion === 'servidor') consultarServidor(true) }, 30000)
  } catch (e) {
    servidor = { cargando: false, datos: null, error: e.message, hora: Date.now() }
  }
  pintar()
}

function vistaEstado () {
  const { ip, puerto } = ajustes.servidor || {}
  const direccion = puerto && Number(puerto) !== 25565 ? `${ip}:${puerto}` : ip
  const d = servidor.datos
  const actualizar = h('button', { class: 'boton boton--pequeno', disabled: servidor.cargando, onclick: () => consultarServidor(true) }, servidor.cargando ? 'Comprobando…' : 'Volver a comprobar')
  const copiar = h('button', {
    class: 'boton-icono',
    'aria-label': 'Copiar la dirección',
    title: 'Copiar la dirección',
    onclick: async () => {
      try { await navigator.clipboard.writeText(direccion); avisar('Dirección copiada.') } catch { avisar('No se pudo copiar la dirección.', 'error') }
    }
  }, '⧉')

  let titulo
  let luz
  const lineas = []
  if (!d && servidor.cargando) {
    titulo = 'Comprobando…'
    luz = ''
  } else if (!d) {
    titulo = 'Sin datos'
    luz = ''
    lineas.push(h('p', {}, servidor.error || 'No se pudo consultar el servidor.'))
  } else if (d.encendido) {
    titulo = 'Servidor encendido'
    luz = 'luz--encendido'
    lineas.push(h('p', {}, d.sinDatos
      ? 'Acaba de encenderse: el número de jugadores aparecerá en unos minutos.'
      : `${d.jugadores} de ${d.maximo} ${d.maximo === 1 ? 'jugador conectado' : 'jugadores conectados'}. Minecraft ${d.versionMinecraft || d.version}.`))
    if (d.lista.length) {
      lineas.push(h('div', { class: 'cabezas' }, d.lista.map((p) => h('img', { src: `https://mc-heads.net/avatar/${encodeURIComponent(p.uuid || p.nombre)}/26`, alt: p.nombre, title: p.nombre }))))
    }
    if (d.versionMinecraft && d.versionMinecraft !== ajustes.minecraft) {
      lineas.push(h('p', { class: 'aviso-caja aviso-caja--mal' }, `El servidor está en Minecraft ${d.versionMinecraft} y el modpack en ${ajustes.minecraft}. Los jugadores no podrán entrar hasta que coincidan.`))
    }
  } else if (d.encendiendo) {
    titulo = 'Encendiéndose…'
    luz = 'luz--encendiendo'
    lineas.push(h('p', {}, 'El servidor está arrancando. En un momento los jugadores podrán entrar.'))
  } else {
    titulo = 'Servidor apagado'
    luz = 'luz--apagado'
    lineas.push(/\.aternos\.me$/i.test(ip)
      ? h('p', {}, 'Los jugadores no pueden entrar ahora mismo. ', h('a', { href: PAGINA_ATERNOS, target: '_blank', rel: 'noopener' }, 'Enciéndelo en Aternos'), '.')
      : h('p', {}, 'Los jugadores no pueden entrar ahora mismo. Con el encendido automático, arrancará en cuanto alguien pulse Jugar en el launcher.'))
  }

  // El dato puede tener unos minutos (la web que consulta el servidor lo guarda en caché)
  const viejo = d?.comprobado && Date.now() - d.comprobado > 60000
  return h('div', { class: 'estado' },
    h('h2', { class: 'estado__titulo' }, h('span', { class: `luz ${luz}`, 'aria-hidden': 'true' }), titulo),
    h('p', {}, h('span', { class: 'direccion' }, direccion, copiar)),
    lineas,
    h('p', { class: 'estado__pie' }, actualizar, viejo ? h('span', { class: 'campo__ayuda' }, `Comprobado ${haceCuanto(new Date(d.comprobado).toISOString())}`) : null))
}

/* ---------- Resumen ---------- */

async function cargarHistoria () {
  const [publicacion, launcher] = await Promise.all([
    n.ultimaPublicacion(gh).catch(() => null),
    n.ultimaVersionLauncher(gh).catch(() => null)
  ])
  historia = { publicacion, launcher }
  if (seccion === 'resumen') pintar()
}

function vistaResumen () {
  const cuentas = Object.fromEntries(Object.keys(n.CATEGORIAS).map((c) => [c, elementosDe(c).length]))
  const p = historia.publicacion
  const l = historia.launcher
  const evento = cuentaAtras(ajustes.evento)
  const noticia = (ajustes.noticias || [])[0]
  const enlaces = Object.entries(ajustes.enlaces || {}).filter(([, url]) => url).map(([k]) => NOMBRES_ENLACE[k] || k)

  return h('section', { class: 'seccion' },
    h('h1', { class: 'oculto-visual' }, 'Resumen'),
    h('div', { class: 'portada' }, vistaEstado()),
    h('div', { class: 'columnas' },
      h('section', { class: 'bloque' },
        h('h2', {}, pixel('mods'), 'Modpack'),
        h('dl', { class: 'datos' },
          h('dt', {}, 'Versión'), h('dd', {}, `Minecraft ${ajustes.minecraft} con ${nombreLoader()} ${ajustes.loader?.version}`),
          h('dt', {}, 'Contenido'), h('dd', {}, `${cuentas.mods} mods, ${cuentas.texturas} packs de texturas y ${cuentas.shaders} shaders`),
          h('dt', {}, 'Publicado'), h('dd', {}, p === undefined ? 'Cargando…' : p ? [h('a', { href: p.url, target: '_blank', rel: 'noopener' }, haceCuanto(p.fecha)), `: ${p.mensaje}`] : 'Sin datos')),
        h('p', { class: 'bloque__pie' }, h('button', { class: 'boton boton--pequeno', onclick: () => irA('mods') }, 'Gestionar mods'))),
      h('section', { class: 'bloque' },
        h('h2', {}, pixel('launcher'), 'Launcher'),
        h('dl', { class: 'datos' },
          h('dt', {}, 'Última versión'), h('dd', {}, l === undefined ? 'Cargando…' : l ? `${l.version}, del ${fecha(l.fecha)}` : 'Sin datos'),
          h('dt', {}, 'Descargas'), h('dd', {}, l ? `${l.descargas} ${l.descargas === 1 ? 'vez' : 'veces'} el instalador` : '—')),
        h('p', { class: 'bloque__pie' }, l ? h('a', { href: l.url, target: '_blank', rel: 'noopener' }, 'Página de descargas') : null)),
      h('section', { class: 'bloque' },
        h('h2', {}, pixel('noticias'), 'Lo que ven los jugadores'),
        h('dl', { class: 'datos' },
          h('dt', {}, 'Temporada'), h('dd', {}, [ajustes.temporada || 'Sin nombre', `, con el fondo ${n.ESCENAS[ajustes.escena] || n.ESCENAS.noche}`]),
          h('dt', {}, 'Episodio'), h('dd', {}, ajustes.episodio?.url ? (ajustes.episodio.titulo || 'Sin título') : h('button', { class: 'enlace-boton', onclick: () => irA('temporada') }, 'Añadir el último')),
          h('dt', {}, 'Cuenta atrás'), h('dd', {}, evento || h('button', { class: 'enlace-boton', onclick: () => irA('evento') }, 'Añadir una')),
          h('dt', {}, 'Última noticia'), h('dd', {}, noticia?.titulo || h('button', { class: 'enlace-boton', onclick: () => irA('noticias') }, 'Escribir una')),
          h('dt', {}, 'Enlaces'), h('dd', {}, enlaces.length ? enlaces.join(', ') : h('button', { class: 'enlace-boton', onclick: () => irA('enlaces') }, 'Añadir Discord'))))))
}

/* ---------- Mods, texturas y shaders ---------- */

function vistaCategoria (categoria) {
  const c = n.CATEGORIAS[categoria]
  const elementos = elementosDe(categoria)
  const descripciones = {
    mods: `Los jugadores reciben estos mods al pulsar Jugar. Solo valen mods de ${nombreLoader()} para Minecraft ${ajustes.minecraft}.`,
    texturas: 'Los marcados "Para todos" se activan solos en el juego de cada jugador. Los demás quedan disponibles en Opciones → Paquetes de recursos.',
    shaders: 'Los jugadores los eligen en Opciones → Gráficos → Paquetes de shaders. Necesitan el mod Iris.'
  }
  const titulos = { mods: 'Mods', texturas: 'Packs de texturas', shaders: 'Shaders' }

  const selector = h('input', { type: 'file', accept: c.extension, multiple: true, hidden: true, onchange: (e) => subirArchivos(categoria, [...e.target.files]) })
  const hayModrinth = elementos.some((e) => e.proyecto)
  const soltar = h('div', { class: 'soltar', role: 'button', tabindex: '0', onclick: () => selector.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selector.click() } } },
    h('strong', {}, `Arrastra aquí archivos ${c.extension}`),
    h('span', {}, 'o pulsa para elegirlos de tu PC'))

  const seccionEl = h('section', { class: 'seccion' },
    encabezado(titulos[categoria], descripciones[categoria],
      hayModrinth ? h('button', { class: 'boton boton--fantasma', onclick: (e) => buscarActualizaciones(categoria, e.currentTarget) }, 'Buscar actualizaciones') : null,
      categoria === 'mods' && elementos.length ? h('button', { class: 'boton boton--fantasma', onclick: abrirZipServidor }, 'Mods para el servidor') : null,
      h('button', { class: 'boton', onclick: () => abrirCajon(categoria) }, 'Añadir desde Modrinth')),
    categoria === 'mods' && elementos.length ? vistaRevision('mods') : null,
    categoria === 'shaders' && elementos.length && !proyectosPresentes().has(IRIS)
      ? h('p', { class: 'aviso-caja aviso-caja--mal' }, 'Los shaders no funcionarán sin el mod Iris. ', h('button', { class: 'enlace-boton', onclick: (ev) => anadirDeModrinth('mods', { project_id: IRIS }, ev.currentTarget) }, 'Añadir Iris'))
      : null,
    h('ul', { class: 'lista' }, elementos.length
      ? elementos.map((e) => filaElemento(categoria, e))
      : h('li', { class: 'vacio' }, `Todavía no hay ${NOMBRE_CATEGORIA[categoria]}.`)),
    soltar,
    selector)

  seccionEl.addEventListener('dragover', (e) => { e.preventDefault(); soltar.classList.add('soltar--activa') })
  seccionEl.addEventListener('dragleave', (e) => { if (!seccionEl.contains(e.relatedTarget)) soltar.classList.remove('soltar--activa') })
  seccionEl.addEventListener('drop', (e) => {
    e.preventDefault()
    soltar.classList.remove('soltar--activa')
    subirArchivos(categoria, [...e.dataTransfer.files])
  })
  return seccionEl
}

function filaElemento (categoria, e) {
  const actualizacion = actualizaciones.get(e.ruta)
  const activo = (ajustes.packsActivos || []).includes(e.ruta)
  const origen = e.tipo === 'modrinth'
    ? h('span', { class: 'chip chip--modrinth' }, 'Modrinth')
    : e.tipo === 'nuevo'
      ? h('span', { class: 'chip chip--nuevo' }, e.reemplaza ? 'Reemplaza al anterior' : 'Sin publicar')
      : h('span', { class: 'chip chip--subido' }, 'Subido')
  const detalle = [e.numero ? `Versión ${e.numero}` : null, e.tamano ? tamano(e.tamano) : null, e.ruta.split('/').pop()].filter(Boolean).join('. ')

  return h('li', { class: 'elemento' },
    e.icono ? h('img', { class: 'icono', src: e.icono, alt: '', loading: 'lazy' }) : h('div', { class: 'icono', 'aria-hidden': 'true' }),
    h('div', {},
      h('div', { class: 'elemento__nombre' }, e.nombre || e.ruta.split('/').pop(), origen),
      h('div', { class: 'elemento__detalle' }, detalle),
      e.aviso ? h('div', { class: 'elemento__aviso' }, e.aviso) : null),
    h('div', { class: 'elemento__acciones' },
      actualizacion ? h('button', { class: 'boton boton--pequeno', onclick: () => aplicarActualizacion(e.ruta) }, `Actualizar a ${actualizacion.entrada.modrinth.numero}`) : null,
      categoria === 'texturas'
        ? h('label', { class: 'interruptor' }, h('input', { type: 'checkbox', checked: activo, onchange: (ev) => cambiarActivo(e.ruta, ev.target.checked) }), 'Para todos')
        : null,
      h('button', {
        class: 'boton-icono',
        title: 'Descargar el archivo',
        'aria-label': `Descargar ${e.ruta.split('/').pop()}`,
        onclick: (ev) => descargarArchivo(e, ev.currentTarget)
      }, pixel('descargar')),
      h('button', { class: 'boton-quitar', 'aria-label': `Quitar ${e.nombre || e.ruta.split('/').pop()}`, onclick: () => quitar(e) }, 'Quitar')))
}

/** Descarga el archivo tal y como lo reciben los jugadores (el .jar o el .zip). */
async function descargarArchivo (e, boton) {
  const archivo = e.ruta.split('/').pop()
  boton.disabled = true
  try {
    guardarArchivo(new Blob([await bytesDe(e)]), archivo)
  } catch {
    avisar(`No se pudo descargar ${archivo}. Prueba otra vez en un momento.`, 'error')
  } finally {
    boton.disabled = false
  }
}

/* Cajón lateral para añadir desde Modrinth */

function abrirCajon (categoria, texto = '') {
  cajon = { categoria, texto, resultados: null, cargando: false }
  const d = $('[data-dialogo="anadir"]')
  $('[data-anadir-titulo]').textContent = `Añadir ${NOMBRE_CATEGORIA[categoria]}`
  $('[data-anadir-nota]').textContent = `Solo aparecen los compatibles con Minecraft ${ajustes.minecraft}${categoria === 'mods' ? ` y ${nombreLoader()}` : ''}. Sin buscar nada, salen los más populares.`
  const entrada = $('[data-anadir-buscador] input')
  entrada.value = texto
  entrada.placeholder = `Buscar ${NOMBRE_CATEGORIA[categoria]} en Modrinth`
  if (!d.open) d.showModal()
  entrada.focus()
  buscarEnCajon(texto)
}

async function buscarEnCajon (texto) {
  cajon = { ...cajon, texto, cargando: true, resultados: null }
  pintarCajon()
  try {
    cajon.resultados = await n.buscarEnModrinth(cajon.categoria, texto.trim(), ajustes.minecraft, loaderDe())
  } catch (e) {
    avisar(e.message, 'error')
    cajon.resultados = []
  }
  cajon.cargando = false
  pintarCajon()
}

function pintarCajon () {
  const caja = $('[data-anadir-resultados]')
  if (cajon.cargando) { caja.replaceChildren(h('p', { class: 'cargando' }, 'Buscando en Modrinth…')); return }
  const resultados = cajon.resultados || []
  if (!resultados.length) { caja.replaceChildren(h('p', { class: 'vacio' }, 'No hay resultados compatibles. Prueba con otro nombre.')); return }
  const presentes = proyectosPresentes()
  caja.replaceChildren(...resultados.map((r) => h('div', { class: 'resultado' },
    r.icon_url ? h('img', { class: 'icono', src: r.icon_url, alt: '', loading: 'lazy' }) : h('div', { class: 'icono', 'aria-hidden': 'true' }),
    h('div', {},
      h('div', { class: 'resultado__titulo' }, r.title),
      h('div', { class: 'resultado__descripcion' }, r.description),
      h('div', { class: 'resultado__descargas' }, `${descargas(r.downloads)} descargas`)),
    presentes.has(r.project_id)
      ? h('button', { class: 'boton boton--pequeno', disabled: true }, 'Ya está')
      : h('button', { class: 'boton boton--pequeno', onclick: (ev) => anadirDeModrinth(cajon.categoria, r, ev.currentTarget) }, 'Añadir'))))
}

$('[data-anadir-buscador]').addEventListener('submit', (e) => {
  e.preventDefault()
  buscarEnCajon(e.target.texto.value)
})

async function anadirDeModrinth (categoria, resultado, boton) {
  if (boton) { boton.disabled = true; boton.textContent = 'Añadiendo…' }
  try {
    const proyecto = await n.proyectoModrinth(resultado.project_id)
    const version = await n.versionCompatible(proyecto.id, categoria, ajustes.minecraft, loaderDe())
    if (!version) throw new Error(`${proyecto.title} no tiene versión para Minecraft ${ajustes.minecraft}${categoria === 'mods' ? ` con ${nombreLoader()}` : ''}.`)
    const entrada = n.entradaDeVersion(version, categoria, proyecto)
    if (rutaOcupada(entrada.ruta)) throw new Error(`${proyecto.title} ya está en el modpack.`)
    let extra = []
    let faltan = []
    if (categoria === 'mods') {
      ({ anadir: extra, faltan } = await n.dependenciasDe(version, ajustes.minecraft, proyectosPresentes(), loaderDe()))
      extra = extra.filter((x) => !rutaOcupada(x.ruta))
    }
    ajustes.externos = [...(ajustes.externos || []), entrada, ...extra]
    if (categoria === 'texturas') ajustes.packsActivos = [...(ajustes.packsActivos || []), entrada.ruta]
    avisar(`Añadido ${proyecto.title}${extra.length ? ` y lo que necesita: ${extra.map((x) => x.modrinth.nombre).join(', ')}` : ''}.`)
    if (faltan.length) avisar(`${proyecto.title} necesita ${faltan.join(', ')}, que no tiene versión para ${ajustes.minecraft}.`, 'error')
  } catch (e) {
    avisar(e.message, 'error')
    if (boton) { boton.disabled = false; boton.textContent = 'Añadir' }
  }
  pintar()
  if ($('[data-dialogo="anadir"]').open) pintarCajon()
}

async function subirArchivos (categoria, archivos) {
  const c = n.CATEGORIAS[categoria]
  for (const archivo of archivos) {
    try {
      const nombre = archivo.name.replace(/[\\/:*?"<>|]/g, '_')
      const bytes = new Uint8Array(await archivo.arrayBuffer())
      const analisis = await n.analizarArchivo(window.JSZip, categoria, nombre, bytes, ajustes.minecraft, loaderDe())
      if (analisis.error) { avisar(`${archivo.name}: ${analisis.error}`, 'error'); continue }
      const ruta = `${c.carpeta}/${nombre}`
      if ((ajustes.externos || []).some((e) => e.ruta === ruta)) { avisar(`Ya hay un ${c.nombre} de Modrinth con el nombre ${nombre}.`, 'error'); continue }
      const sha1 = await n.sha1Hex(bytes)
      const repetido = [...base.archivos.keys()].find((r) => !borrados.has(r) && sha1DeRepo(r) === sha1) ||
        (ajustes.externos || []).find((e) => e.sha1 === sha1)?.ruta ||
        [...nuevos.values()].find((x) => x.sha1 === sha1)?.ruta
      if (repetido) { avisar(`${archivo.name} ya está en el modpack.`, 'error'); continue }
      nuevos.set(ruta, {
        ruta, bytes, sha1, git: await n.shaGit(bytes), tamano: bytes.length,
        nombre: analisis.nombre, version: analisis.version, aviso: analisis.aviso,
        reemplaza: base.archivos.has(ruta)
      })
      borrados.delete(ruta)
      if (categoria === 'texturas' && !(ajustes.packsActivos || []).includes(ruta)) ajustes.packsActivos = [...(ajustes.packsActivos || []), ruta]
      n.identificarPorHash([sha1]).then(async (m) => {
        if (!m.size) return
        m.forEach((v, k) => identificados.set(k, v))
        pintar()
        if (categoria === 'mods') await anadirLoQueNecesita(m.get(sha1).version, analisis.nombre, null, true)
      }).catch(() => {})
      avisar(`${analisis.nombre} listo para publicar.`)
    } catch (e) {
      avisar(`${archivo.name}: ${e.message}`, 'error')
    }
  }
  pintar()
}

async function quitar (e) {
  if (/rataland-menu/i.test(e.ruta) && !await confirmar({
    titulo: '¿Quitar el mod de RataLand?',
    texto: 'Sin él, los jugadores volverán a ver la pantalla de carga, el menú principal y el menú de pausa normales de Minecraft.',
    aceptar: 'Quitar el mod',
    cancelar: 'Dejarlo'
  })) return
  quitarElemento(e)
  pintar()
}

function quitarElemento (e) {
  if (e.tipo === 'repo') borrados.add(e.ruta)
  if (e.tipo === 'nuevo') {
    nuevos.delete(e.ruta)
    if (base.archivos.has(e.ruta)) borrados.add(e.ruta)
  }
  if (e.tipo === 'modrinth') ajustes.externos = ajustes.externos.filter((x) => x.ruta !== e.ruta)
  ajustes.packsActivos = (ajustes.packsActivos || []).filter((r) => r !== e.ruta)
  actualizaciones.delete(e.ruta)
}

function cambiarActivo (ruta, activo) {
  const lista = (ajustes.packsActivos || []).filter((r) => r !== ruta)
  ajustes.packsActivos = activo ? [...lista, ruta] : lista
  pintarMarco()
}

async function buscarActualizaciones (categoria, boton) {
  boton.disabled = true
  boton.textContent = 'Buscando…'
  let encontradas = 0
  try {
    for (const e of elementosDe(categoria)) {
      if (!e.proyecto || e.tipo === 'nuevo') continue
      const actual = e.tipo === 'modrinth'
        ? ajustes.externos.find((x) => x.ruta === e.ruta).modrinth.version
        : identificados.get(sha1DeRepo(e.ruta))?.version
      const v = await n.versionCompatible(e.proyecto, categoria, ajustes.minecraft, loaderDe())
      if (v && v.id !== actual) {
        actualizaciones.set(e.ruta, { entrada: n.entradaDeVersion(v, categoria, { id: e.proyecto, title: e.nombre, icon_url: e.icono }), origen: e.tipo })
        encontradas++
      }
    }
    avisar(encontradas ? `Hay ${encontradas} ${encontradas === 1 ? 'actualización' : 'actualizaciones'}.` : 'Todo está al día.')
  } catch (err) {
    avisar(err.message, 'error')
  }
  pintar()
}

function aplicarActualizacion (ruta) {
  const { entrada, origen } = actualizaciones.get(ruta)
  if (origen === 'modrinth') {
    ajustes.externos = ajustes.externos.map((x) => x.ruta === ruta ? entrada : x)
  } else {
    // Un archivo subido a mano pasa a descargarse de Modrinth en su versión nueva.
    borrados.add(ruta)
    ajustes.externos = [...(ajustes.externos || []), entrada]
  }
  ajustes.packsActivos = (ajustes.packsActivos || []).map((r) => r === ruta ? entrada.ruta : r)
  actualizaciones.delete(ruta)
  pintar()
}

/* ---------- Servidor y versión ---------- */

function vistaServidor () {
  const s = ajustes.servidor || (ajustes.servidor = {})
  const alCambiar = (fn) => (e) => { fn(e.target); pintarMarco() }

  // Lo que se ve elegido: el cambio que se está planeando o lo que hay
  const objetivo = compatibilidad || { mc: ajustes.minecraft, tipo: loaderDe(), version: ajustes.loader?.version }
  const ocupado = compatibilidad?.cargando
  const mc = h('select', { disabled: ocupado, onchange: (e) => planificarCambio(e.target.value, objetivo.tipo) },
    [...new Set([objetivo.mc, ...versionesMc])].map((v) => h('option', { value: v, selected: v === objetivo.mc }, v)))
  const tipo = h('select', { disabled: ocupado, onchange: (e) => planificarCambio(objetivo.mc, e.target.value) },
    Object.entries(n.LOADERS).map(([clave, nombre]) => h('option', { value: clave, selected: clave === objetivo.tipo }, nombre)))
  // La recomendada es la estable más nueva
  const recomendada = versionesLoader.find((v) => v.estable)?.version
  const loader = h('select', {
    disabled: ocupado,
    onchange: compatibilidad
      ? (e) => { compatibilidad.version = e.target.value; pintar() }
      : alCambiar((t) => { ajustes.loader = { tipo: loaderDe(), version: t.value } })
  }, [...new Map([[objetivo.version, null], ...versionesLoader.map((v) => [v.version, v])]).entries()].filter(([v]) => v).map(([v]) =>
    h('option', { value: v, selected: v === objetivo.version }, v === recomendada ? `${v} (recomendada)` : v)))
  if (!cargandoVersiones && versionesCargadas !== `${objetivo.tipo}|${objetivo.mc}`) cargarVersiones(objetivo.tipo, objetivo.mc)

  return h('section', { class: 'seccion' },
    encabezado('Servidor y versión', 'Al publicar, los launchers de los jugadores se adaptan solos: usan la dirección y las versiones que elijas aquí.'),
    h('section', { class: 'bloque' }, vistaEstado()),
    h('section', { class: 'bloque' },
      h('h2', {}, pixel('servidor'), 'Conexión'),
      h('div', { class: 'formulario' },
        h('div', { class: 'fila' },
          campo('Dirección del servidor', h('input', { value: s.ip || '', onchange: alCambiar((t) => { s.ip = t.value.trim(); servidor.hora = 0 }) })),
          campo('Puerto', h('input', { type: 'number', min: 1, max: 65535, value: s.puerto || 25565, onchange: (e) => { s.puerto = Number(e.target.value) || 25565; servidor.hora = 0; pintar() } }))),
        h('label', { class: 'casilla' },
          h('input', { type: 'checkbox', checked: s.entrarDirecto === true, onchange: alCambiar((t) => { s.entrarDirecto = t.checked }) }),
          h('span', {}, 'Entrar al servidor nada más abrir el juego', h('br'), h('span', { class: 'campo__ayuda' }, 'Si está desmarcado, los jugadores ven el menú de RataLand y entran con su botón Jugar.'))))),
    h('section', { class: 'bloque' },
      h('h2', {}, pixel('mods'), 'Versión del juego'),
      h('div', { class: 'formulario' },
        h('div', { class: 'fila fila--tres' },
          campo('Minecraft', mc),
          campo('Cargador de mods', tipo),
          campo(`Versión de ${n.nombreLoader(objetivo.tipo)}`, loader)),
        compatibilidad ? null : h('p', { class: 'campo__ayuda' }, 'Si cambias la versión de Minecraft o el cargador, antes de tocar nada verás qué pasará con cada mod.'),
        vistaCompatibilidad())),
    h('section', { class: 'bloque' },
      h('h2', {}, pixel('resumen'), 'Comparar mods con el servidor'),
      loaderDe() === 'fabric'
        ? vistaComparacion()
        : h('p', { class: 'campo__ayuda' }, `Por ahora solo sabe leer el registro de servidores con Fabric. Con ${nombreLoader()}, usa "Mods para el servidor" en la sección Mods.`)))
}

/** Versiones de Minecraft y del cargador; se recargan si cambia el cargador o la versión de Minecraft. */
let cargandoVersiones = false
let versionesCargadas = ''
async function cargarVersiones (tipo, mc) {
  cargandoVersiones = true
  versionesCargadas = `${tipo}|${mc}`
  try {
    ;[versionesMc, versionesLoader] = await Promise.all([versionesMc.length ? versionesMc : n.versionesMinecraft(), n.versionesLoader(tipo, mc)])
    if (seccion === 'servidor') pintar()
  } catch {
    avisar(`No se pudieron cargar las versiones de Minecraft y ${n.nombreLoader(tipo)}.`, 'error')
  }
  cargandoVersiones = false
}

/**
 * Cambio de versión de Minecraft o de cargador (Fabric ↔ NeoForge). Antes de tocar nada se hace un
 * plan: cada mod de Modrinth se cambia por su versión para lo nuevo si la tiene y, si no, se quita
 * (un mod de otro cargador u otra versión impediría arrancar el juego). Los packs de texturas y los
 * shaders se cambian si tienen versión nueva y si no se quedan (suelen seguir funcionando).
 */
async function planificarCambio (mc, tipo) {
  const actual = { mc: ajustes.minecraft, tipo: loaderDe() }
  if (mc === actual.mc && tipo === actual.tipo) {
    compatibilidad = null
    pintar()
    return
  }
  const plan = { mc, tipo, version: null, anterior: actual, cargando: true, progreso: '', filas: [], error: null }
  compatibilidad = plan
  pintar()
  const sigue = () => compatibilidad === plan

  try {
    // Versión del cargador para esa versión de Minecraft
    const versiones = await n.versionesLoader(tipo, mc)
    if (!sigue()) return
    versionesLoader = versiones
    versionesCargadas = `${tipo}|${mc}`
    plan.version = (versiones.find((v) => v.estable) || versiones[0])?.version
    if (!plan.version) throw new Error(`${n.nombreLoader(tipo)} no tiene versión para Minecraft ${mc}.`)

    const cambiaLoader = tipo !== actual.tipo
    const cache = leerCacheMods()
    // Versiones del mod de RataLand que hay compiladas (una por cargador y versión de Minecraft)
    const builds = await buildsRataLand().catch(() => [])
    const elementos = Object.keys(n.CATEGORIAS).flatMap((c) => elementosDe(c).map((e) => ({ e, categoria: c })))
    let i = 0
    for (const { e, categoria } of elementos) {
      plan.progreso = `${++i} de ${elementos.length}`
      pintarCompatibilidad()
      const nombre = e.nombre || e.ruta.split('/').pop()
      const rataland = /rataland-menu/i.test(e.ruta)
      let fila
      if (e.proyecto) {
        const v = await n.versionCompatible(e.proyecto, categoria, mc, tipo).catch(() => null)
        const nueva = v ? n.entradaDeVersion(v, categoria, { id: e.proyecto, title: e.nombre, icon_url: e.icono }) : null
        const mismo = nueva && (nueva.sha1 && e.sha1 ? nueva.sha1 === e.sha1 : nueva.ruta === e.ruta)
        if (nueva && !mismo) fila = { accion: 'cambiar', nueva }
        else if (nueva) fila = { accion: 'mantener', motivo: cambiaLoader ? 'el mismo archivo sirve para los dos' : 'ya vale para esta versión' }
        else fila = categoria === 'mods' ? { accion: 'quitar', motivo: 'no tiene versión' } : { accion: 'mantener', motivo: 'sin versión nueva; suele seguir funcionando' }
      } else if (categoria !== 'mods') {
        fila = { accion: 'mantener' }
      } else if (rataland) {
        // Toca el código del juego: solo vale para la versión con la que se compiló
        const build = builds.find((b) => b.cargador === tipo && b.minecraft === mc)
        if (build && build.sha1 === e.sha1) fila = { accion: 'mantener', motivo: 'ya es el de esta versión' }
        else if (build) fila = { accion: 'cambiar', build }
        else fila = { accion: 'quitar', motivo: `aún no hay versión para Minecraft ${mc} con ${n.nombreLoader(tipo)}` }
      } else if (cambiaLoader) {
        fila = { accion: 'quitar', motivo: `es para ${n.nombreLoader(actual.tipo)}` }
      } else {
        // Subido a mano y sin datos de Modrinth: se mira la versión de Minecraft que pide
        const info = await infoDeElemento(e, cache).catch(() => null)
        const pide = info?.depende?.minecraft
        fila = pide && !n.cumpleRequisito(pide, mc)
          ? { accion: 'quitar', motivo: `pide Minecraft ${[].concat(pide).join(' o ')}` }
          : { accion: 'mantener', motivo: 'súbelo de nuevo si sale una versión para esta' }
      }
      plan.filas.push({ e, categoria, nombre, rataland, ...fila })
      if (!sigue()) return
    }
  } catch (err) {
    if (!sigue()) return
    plan.error = err.message
  }
  plan.cargando = false
  pintar()
}

function pintarCompatibilidad () {
  const caja = $('[data-compatibilidad]')
  if (caja) caja.replaceWith(vistaCompatibilidad())
}

function vistaCompatibilidad () {
  const plan = compatibilidad
  if (!plan) return h('div', { 'data-compatibilidad': '' })
  const destino = `Minecraft ${plan.mc} con ${n.nombreLoader(plan.tipo)}${plan.version ? ` ${plan.version}` : ''}`
  const cancelar = h('button', { class: 'enlace-boton', onclick: () => planificarCambio(plan.anterior.mc, plan.anterior.tipo) }, 'Cancelar el cambio')
  let contenido
  if (plan.cargando) {
    contenido = [h('strong', {}, `Cambiar a ${destino}`), h('p', {}, `Mirando qué pasa con cada mod…${plan.progreso ? ` (${plan.progreso})` : ''}`), h('p', {}, cancelar)]
  } else if (plan.error) {
    contenido = [h('strong', {}, 'No se puede hacer este cambio'), h('p', {}, plan.error), h('p', {}, cancelar)]
  } else {
    const de = (accion) => plan.filas.filter((f) => f.accion === accion)
    const lista = (filas, conMotivo) => h('ul', {}, filas.map((f) => h('li', {}, f.nombre, conMotivo && f.motivo ? `: ${f.motivo}` : '')))
    const cambian = de('cambiar')
    const quitan = de('quitar')
    const quedan = de('mantener')
    const sinRataland = quitan.some((f) => f.rataland)
    const servidor = ajustes.servidor || {}
    contenido = [
      h('strong', {}, `Cambiar a ${destino}`),
      cambian.length ? [h('p', {}, `Se cambiarán a su versión para ${plan.mc} (${cambian.length}):`), lista(cambian)] : null,
      quitan.length ? [h('p', {}, `Se quitarán (${quitan.length}):`), lista(quitan, true)] : null,
      quedan.length ? h('details', {}, h('summary', {}, `Se quedan como están (${quedan.length})`), lista(quedan, true)) : null,
      sinRataland
        ? h('p', { class: 'aviso-caja aviso-caja--mal' },
          `El mod de RataLand (menús, pantalla de carga, skin sin premium, sin aviso de chat) todavía no está hecho para Minecraft ${plan.mc} con ${n.nombreLoader(plan.tipo)}: hay que adaptarlo. Mientras, los jugadores verán los menús normales de Minecraft. `,
          servidor.entrarDirecto
            ? 'Tienes activado "Entrar al servidor nada más abrir el juego", así que entrarán directos.'
            : h('button', { class: 'enlace-boton', onclick: () => { servidor.entrarDirecto = true; ajustes.servidor = servidor; pintar() } }, 'Activar "Entrar al servidor nada más abrir el juego"'))
        : null,
      h('p', {}, `Cambia también el servidor (en el panel de tu hosting) a ${destino} y haz antes una copia del mundo: un mundo abierto en una versión más nueva ya no se puede abrir en una más vieja.`),
      h('p', { class: 'campo__ayuda' }, 'Los jugadores no tienen que hacer nada: al pulsar Jugar, el launcher instala la nueva versión y deja solo los mods de la lista.'),
      h('p', { class: 'acciones-cambio' },
        h('button', { class: 'boton boton--principal boton--pequeno', disabled: plan.aplicando, onclick: aplicarCambioVersion }, plan.aplicando ? 'Aplicando…' : 'Aplicar el cambio'),
        ' ', cancelar)
    ]
  }
  return h('div', { class: 'aviso-caja', 'data-compatibilidad': '' }, contenido)
}

/** Versiones compiladas del mod de RataLand (mod/builds/versiones.json, lo escribe tools/publicar-mod.js). */
async function buildsRataLand () {
  const res = await fetch(urlRepo('mod/builds/versiones.json'))
  if (!res.ok) return []
  return res.json()
}

/** Archivo del repositorio tal y como está en el último commit. */
function urlRepo (ruta) {
  const { propietario, repositorio } = n.CONFIG
  return `https://raw.githubusercontent.com/${propietario}/${repositorio}/${base.head}/${ruta}`
}

/** Aplica el plan: cambia o quita cada elemento y pone la nueva versión (queda pendiente de publicar). */
async function aplicarCambioVersion () {
  const plan = compatibilidad
  // Primero baja el mod de RataLand para el cargador nuevo (si falla, no se toca nada)
  plan.aplicando = true
  pintarCompatibilidad()
  try {
    for (const f of plan.filas.filter((x) => x.build)) {
      const res = await fetch(urlRepo(`mod/builds/${n.codificarRuta(f.build.archivo)}`))
      if (!res.ok) throw new Error(`No se pudo descargar ${f.build.archivo}.`)
      f.bytes = new Uint8Array(await res.arrayBuffer())
      if (await n.sha1Hex(f.bytes) !== f.build.sha1) throw new Error(`${f.build.archivo} llegó dañado; vuelve a intentarlo.`)
    }
  } catch (err) {
    plan.aplicando = false
    avisar(err.message, 'error')
    pintarCompatibilidad()
    return
  }
  if (compatibilidad !== plan) return
  for (const f of plan.filas) {
    if (f.build) {
      // El mod de RataLand se sube al modpack en su versión para el cargador nuevo
      quitarElemento(f.e)
      const ruta = `mods/${f.build.archivo}`
      nuevos.set(ruta, {
        ruta, bytes: f.bytes, sha1: f.build.sha1, git: await n.shaGit(f.bytes), tamano: f.bytes.length,
        nombre: 'RataLand (menús y pantalla de carga)', version: f.build.version, reemplaza: base.archivos.has(ruta)
      })
      borrados.delete(ruta)
    } else if (f.accion === 'cambiar') {
      actualizaciones.set(f.e.ruta, { entrada: f.nueva, origen: f.e.tipo })
      aplicarActualizacion(f.e.ruta)
    } else if (f.accion === 'quitar') {
      quitarElemento(f.e)
    }
  }
  ajustes.minecraft = plan.mc
  ajustes.loader = { tipo: plan.tipo, version: plan.version }
  compatibilidad = null
  avisar(`Cambio a Minecraft ${plan.mc} con ${n.nombreLoader(plan.tipo)} preparado. Revísalo y publícalo.`)
  pintar()
}

/* Comparar con los mods del servidor (pegando su registro de arranque) */

function leerCacheMods () {
  try { return JSON.parse(localStorage.getItem(CLAVE_INFO_MODS) || '{}') } catch { return {} }
}

/** Contenido del archivo: de lo subido sin publicar, de Modrinth o del commit actual del repositorio. */
async function bytesDe (e) {
  const nuevo = nuevos.get(e.ruta)
  if (nuevo) return nuevo.bytes
  const { propietario, repositorio, carpeta } = n.CONFIG
  const url = e.tipo === 'modrinth'
    ? e.url
    : `https://raw.githubusercontent.com/${propietario}/${repositorio}/${base.head}/${carpeta}/${n.codificarRuta(e.ruta)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar ${e.ruta.split('/').pop()}.`)
  return new Uint8Array(await res.arrayBuffer())
}

function guardarArchivo (datos, nombre) {
  const enlace = h('a', { href: URL.createObjectURL(datos), download: nombre, hidden: true })
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(enlace.href), 10000)
}

async function infoDeElemento (e, cache) {
  const clave = e.sha1 && (loaderDe() === 'fabric' ? e.sha1 : `${loaderDe()}:${e.sha1}`)
  if (clave && cache[clave]) return cache[clave]
  const info = await n.infoDeMod(window.JSZip, await bytesDe(e), loaderDe())
  if (info && clave) {
    cache[clave] = info
    try { localStorage.setItem(CLAVE_INFO_MODS, JSON.stringify(cache)) } catch { /* sin espacio: no pasa nada */ }
  }
  return info
}

async function compararConServidor (texto) {
  const registro = n.modsDelRegistro(texto)
  if (!registro) {
    comparacion = { ...comparacion, texto, error: 'No encuentro la lista "Loading N mods" en ese texto. Copia el registro desde el arranque del servidor.', resultado: null }
    pintar()
    return
  }
  const elementos = elementosDe('mods')
  comparacion = { texto, cargando: true, progreso: 'Leyendo los mods del modpack…', resultado: null, registro, error: null }
  pintar()
  const cache = leerCacheMods()
  const cliente = []
  let i = 0
  try {
    for (const e of elementos) {
      comparacion.progreso = `Leyendo los mods del modpack (${++i} de ${elementos.length})…`
      const progreso = $('[data-comparacion-progreso]')
      if (progreso) progreso.textContent = comparacion.progreso
      const info = await infoDeElemento(e, cache)
      cliente.push(info ? { ...info, nombre: e.nombre || info.nombre } : { id: null, nombre: e.nombre })
    }
    comparacion.resultado = n.compararMods(cliente, registro.mods)
  } catch (err) {
    comparacion.error = err.message
  }
  comparacion.cargando = false
  pintar()
}

function vistaComparacion () {
  const area = h('textarea', { class: 'registro', placeholder: '[12:00:00] [main/INFO]: Loading 59 mods:\n\t- fabric-api 0.116.17+1.21.1\n\t- …', spellcheck: 'false' }, comparacion.texto)
  const r = comparacion.resultado
  const reg = comparacion.registro
  const nombreDe = (m) => m.nombre && m.nombre !== m.id ? `${m.nombre} (${m.id})` : m.id

  let resultado = null
  if (comparacion.cargando) {
    resultado = h('p', { class: 'aviso-caja', 'data-comparacion-progreso': '' }, comparacion.progreso)
  } else if (comparacion.error) {
    resultado = h('p', { class: 'aviso-caja aviso-caja--mal' }, comparacion.error)
  } else if (r) {
    const problemas = r.faltanEnModpack.length + r.otraVersion.length
    resultado = h('div', { class: 'comparacion' },
      reg.minecraft && reg.minecraft !== ajustes.minecraft
        ? h('p', { class: 'aviso-caja aviso-caja--mal' }, `El servidor usa Minecraft ${reg.minecraft} y el modpack ${ajustes.minecraft}.`)
        : null,
      !problemas ? h('p', { class: 'aviso-caja aviso-caja--bien' }, 'Todo cuadra: no falta ningún mod del servidor en el modpack.') : null,
      r.faltanEnModpack.length
        ? h('div', { class: 'aviso-caja aviso-caja--mal' },
          h('h3', {}, `${r.faltanEnModpack.length} en el servidor pero no en el modpack`),
          h('p', {}, 'Si añaden bloques, objetos o criaturas, los jugadores no podrán entrar sin ellos. Si son solo de servidor (permisos, copias de seguridad…), no hace falta añadirlos.'),
          h('ul', {}, r.faltanEnModpack.map((m) => h('li', {}, `${m.id} ${m.version} `, h('button', { class: 'enlace-boton', onclick: () => abrirCajon('mods', m.id) }, 'Buscar en Modrinth')))))
        : null,
      r.otraVersion.length
        ? h('div', { class: 'aviso-caja' },
          h('h3', {}, `${r.otraVersion.length} con otra versión`),
          h('ul', {}, r.otraVersion.map((m) => h('li', {}, `${nombreDe(m)}: modpack ${m.version}, servidor ${m.versionServidor}`))))
        : null,
      r.faltanEnServidor.length
        ? h('div', { class: 'aviso-caja' },
          h('h3', {}, `${r.faltanEnServidor.length} en el modpack pero no en el servidor`),
          h('p', {}, 'Si son visuales o de rendimiento (mapas, menús, gráficos) no pasa nada. Si añaden contenido, instálalos también en el servidor.'),
          h('ul', {}, r.faltanEnServidor.map((m) => h('li', {}, nombreDe(m)))))
        : null,
      r.soloCliente.length || r.coinciden.length
        ? h('p', { class: 'nota' },
          r.coinciden.length ? `${r.coinciden.length} ${r.coinciden.length === 1 ? 'coincide' : 'coinciden'}${r.coinciden.length ? ` (${r.coinciden.map((m) => m.nombre || m.id).join(', ')})` : ''}. ` : '',
          r.soloCliente.length ? `${r.soloCliente.length} ${r.soloCliente.length === 1 ? 'es' : 'son'} solo para jugadores y no ${r.soloCliente.length === 1 ? 'hace' : 'hacen'} falta en el servidor (${r.soloCliente.map((m) => m.nombre || m.id).join(', ')}).` : '')
        : null)
  }

  return h('div', { class: 'formulario' },
    h('ol', { class: 'pasos' },
      h('li', {}, 'En el panel de tu hosting, enciende el servidor y abre la ', h('strong', {}, 'consola'), ' o el registro (Log).'),
      h('li', {}, 'Copia todo el texto desde el principio del arranque y pégalo aquí.')),
    campo('Registro de arranque del servidor', area),
    h('p', {}, h('button', { class: 'boton', disabled: comparacion.cargando, onclick: () => compararConServidor(area.value) }, comparacion.cargando ? 'Comparando…' : 'Comparar')),
    resultado)
}

/* ---------- Noticias ---------- */

function vistaNoticias () {
  const noticias = ajustes.noticias || (ajustes.noticias = [])
  const hoy = new Date().toISOString().slice(0, 10)
  return h('section', { class: 'seccion' },
    encabezado('Noticias', 'Aparecen a la derecha del launcher, en este orden.',
      h('button', { class: 'boton', onclick: () => { noticias.unshift({ fecha: hoy, titulo: '', texto: '' }); pintar() } }, 'Escribir noticia')),
    h('div', { class: 'tarjetas' }, noticias.length
      ? noticias.map((noticia, i) => h('section', { class: 'bloque' },
        h('div', { class: 'formulario' },
          h('div', { class: 'fila' },
            campo('Título', h('input', { value: noticia.titulo || '', placeholder: 'Empieza la temporada', oninput: (e) => { noticia.titulo = e.target.value; pintarMarco() } })),
            campo('Fecha', h('input', { type: 'date', value: noticia.fecha || '', oninput: (e) => { noticia.fecha = e.target.value; pintarMarco() } }))),
          campo('Texto', h('textarea', { oninput: (e) => { noticia.texto = e.target.value; pintarMarco() } }, noticia.texto || '')),
          h('p', {}, h('button', { class: 'boton-quitar', onclick: () => { noticias.splice(i, 1); pintar() } }, 'Quitar esta noticia')))))
      : h('p', { class: 'bloque vacio' }, 'No hay noticias. Escribe la primera para que salga en el launcher.')))
}

/* ---------- Dependencias entre mods ---------- */

let revision = { clave: '', estado: 'nada', progreso: '', resultado: null, error: null }

/** Cambia cuando cambian los mods: así se sabe si la revisión sigue valiendo. */
function claveMods () {
  return elementosDe('mods').map((e) => e.sha1 || e.ruta).sort().join(',')
}

/** fabric.mod.json de cada mod (lo ya leído queda guardado en este navegador). */
async function infosDeMods (alProgreso) {
  const elementos = elementosDe('mods')
  const cache = leerCacheMods()
  const lista = []
  let i = 0
  for (const e of elementos) {
    alProgreso?.(++i, elementos.length)
    lista.push({ e, nombre: e.nombre || e.ruta.split('/').pop(), info: await infoDeElemento(e, cache).catch(() => null) })
  }
  return lista
}

async function revisarMods () {
  const clave = claveMods()
  if (revision.estado === 'revisando' && revision.clave === clave) return
  revision = { clave, estado: 'revisando', progreso: '', resultado: null, error: null }
  pintarRevision()
  try {
    const mods = await infosDeMods((i, total) => {
      if (revision.clave !== clave) return
      revision.progreso = `${i} de ${total}`
      pintarRevision()
    })
    if (revision.clave !== clave) return // los mods cambiaron mientras tanto
    revision = { clave, estado: 'lista', resultado: n.revisarDependencias(mods, ajustes.minecraft), error: null }
  } catch (err) {
    if (revision.clave !== clave) return
    revision = { clave, estado: 'error', error: err.message }
  }
  pintarRevision()
}

function pintarRevision () {
  document.querySelectorAll('[data-revision]').forEach((el) => el.replaceWith(vistaRevision(el.dataset.revision)))
}

/** Versión de Modrinth de un mod del modpack, si se sabe (para añadir lo que necesita). */
function versionDe (e) {
  if (e.tipo === 'modrinth') return (ajustes.externos || []).find((x) => x.ruta === e.ruta)?.modrinth?.version
  return identificados.get(e.sha1)?.version
}

/** Añade de Modrinth lo que un mod necesita y aún no está. */
async function anadirLoQueNecesita (versionId, nombre, boton, silencioso = false) {
  if (!versionId) return
  if (boton) boton.disabled = true
  try {
    const version = await n.versionModrinth(versionId)
    const { anadir, faltan } = await n.dependenciasDe(version, ajustes.minecraft, proyectosPresentes(), loaderDe())
    const nuevas = anadir.filter((x) => !rutaOcupada(x.ruta))
    if (nuevas.length) {
      ajustes.externos = [...(ajustes.externos || []), ...nuevas]
      avisar(`Añadido lo que necesita ${nombre}: ${nuevas.map((x) => x.modrinth.nombre).join(', ')}.`)
    } else if (!silencioso) {
      avisar(`Modrinth no dice qué le falta a ${nombre}. Búscalo en "Añadir desde Modrinth".`, 'error')
    }
    if (faltan.length) avisar(`${nombre} necesita ${faltan.join(', ')}, que no tiene versión para ${ajustes.minecraft}.`, 'error')
  } catch (err) {
    if (!silencioso) avisar(err.message, 'error')
  }
  if (boton) boton.disabled = false
  pintar()
}

/* Avisos que el administrador decidió ignorar (se recuerdan en este navegador) */
const CLAVE_IGNORADOS = 'rataland-panel-avisos-ignorados'

function avisosIgnorados () {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE_IGNORADOS) || '[]')) } catch { return new Set() }
}

function guardarIgnorados (claves) {
  try { localStorage.setItem(CLAVE_IGNORADOS, JSON.stringify([...claves])) } catch { /* sin almacenamiento */ }
  pintarRevision()
}

function ignorarAvisos (claves) {
  const ignorados = avisosIgnorados()
  claves.forEach((c) => ignorados.add(c))
  guardarIgnorados(ignorados)
  avisar(claves.length === 1 ? 'Aviso ignorado. No volverá a salir mientras no cambie.' : 'Avisos ignorados. No volverán a salir mientras no cambien.')
}

function vistaRevision (donde) {
  const r = revision
  const enPublicar = donde === 'publicar'
  let contenido = null
  if (r.estado === 'revisando' || r.estado === 'nada') {
    contenido = h('p', { class: 'revision' }, `Revisando que cada mod tenga lo que necesita…${r.progreso ? ` (${r.progreso})` : ''}`)
  } else if (r.estado === 'error') {
    contenido = h('p', { class: 'aviso-caja' }, `No se pudieron revisar las dependencias: ${r.error} `,
      h('button', { class: 'enlace-boton', onclick: () => revisarMods() }, 'Reintentar'))
  } else if (r.resultado) {
    const { faltan, version, incompatibles } = r.resultado
    const nombre = (m) => h('strong', {}, m.nombre)
    // Cada aviso tiene una clave: si el mod o el problema cambian, la clave cambia y el aviso vuelve a salir
    const idMod = (m) => m.info?.id || m.nombre
    const avisos = [
      ...faltan.map(({ mod, ids }) => {
        const id = versionDe(mod.e)
        return {
          clave: `falta:${idMod(mod)}:${ids.join(',')}`,
          contenido: [nombre(mod), ` necesita ${ids.join(', ')}, que no está.`,
            enPublicar ? null
              : id
                ? h('button', { class: 'enlace-boton', onclick: (ev) => anadirLoQueNecesita(id, mod.nombre, ev.currentTarget) }, 'Añadir lo que necesita')
                : ids.map((x) => h('button', { class: 'enlace-boton', onclick: () => abrirCajon('mods', x) }, `Buscar ${x}`))]
        }
      }),
      ...incompatibles.map(({ mod, con }) => ({ clave: `choca:${idMod(mod)}:${con}`, contenido: [nombre(mod), ` no funciona junto a ${con}: quita uno de los dos.`] })),
      ...version.map(({ mod, texto }) => ({ clave: `version:${idMod(mod)}:${texto}`, contenido: [nombre(mod), ` ${texto}. Puede que no arranque.`] }))
    ]
    const ignorados = avisosIgnorados()
    const visibles = avisos.filter((a) => !ignorados.has(a.clave))
    const ocultos = avisos.length - visibles.length
    const volverAMostrar = ocultos && !enPublicar
      ? h('button', { class: 'enlace-boton', onclick: () => guardarIgnorados(new Set([...ignorados].filter((c) => !avisos.some((a) => a.clave === c)))) },
        `Volver a mostrar ${ocultos === 1 ? 'el aviso ignorado' : `los ${ocultos} avisos ignorados`}`)
      : null
    if (!visibles.length) {
      contenido = enPublicar
        ? null
        : h('p', { class: 'revision revision--bien' },
          ocultos ? 'No hay avisos por revisar. ' : 'Cada mod tiene todo lo que necesita y no hay incompatibilidades.', volverAMostrar)
    } else {
      contenido = h('div', { class: 'aviso-caja aviso-caja--mal' },
        h('div', { class: 'revision__cabecera' },
          h('strong', {}, enPublicar ? 'Hay mods con problemas: el juego podría no arrancar' : 'Revisa esto antes de publicar'),
          h('button', { class: 'enlace-boton', onclick: () => ignorarAvisos(visibles.map((a) => a.clave)) }, visibles.length === 1 ? 'Ignorar' : 'Ignorar todos')),
        h('ul', { class: 'revision__lista' }, visibles.map((a) => h('li', {}, a.contenido,
          visibles.length > 1 ? h('button', { class: 'enlace-boton revision__ignorar', onclick: () => ignorarAvisos([a.clave]) }, 'Ignorar') : null))),
        enPublicar ? h('p', {}, h('button', { class: 'enlace-boton', onclick: (ev) => { ev.target.closest('dialog').close(); irA('mods') } }, 'Arreglarlo en Mods')) : null,
        volverAMostrar ? h('p', {}, volverAMostrar) : null)
    }
  }
  return h('div', { 'data-revision': donde }, contenido)
}

/* ---------- Mods para el servidor ---------- */

let zipServidor = { lista: [], cargando: false }

async function abrirZipServidor () {
  abrirDialogo('servidor-zip')
  $('[data-error-zip]').hidden = true
  zipServidor = { lista: [], cargando: true, progreso: '' }
  pintarZip()
  try {
    const mods = await infosDeMods((i, total) => { zipServidor.progreso = `${i} de ${total}`; pintarZip() })
    const ids = [...new Set(mods.map((m) => m.e.proyecto).filter(Boolean))]
    const proyectos = new Map((await n.proyectosModrinth(ids).catch(() => [])).map((p) => [p.id, p]))
    const lista = mods.map((m) => {
      const lado = n.ladoServidor(m.info, proyectos.get(m.e.proyecto))
      return { ...m, ...lado, marcado: lado.va }
    })
    // Si un mod que va al servidor necesita otro, ese otro también es obligatorio allí
    // (Modrinth dice que Fabric API es opcional, pero no si otro mod la usa).
    const quien = new Map()
    for (const x of lista) for (const o of x.info?.ofrece || []) if (!quien.has(o.id)) quien.set(o.id, x)
    let cambio = true
    while (cambio) {
      cambio = false
      for (const x of lista.filter((y) => y.va)) {
        for (const id of Object.keys(x.info?.depende || {})) {
          const otro = quien.get(id === 'fabric' ? 'fabric-api' : id)
          if (!otro || otro === x || otro.info?.entorno === 'client' || otro.necesario) continue
          Object.assign(otro, { va: true, marcado: true, necesario: true, motivo: `Lo necesita ${x.nombre}.` })
          cambio = true
        }
      }
    }
    zipServidor.lista = lista.sort((a, b) => (b.va - a.va) || a.nombre.localeCompare(b.nombre))
  } catch (err) {
    $('[data-error-zip]').textContent = err.message
    $('[data-error-zip]').hidden = false
  }
  zipServidor.cargando = false
  pintarZip()
}

function pintarZip () {
  const caja = $('[data-zip-contenido]')
  const boton = $('[data-accion="descargar-zip"]')
  if (zipServidor.cargando) {
    caja.replaceChildren(h('p', {}, `Leyendo los mods…${zipServidor.progreso ? ` (${zipServidor.progreso})` : ''}`))
    boton.disabled = true
    return
  }
  const marcados = zipServidor.lista.filter((x) => x.marcado).length
  const sinPublicar = nuevos.size || borrados.size || cambios().some((c) => /^(Añadir|Quitar|Actualizar|Reemplazar) /.test(c))
  caja.replaceChildren(
    h('ul', { class: 'lista-zip' }, zipServidor.lista.map((x) => h('li', {},
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: x.marcado, onchange: (e) => { x.marcado = e.target.checked; pintarZip() } }),
        h('span', {}, h('strong', {}, x.nombre), x.motivo ? h('span', { class: 'campo__ayuda' }, x.motivo) : null))))),
    h('p', { class: 'zip-resumen' }, `${marcados} de ${zipServidor.lista.length} mods irán en el .zip.`),
    sinPublicar ? h('p', { class: 'aviso-caja' }, 'Incluye los cambios que aún no has publicado.') : null,
    h('ol', { class: 'zip-pasos' },
      h('li', {}, 'Descomprime el .zip.'),
      h('li', {}, 'En el panel de tu hosting, entra en los archivos del servidor y abre la carpeta mods.'),
      h('li', {}, 'Borra los mods que ya no estén en esta lista y sube los .jar del .zip.'),
      h('li', {}, `Comprueba que el servidor usa Minecraft ${ajustes.minecraft} con ${nombreLoader()} ${ajustes.loader?.version}.`)))
  boton.disabled = !marcados
}

async function descargarZip (boton) {
  const marcados = zipServidor.lista.filter((x) => x.marcado)
  boton.disabled = true
  $('[data-error-zip]').hidden = true
  try {
    const zip = new window.JSZip()
    let i = 0
    for (const x of marcados) {
      boton.textContent = `Preparando ${++i} de ${marcados.length}…`
      zip.file(`mods/${x.e.ruta.split('/').pop()}`, await bytesDe(x.e))
    }
    zip.file('LEEME.txt', [
      `Mods para el servidor: Minecraft ${ajustes.minecraft} con ${nombreLoader()} ${ajustes.loader?.version}.`,
      'Sube los archivos de la carpeta "mods" a la carpeta "mods" del servidor.',
      '',
      ...marcados.map((x) => `- ${x.nombre} (${x.e.ruta.split('/').pop()})`)
    ].join('\r\n'))
    boton.textContent = 'Comprimiendo…'
    guardarArchivo(await zip.generateAsync({ type: 'blob' }), `mods-servidor-minecraft-${ajustes.minecraft}.zip`)
  } catch (err) {
    $('[data-error-zip]').textContent = `No se pudo preparar el .zip: ${err.message}`
    $('[data-error-zip]').hidden = false
  }
  boton.textContent = 'Descargar .zip'
  boton.disabled = false
}

/* ---------- Temporada y fondo ---------- */

/** Escena animada (sus datos los genera tools/arte.js en js/fondo-escenas.js), o null. */
const escenaAnimada = (clave) => (window.FondoAnimado && window.ESCENAS_FONDO?.[clave]) || null

/** Miniatura de un fondo; los animados se ven moviéndose. */
function vistaEscena (clave) {
  const escena = escenaAnimada(clave)
  if (!escena) return h('img', { class: 'escena-opcion__vista', src: `img/fondo-${clave}.png`, alt: '', width: 640, height: 360 })
  const lienzo = h('canvas', { class: 'escena-opcion__vista', width: 320, height: 180 })
  window.FondoAnimado.animar(lienzo, { escena, ruta: 'img/' })
  return lienzo
}

function vistaTemporada () {
  const ep = ajustes.episodio || (ajustes.episodio = { titulo: '', url: '' })
  const escenaActual = n.ESCENAS[ajustes.escena] ? ajustes.escena : 'noche'

  const escenas = h('div', { class: 'escenas', role: 'radiogroup', 'aria-label': 'Fondo' },
    Object.entries(n.ESCENAS).map(([clave, nombre]) => h('div', { class: 'escena-item' }, h('label', { class: 'escena-opcion' },
      h('input', {
        type: 'radio',
        name: 'escena',
        value: clave,
        checked: clave === escenaActual,
        onchange: () => { ajustes.escena = clave; pintarMarco() }
      }),
      vistaEscena(clave),
      h('span', {}, nombre, escenaAnimada(clave) ? h('span', { class: 'etiqueta-animada' }, 'Animado') : null)))))

  const previa = h('div', { class: 'episodio-previa' })
  const error = h('span', { class: 'campo__ayuda error' }, 'No parece un enlace de un vídeo de YouTube.')
  const actualizarPrevia = () => {
    const id = n.idYoutube(ep.url || '')
    error.hidden = !ep.url || Boolean(id)
    previa.replaceChildren(...(id
      ? [h('img', { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: '', width: 480, height: 360 }), h('span', {}, ep.titulo || 'Sin título')]
      : []))
    previa.hidden = !id
  }
  actualizarPrevia()

  const frases = h('textarea', {
    placeholder: '¡Ahora con más queso!\n¡Squeak!',
    oninput: (e) => { ajustes.frases = e.target.value.split('\n'); pintarMarco() }
  }, (ajustes.frases || []).join('\n'))

  return h('section', { class: 'seccion' },
    encabezado('Temporada y fondo', 'La ambientación de la serie: se ve en el launcher y en los menús del juego.'),
    h('section', { class: 'bloque' },
      h('h2', {}, pixel('temporada'), 'Temporada'),
      h('div', { class: 'formulario' },
        campo('Nombre de la temporada', h('input', {
          value: ajustes.temporada || '',
          maxlength: 40,
          placeholder: 'Temporada 1',
          oninput: (e) => { ajustes.temporada = e.target.value; pintarMarco() }
        }), 'Sale encima del logo en el launcher y abajo a la derecha en el menú del juego. Déjalo vacío para no mostrarlo.'))),
    h('section', { class: 'bloque' },
      h('h2', {}, pixel('texturas'), 'Fondo'),
      h('p', { class: 'campo__ayuda' }, 'Se usa en el launcher, en el menú principal y en el menú de pausa. Los animados también se mueven allí.'),
      escenas),
    h('section', { class: 'bloque' },
      h('h2', {}, pixel('noticias'), 'Último episodio'),
      h('div', { class: 'formulario' },
        campo('Título', h('input', { value: ep.titulo || '', placeholder: 'RataLand 1x01: La primera noche', oninput: (e) => { ep.titulo = e.target.value; actualizarPrevia(); pintarMarco() } })),
        campo('Enlace de YouTube', [h('input', {
          type: 'url',
          value: ep.url || '',
          placeholder: 'https://www.youtube.com/watch?v=…',
          oninput: (e) => { ep.url = e.target.value.trim(); actualizarPrevia(); pintarMarco() }
        }), error], 'Sale arriba de las noticias, con la miniatura del vídeo.'),
        previa,
        ep.url ? h('p', {}, h('button', { class: 'boton-quitar', onclick: () => { ajustes.episodio = { titulo: '', url: '' }; pintar() } }, 'Quitar el episodio')) : null)),
    h('section', { class: 'bloque' },
      h('h2', {}, pixel('resumen'), 'Frases del menú'),
      h('div', { class: 'formulario' },
        campo('Una frase por línea', frases, 'Salen en amarillo junto al logo del menú del juego, una distinta cada vez. Mejor cortas. Si lo dejas vacío, se usan las de siempre.'))))
}

/* ---------- Cuenta atrás ---------- */

function desfaseLocal () {
  const m = -new Date().getTimezoneOffset()
  const signo = m >= 0 ? '+' : '-'
  const abs = Math.abs(m)
  return `${signo}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

function aFechaLocal (iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function vistaEvento () {
  const ev = ajustes.evento || (ajustes.evento = { titulo: '', fecha: '', duracionHoras: 3 })
  const previa = h('p', { class: 'vista-previa' })
  const actualizarPrevia = () => { previa.textContent = cuentaAtras(ev) || 'Sin cuenta atrás.' }
  actualizarPrevia()
  return h('section', { class: 'seccion' },
    encabezado('Cuenta atrás', 'Se muestra en el launcher debajo del estado del servidor. Al llegar la hora dice "¡Ya empezó!" durante las horas que indiques y luego desaparece.'),
    h('section', { class: 'bloque' },
      h('div', { class: 'formulario' },
        campo('Título', h('input', { value: ev.titulo || '', placeholder: 'Episodio 2', oninput: (e) => { ev.titulo = e.target.value; actualizarPrevia(); pintarMarco() } })),
        h('div', { class: 'fila' },
          campo('Fecha y hora', h('input', {
            type: 'datetime-local',
            value: ev.fecha ? aFechaLocal(ev.fecha) : '',
            oninput: (e) => { ev.fecha = e.target.value ? `${e.target.value}:00${desfaseLocal()}` : ''; actualizarPrevia(); pintarMarco() }
          }), `Hora de este dispositivo (UTC${desfaseLocal()}). Cada jugador la verá en su hora.`),
          campo('Duración (horas)', h('input', { type: 'number', min: 1, max: 48, value: ev.duracionHoras || 3, oninput: (e) => { ev.duracionHoras = Number(e.target.value) || 3; pintarMarco() } }))),
        h('div', {}, h('span', { class: 'campo__ayuda' }, 'Así se verá ahora mismo en el launcher:'), previa),
        ev.fecha ? h('p', {}, h('button', { class: 'boton-quitar', onclick: () => { ajustes.evento = { titulo: '', fecha: '', duracionHoras: 3 }; pintar() } }, 'Quitar la cuenta atrás')) : null)))
}

/* ---------- Enlaces ---------- */

function vistaEnlaces () {
  const enlaces = ajustes.enlaces || (ajustes.enlaces = {})
  const tipos = [['discord', 'https://discord.gg/…'], ['youtube', 'https://youtube.com/@…'], ['tiktok', 'https://tiktok.com/@…'], ['twitch', 'https://twitch.tv/…'], ['x', 'https://x.com/…'], ['web', 'https://…']]
  return h('section', { class: 'seccion' },
    encabezado('Enlaces', 'Los que tengan dirección aparecen abajo en el launcher. Discord además sale en el menú de pausa del juego. Deja vacíos los que no uses.'),
    h('section', { class: 'bloque' },
      h('div', { class: 'formulario' }, tipos.map(([clave, ejemplo]) => {
        const error = h('span', { class: 'campo__ayuda error', hidden: !enlaces[clave] || /^https:\/\//.test(enlaces[clave]) }, 'Tiene que empezar por https://')
        return campo(NOMBRES_ENLACE[clave], [h('input', {
          type: 'url',
          value: enlaces[clave] || '',
          placeholder: ejemplo,
          oninput: (e) => {
            const v = e.target.value.trim()
            error.hidden = !v || /^https:\/\//.test(v)
            if (!v) delete enlaces[clave]
            else enlaces[clave] = v
            pintarMarco()
          }
        }), error])
      }))))
}

/* ---------- Conexión ---------- */

async function conectar (llave, recordar) {
  const prueba = new n.GitHub(llave)
  usuario = await prueba.comprobarLlave()
  gh = prueba
  guardarLlave(llave, recordar)
  pintarMarco()
}

function desconectar () {
  guardarLlave('', false)
  gh = new n.GitHub('')
  usuario = null
  pintarMarco()
}

$('[data-formulario-llave]').addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.target
  const error = $('[data-error-llave]')
  error.hidden = true
  const boton = form.querySelector('[type="submit"]')
  boton.disabled = true
  try {
    await conectar(form.llave.value.trim(), form.recordar.checked)
    form.llave.value = ''
    form.closest('dialog').close()
    avisar(`Conectado como ${usuario}. Ya puedes publicar.`)
  } catch (err) {
    error.textContent = err.message
    error.hidden = false
  }
  boton.disabled = false
})

/* ---------- Publicar ---------- */

function abrirPublicar () {
  if (!usuario) {
    abrirDialogo('llave')
    return
  }
  const lista = cambios()
  $('[data-lista-cambios]').replaceChildren(...lista.map((c) => h('li', {}, c)))
  const form = $('[data-formulario-publicar]')
  form.mensaje.value = lista.length === 1 ? lista[0] : `Panel: ${lista.slice(0, 2).join(', ')}${lista.length > 2 ? ' y más' : ''}`
  $('[data-error-publicar]').hidden = true
  $('[data-progreso]').hidden = true
  if (elementosDe('mods').length && revision.clave !== claveMods()) revisarMods()
  pintarRevision()
  form.querySelector('[type="submit"]').disabled = false
  abrirDialogo('publicar')
}

$('[data-formulario-publicar]').addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.target
  const boton = form.querySelector('[type="submit"]')
  const error = $('[data-error-publicar]')
  const progreso = $('[data-progreso]')
  boton.disabled = true
  error.hidden = true
  progreso.hidden = false
  const alProgreso = (texto, hecho, total) => {
    $('[data-progreso-texto]').textContent = texto
    $('[data-progreso-relleno]').style.width = total ? `${Math.round((hecho / total) * 100)}%` : '0%'
  }
  try {
    if (ajustes.servidor && !ajustes.servidor.ip) throw new Error('Falta la dirección del servidor (en Servidor y versión).')
    // Un enlace vacío es "sin enlace": no se comprueba y no se guarda.
    ajustes.enlaces = Object.fromEntries(Object.entries(ajustes.enlaces || {})
      .map(([clave, url]) => [clave, String(url || '').trim()])
      .filter(([, url]) => url))
    for (const [clave, url] of Object.entries(ajustes.enlaces)) {
      if (!/^https:\/\//.test(url)) throw new Error(`El enlace de ${NOMBRES_ENLACE[clave] || clave} tiene que empezar por https:// (o déjalo vacío en Enlaces).`)
    }
    if (ajustes.externos && !ajustes.externos.length) delete ajustes.externos
    alProgreso('Preparando el manifiesto', 0, 1)
    const manifiesto = await n.generarManifiesto({ gh, ajustes, archivos: archivosFinales(), manifiestoPrevio: base.manifiesto, alProgreso })
    await n.publicar({ gh, head: base.head, arbol: base.arbol, nuevos, borrados, ajustes, manifiesto, mensaje: form.mensaje.value.trim(), alProgreso })
    alProgreso('Publicado', 1, 1)
    form.closest('dialog').close()
    avisar('Publicado. Los jugadores lo recibirán al pulsar Jugar (en unos minutos).')
    await cargar()
  } catch (err) {
    error.textContent = err.message
    error.hidden = false
    boton.disabled = false
  }
})

/* ---------- Carga ---------- */

async function cargar () {
  try {
    base = await n.cargarModpack(gh)
  } catch (e) {
    $('[data-contenido]').replaceChildren(h('section', { class: 'seccion' },
      encabezado('No se pudo cargar el modpack', e.message),
      h('button', { class: 'boton', onclick: cargar }, 'Reintentar')))
    return
  }
  ajustes = structuredClone(base.ajustes)
  nuevos = new Map()
  borrados = new Set()
  actualizaciones = new Map()
  compatibilidad = null
  pintar()
  const hashes = [...base.archivos.keys()].map(sha1DeRepo).filter(Boolean)
  n.identificarPorHash(hashes).then((m) => { identificados = m; pintar() }).catch(() => {})
  cargarHistoria()
  if (seccion === 'resumen' || seccion === 'servidor') consultarServidor(true)
}

document.addEventListener('click', (e) => {
  // (composedPath, porque el botón se redibuja al pulsarlo y deja de estar dentro de [data-cuenta])
  if (menuCuentaAbierto && !e.composedPath().includes($('[data-cuenta]'))) alternarMenuCuenta(false)

  const accion = e.target.closest('[data-accion]')?.dataset.accion
  if (accion === 'abrir-publicar') abrirPublicar()
  if (accion === 'cerrar-dialogo') e.target.closest('dialog').close()
  if (accion === 'descargar-zip') descargarZip(e.target.closest('button'))
  if (accion === 'ver-cambios') {
    listaCambiosAbierta = !listaCambiosAbierta
    pintarMarco()
  }
  if (accion === 'descartar') {
    const lista = cambios()
    confirmar({
      titulo: '¿Descartar los cambios?',
      texto: lista.length === 1
        ? 'Se perderá este cambio, que aún no has publicado:'
        : `Se perderán estos ${lista.length} cambios, que aún no has publicado:`,
      lista,
      aceptar: 'Descartar cambios',
      cancelar: 'Seguir editando'
    }).then((si) => {
      if (!si) return
      ajustes = structuredClone(base.ajustes)
      nuevos = new Map()
      borrados = new Set()
      actualizaciones = new Map()
      compatibilidad = null
      pintar()
      avisar('Cambios descartados.')
    })
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuCuentaAbierto) {
    alternarMenuCuenta(false)
    $('.cuenta-boton')?.focus()
  }
})

window.addEventListener('beforeunload', (e) => {
  if (cambios().length) e.preventDefault()
})

;(async () => {
  pintarMarco()
  if (gh.token) {
    try {
      usuario = await gh.comprobarLlave()
    } catch (e) {
      avisar(e.message, 'error')
      desconectar()
    }
  }
  await cargar()
})()
