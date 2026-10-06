import * as n from './nucleo.js'

const $ = (selector, raiz = document) => raiz.querySelector(selector)
const CLAVE_LLAVE = 'rataland-panel-llave'
const NOMBRES_SECCION = { mods: 'Mods', texturas: 'Packs de texturas', shaders: 'Shaders' }
const IRIS = 'YL57xq9U'

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
  for (const hijo of hijos.flat()) {
    if (hijo == null || hijo === false) continue
    el.append(hijo instanceof Node ? hijo : String(hijo))
  }
  return el
}

const tamano = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/* ---------- Estado ---------- */

let gh = new n.GitHub(leerLlave())
let usuario = null
let base = null // lo que hay publicado en GitHub
let ajustes = null // copia editable de modpack.json
let nuevos = new Map() // ruta -> archivo subido sin publicar
let borrados = new Set() // rutas del repositorio que se quitarán
let identificados = new Map() // sha1 -> datos del proyecto en Modrinth
let actualizaciones = new Map() // ruta -> { entrada, origen }
let seccion = 'mods'
let versionesMc = []
let versionesLoader = []
let compatibilidad = null

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

/* ---------- Avisos ---------- */

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
    const info = identificados.get(sha1DeRepo(a.ruta))
    lista.push({ tipo: 'repo', ruta: a.ruta, tamano: a.tamano, nombre: info?.nombre, icono: info?.icono, numero: info?.numero, proyecto: info?.proyecto })
  }
  for (const nn of nuevos.values()) {
    if (!nn.ruta.startsWith(prefijo)) continue
    const info = identificados.get(nn.sha1)
    lista.push({ tipo: 'nuevo', ruta: nn.ruta, tamano: nn.tamano, nombre: info?.nombre || nn.nombre, icono: info?.icono, numero: info?.numero || nn.version, aviso: nn.aviso, reemplaza: nn.reemplaza, proyecto: info?.proyecto })
  }
  for (const e of ajustes.externos || []) {
    if (!e.ruta.startsWith(prefijo)) continue
    lista.push({ tipo: 'modrinth', ruta: e.ruta, tamano: e.tamano, nombre: e.modrinth?.nombre, icono: e.modrinth?.icono, numero: e.modrinth?.numero, proyecto: e.modrinth?.proyecto })
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

function nombreDeRuta (ruta) {
  for (const c of Object.keys(n.CATEGORIAS)) {
    const e = elementosDe(c).find((x) => x.ruta === ruta)
    if (e?.nombre) return e.nombre
  }
  const info = identificados.get(sha1DeRepo(ruta))
  return info?.nombre || (base.ajustes.externos || []).find((e) => e.ruta === ruta)?.modrinth?.nombre || ruta.split('/').pop()
}

/** Lista legible de lo que se va a publicar. */
function cambios () {
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
    if (k === 'enlaces') return v && Object.values(v).some(Boolean) ? Object.fromEntries(Object.entries(v).filter(([, url]) => url)) : null
    if (Array.isArray(v)) return v.length ? v : null
    return v ?? null
  }
  const igual = (k) => JSON.stringify(normal(k, base.ajustes[k])) === JSON.stringify(normal(k, ajustes[k]))
  if (!igual('minecraft') || !igual('loader')) lista.push(`Cambiar a Minecraft ${ajustes.minecraft} con Fabric ${ajustes.loader?.version}`)
  if (!igual('servidor')) lista.push('Cambiar los datos del servidor')
  if (!igual('noticias')) lista.push('Cambiar las noticias')
  if (!igual('evento')) lista.push(ajustes.evento?.fecha ? 'Cambiar la cuenta atrás' : 'Quitar la cuenta atrás')
  if (!igual('enlaces')) lista.push('Cambiar los enlaces')
  if (!igual('packsActivos')) lista.push('Cambiar qué packs de texturas se activan')
  return lista
}

/* ---------- Cabecera y menú ---------- */

let menuCuentaAbierto = false

function llaveRecordada () {
  try { return Boolean(localStorage.getItem(CLAVE_LLAVE)) } catch { return false }
}

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
  h('img', { class: 'cuenta-boton__foto', src: `https://github.com/${encodeURIComponent(usuario)}.png?size=56`, alt: '' }),
  h('span', {}, usuario),
  h('span', { class: 'cuenta-boton__flecha', 'aria-hidden': 'true' }))

  const menu = h('div', { class: 'menu-cuenta', id: 'menu-cuenta', hidden: !menuCuentaAbierto },
    h('p', {}, 'Conectado con GitHub como ', h('strong', {}, usuario), '.'),
    h('p', { class: 'menu-cuenta__nota' }, llaveRecordada()
      ? 'La llave está guardada en este navegador, así que puedes publicar desde aquí.'
      : 'La llave solo dura mientras esta pestaña esté abierta.'),
    h('div', { class: 'menu-cuenta__separador' }),
    h('button', { class: 'boton boton--pequeno boton--peligro', onclick: pedirDesconectar }, 'Desconectar este navegador'))
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
  const pendientes = base ? cambios().length : 0
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

// El menú de la cuenta se cierra al pulsar fuera o con Escape.
// (composedPath, porque el botón se redibuja al pulsarlo y deja de estar dentro de [data-cuenta])
document.addEventListener('click', (e) => {
  if (menuCuentaAbierto && !e.composedPath().includes($('[data-cuenta]'))) alternarMenuCuenta(false)
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuCuentaAbierto) {
    alternarMenuCuenta(false)
    $('.cuenta-boton')?.focus()
  }
})

function pintarCabecera () {
  pintarCuenta()
  const total = base ? cambios().length : 0
  const estado = $('[data-pendientes]')
  estado.textContent = total ? `${total} ${total === 1 ? 'cambio' : 'cambios'} sin publicar` : 'Sin cambios'
  estado.classList.toggle('publicar__estado--pendiente', total > 0)
  $('[data-accion="descartar"]').hidden = !total
  $('[data-accion="abrir-publicar"]').disabled = !total

  for (const c of Object.keys(n.CATEGORIAS)) {
    $(`[data-contador="${c}"]`).textContent = base ? elementosDe(c).length : ''
  }
  document.querySelectorAll('[data-seccion]').forEach((b) => {
    if (b.dataset.seccion === seccion) b.setAttribute('aria-current', 'page')
    else b.removeAttribute('aria-current')
  })
}

function pintar () {
  pintarCabecera()
  const contenido = $('[data-contenido]')
  if (!base) return
  const vistas = { servidor: vistaServidor, noticias: vistaNoticias, evento: vistaEvento, enlaces: vistaEnlaces }
  const vista = (vistas[seccion] || (() => vistaCategoria(seccion)))()
  contenido.replaceChildren(...[vista].flat(Infinity).filter((x) => x != null && x !== false))
}

/* ---------- Mods, texturas y shaders ---------- */

let busqueda = { categoria: null, texto: '', resultados: null, cargando: false }

function vistaCategoria (categoria) {
  const c = n.CATEGORIAS[categoria]
  const elementos = elementosDe(categoria)
  const intros = {
    mods: `Los jugadores reciben estos mods al pulsar Jugar. Solo valen mods de Fabric para Minecraft ${ajustes.minecraft}.`,
    texturas: 'Los packs marcados como "Activado para todos" se activan solos en el juego de cada jugador (launcher 1.0.4 o posterior). Los demás quedan disponibles en Opciones → Paquetes de recursos.',
    shaders: 'Los jugadores los eligen en Opciones → Gráficos → Paquetes de shaders. Necesitan el mod Iris.'
  }

  const entrada = h('input', { type: 'search', placeholder: `Buscar ${categoria === 'mods' ? 'mods' : categoria === 'texturas' ? 'packs de texturas' : 'shaders'} en Modrinth`, value: busqueda.categoria === categoria ? busqueda.texto : '', 'aria-label': 'Buscar en Modrinth' })
  const selector = h('input', { type: 'file', accept: c.extension, multiple: true, hidden: true, onchange: (e) => subirArchivos(categoria, [...e.target.files]) })

  const lista = h('ul', { class: 'lista' }, elementos.length
    ? elementos.map((e) => filaElemento(categoria, e))
    : h('li', { class: 'vacio' }, `Todavía no hay ${categoria === 'mods' ? 'mods' : categoria === 'texturas' ? 'packs de texturas' : 'shaders'}. Búscalos en Modrinth o sube un archivo.`))
  lista.addEventListener('dragover', (e) => { e.preventDefault(); lista.classList.add('lista--soltando') })
  lista.addEventListener('dragleave', () => lista.classList.remove('lista--soltando'))
  lista.addEventListener('drop', (e) => {
    e.preventDefault()
    lista.classList.remove('lista--soltando')
    subirArchivos(categoria, [...e.dataTransfer.files])
  })

  const hayModrinth = elementos.some((e) => e.proyecto)
  const avisoIris = categoria === 'shaders' && elementos.length && !proyectosPresentes().has(IRIS)
    ? h('p', { class: 'aviso-caja' }, 'Los shaders no funcionarán sin el mod Iris. ',
      h('button', { class: 'enlace-boton', onclick: (ev) => anadirDeModrinth('mods', { project_id: IRIS }, ev.target) }, 'Añadir Iris'))
    : null

  return [
    h('h1', {}, NOMBRES_SECCION[categoria]),
    h('p', { class: 'intro' }, intros[categoria]),
    avisoIris,
    h('div', { class: 'herramientas' },
      h('form', { class: 'buscador', onsubmit: (e) => { e.preventDefault(); buscar(categoria, entrada.value) } },
        entrada, h('button', { class: 'boton', type: 'submit' }, 'Buscar')),
      h('button', { class: 'boton', onclick: () => selector.click() }, 'Subir archivo'),
      hayModrinth ? h('button', { class: 'boton', onclick: (e) => buscarActualizaciones(categoria, e.target) }, 'Buscar actualizaciones') : null,
      selector),
    busqueda.categoria === categoria ? vistaResultados(categoria) : null,
    lista,
    h('p', { class: 'soltar-pista' }, `También puedes arrastrar archivos ${c.extension} a la lista.`)
  ]
}

function filaElemento (categoria, e) {
  const detalle = []
  detalle.push(e.tipo === 'modrinth' ? 'De Modrinth' : e.tipo === 'nuevo' ? 'Subido ahora' : 'Subido')
  if (e.numero) detalle.push(`versión ${e.numero}`)
  if (e.tamano) detalle.push(tamano(e.tamano))
  const actualizacion = actualizaciones.get(e.ruta)
  const activo = (ajustes.packsActivos || []).includes(e.ruta)

  return h('li', { class: 'elemento' },
    e.icono ? h('img', { class: 'icono', src: e.icono, alt: '', loading: 'lazy' }) : h('div', { class: 'icono', 'aria-hidden': 'true' }),
    h('div', {},
      h('div', { class: 'elemento__nombre' }, e.nombre || e.ruta.split('/').pop(), e.tipo === 'nuevo' ? ' ' : null, e.tipo === 'nuevo' ? h('span', { class: 'etiqueta' }, e.reemplaza ? 'Reemplaza al anterior' : 'Sin publicar') : null),
      h('div', { class: 'elemento__detalle' }, `${detalle.join(', ')}. ${e.ruta.split('/').pop()}`),
      e.aviso ? h('div', { class: 'elemento__aviso' }, e.aviso) : null),
    h('div', { class: 'elemento__acciones' },
      actualizacion ? h('button', { class: 'boton boton--pequeno', onclick: () => aplicarActualizacion(e.ruta) }, `Actualizar a ${actualizacion.entrada.modrinth.numero}`) : null,
      categoria === 'texturas'
        ? h('label', { class: 'casilla' }, h('input', { type: 'checkbox', checked: activo, onchange: (ev) => cambiarActivo(e.ruta, ev.target.checked) }), 'Activado para todos')
        : null,
      h('button', { class: 'boton boton--pequeno boton--peligro', onclick: () => quitar(e) }, 'Quitar')))
}

function vistaResultados (categoria) {
  const cerrar = h('button', { class: 'enlace-boton', onclick: () => { busqueda = { categoria: null }; pintar() } }, 'Cerrar')
  if (busqueda.cargando) return h('div', { class: 'resultados' }, h('p', { class: 'cargando' }, 'Buscando en Modrinth…'))
  const resultados = busqueda.resultados || []
  const presentes = proyectosPresentes()
  return h('div', { class: 'resultados' },
    h('div', { class: 'resultados__cabecera' }, h('span', {}, resultados.length ? `Resultados en Modrinth para Minecraft ${ajustes.minecraft}` : 'No hay resultados compatibles.'), cerrar),
    resultados.map((r) => h('div', { class: 'resultado' },
      r.icon_url ? h('img', { class: 'icono', src: r.icon_url, alt: '', loading: 'lazy' }) : h('div', { class: 'icono', 'aria-hidden': 'true' }),
      h('div', {},
        h('div', { class: 'resultado__titulo' }, r.title),
        h('div', { class: 'resultado__descripcion' }, r.description)),
      presentes.has(r.project_id)
        ? h('button', { class: 'boton boton--pequeno', disabled: true }, 'Ya está')
        : h('button', { class: 'boton boton--pequeno', onclick: (ev) => anadirDeModrinth(categoria, r, ev.target) }, 'Añadir'))))
}

async function buscar (categoria, texto) {
  busqueda = { categoria, texto, resultados: null, cargando: true }
  pintar()
  try {
    busqueda.resultados = await n.buscarEnModrinth(categoria, texto.trim(), ajustes.minecraft)
  } catch (e) {
    avisar(e.message, 'error')
    busqueda.resultados = []
  }
  busqueda.cargando = false
  pintar()
}

async function anadirDeModrinth (categoria, resultado, boton) {
  if (boton) { boton.disabled = true; boton.textContent = 'Añadiendo…' }
  try {
    const proyecto = await n.proyectoModrinth(resultado.project_id)
    const version = await n.versionCompatible(proyecto.id, categoria, ajustes.minecraft)
    if (!version) throw new Error(`${proyecto.title} no tiene versión para Minecraft ${ajustes.minecraft}${categoria === 'mods' ? ' con Fabric' : ''}.`)
    const entrada = n.entradaDeVersion(version, categoria, proyecto)
    if (rutaOcupada(entrada.ruta)) throw new Error(`${proyecto.title} ya está en el modpack.`)
    let extra = []
    let faltan = []
    if (categoria === 'mods') {
      ({ anadir: extra, faltan } = await n.dependenciasDe(version, ajustes.minecraft, proyectosPresentes()))
      extra = extra.filter((x) => !rutaOcupada(x.ruta))
    }
    ajustes.externos = [...(ajustes.externos || []), entrada, ...extra]
    if (categoria === 'texturas') ajustes.packsActivos = [...(ajustes.packsActivos || []), entrada.ruta]
    avisar(`Añadido ${proyecto.title}${extra.length ? ` y lo que necesita: ${extra.map((x) => x.modrinth.nombre).join(', ')}` : ''}.`)
    if (faltan.length) avisar(`${proyecto.title} necesita ${faltan.join(', ')}, que no tiene versión para ${ajustes.minecraft}.`, 'error')
  } catch (e) {
    avisar(e.message, 'error')
  }
  pintar()
}

async function subirArchivos (categoria, archivos) {
  const c = n.CATEGORIAS[categoria]
  for (const archivo of archivos) {
    try {
      const nombre = archivo.name.replace(/[\\/:*?"<>|]/g, '_')
      const bytes = new Uint8Array(await archivo.arrayBuffer())
      const analisis = await n.analizarArchivo(window.JSZip, categoria, nombre, bytes, ajustes.minecraft)
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
      n.identificarPorHash([sha1]).then((m) => { if (m.size) { m.forEach((v, k) => identificados.set(k, v)); pintar() } }).catch(() => {})
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
  if (e.tipo === 'repo') borrados.add(e.ruta)
  if (e.tipo === 'nuevo') {
    nuevos.delete(e.ruta)
    if (base.archivos.has(e.ruta)) borrados.add(e.ruta)
  }
  if (e.tipo === 'modrinth') ajustes.externos = ajustes.externos.filter((x) => x.ruta !== e.ruta)
  ajustes.packsActivos = (ajustes.packsActivos || []).filter((r) => r !== e.ruta)
  actualizaciones.delete(e.ruta)
  pintar()
}

function cambiarActivo (ruta, activo) {
  const lista = (ajustes.packsActivos || []).filter((r) => r !== ruta)
  ajustes.packsActivos = activo ? [...lista, ruta] : lista
  pintarCabecera()
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
      const v = await n.versionCompatible(e.proyecto, categoria, ajustes.minecraft)
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

function campo (etiqueta, control, ayuda) {
  return h('label', { class: 'campo' }, h('span', { class: 'campo__etiqueta' }, etiqueta), control, ayuda ? h('span', { class: 'campo__ayuda' }, ayuda) : null)
}

function vistaServidor () {
  const s = ajustes.servidor || (ajustes.servidor = {})
  const alCambiar = (fn) => (e) => { fn(e.target); pintarCabecera() }

  const mc = h('select', { onchange: (e) => cambiarMinecraft(e.target.value) },
    [...new Set([ajustes.minecraft, ...versionesMc])].map((v) => h('option', { value: v, selected: v === ajustes.minecraft }, v)))
  const loaderActual = ajustes.loader?.version
  const loader = h('select', { onchange: alCambiar((t) => { ajustes.loader = { tipo: 'fabric', version: t.value } }) },
    [...new Map([[loaderActual, null], ...versionesLoader.map((v) => [v.version, v])]).entries()].filter(([v]) => v).map(([v, info]) =>
      h('option', { value: v, selected: v === loaderActual }, info?.estable ? `${v} (recomendada)` : v)))
  if (!versionesMc.length) cargarVersiones()

  return [
    h('h1', {}, 'Servidor y versión'),
    h('p', { class: 'intro' }, 'Los launchers de los jugadores se adaptan solos al publicar: descargan la versión de Minecraft y de Fabric que elijas aquí.'),
    h('div', { class: 'formulario' },
      h('div', { class: 'fila' },
        campo('Dirección del servidor', h('input', { value: s.ip || '', onchange: alCambiar((t) => { s.ip = t.value.trim() }) })),
        campo('Puerto', h('input', { type: 'number', min: 1, max: 65535, value: s.puerto || 25565, onchange: alCambiar((t) => { s.puerto = Number(t.value) || 25565 }) }))),
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: s.entrarDirecto === true, onchange: alCambiar((t) => { s.entrarDirecto = t.checked }) }),
        h('span', {}, 'Entrar al servidor nada más abrir el juego', h('br'), h('span', { class: 'campo__ayuda' }, 'Si está desmarcado, los jugadores ven el menú de RataLand y entran con su botón Jugar.'))),
      h('div', { class: 'fila' },
        campo('Versión de Minecraft', mc),
        campo('Versión de Fabric', loader)),
      vistaCompatibilidad())
  ]
}

async function cargarVersiones () {
  try {
    ;[versionesMc, versionesLoader] = await Promise.all([n.versionesMinecraft(), n.versionesFabric()])
    if (seccion === 'servidor') pintar()
  } catch {
    avisar('No se pudieron cargar las versiones de Minecraft y Fabric.', 'error')
  }
}

async function cambiarMinecraft (version) {
  const anterior = ajustes.minecraft
  ajustes.minecraft = version
  compatibilidad = version === base.ajustes.minecraft ? null : { version, anterior, cargando: true, filas: [] }
  pintar()
  if (!compatibilidad) return
  const filas = []
  for (const c of Object.keys(n.CATEGORIAS)) {
    for (const e of elementosDe(c)) {
      if (!e.proyecto) { filas.push({ e, categoria: c, nueva: undefined }); continue }
      const v = await n.versionCompatible(e.proyecto, c, version).catch(() => null)
      filas.push({ e, categoria: c, nueva: v ? n.entradaDeVersion(v, c, { id: e.proyecto, title: e.nombre, icon_url: e.icono }) : null })
    }
  }
  if (compatibilidad?.version !== version) return
  compatibilidad = { version, anterior, cargando: false, filas }
  pintar()
}

function vistaCompatibilidad () {
  if (!compatibilidad) return null
  if (compatibilidad.cargando) return h('p', { class: 'aviso-caja' }, `Comprobando qué mods tienen versión para ${compatibilidad.version}…`)
  const sinVersion = compatibilidad.filas.filter((f) => f.nueva === null)
  const manuales = compatibilidad.filas.filter((f) => f.nueva === undefined)
  const cambiables = compatibilidad.filas.filter((f) => f.nueva && f.nueva.ruta !== f.e.ruta)
  return h('div', { class: 'aviso-caja' },
    h('strong', {}, `Cambiar a Minecraft ${compatibilidad.version}`),
    cambiables.length ? h('p', {}, `${cambiables.length} de Modrinth tienen versión para ${compatibilidad.version}.`) : null,
    sinVersion.length ? [h('p', {}, 'No tienen versión para esta versión de Minecraft (quítalos o vuelve a la anterior):'), h('ul', {}, sinVersion.map((f) => h('li', {}, f.e.nombre || f.e.ruta)))] : null,
    manuales.length ? [h('p', {}, 'Revisa a mano (subidos sin datos de Modrinth):'), h('ul', {}, manuales.map((f) => h('li', {}, f.e.nombre || f.e.ruta.split('/').pop(), /rataland-menu/i.test(f.e.ruta) ? ': el mod de RataLand hay que recompilarlo para la nueva versión.' : '')))] : null,
    h('p', {},
      cambiables.length ? h('button', { class: 'boton boton--pequeno', onclick: aplicarCambioVersion }, 'Cambiar los de Modrinth a su versión nueva') : null,
      ' ',
      h('button', { class: 'enlace-boton', onclick: () => { ajustes.minecraft = compatibilidad.anterior; compatibilidad = null; pintar() } }, `Volver a ${compatibilidad.anterior}`)))
}

function aplicarCambioVersion () {
  for (const f of compatibilidad.filas) {
    if (!f.nueva || f.nueva.ruta === f.e.ruta) continue
    actualizaciones.set(f.e.ruta, { entrada: f.nueva, origen: f.e.tipo })
    aplicarActualizacion(f.e.ruta)
  }
  compatibilidad.filas = compatibilidad.filas.filter((f) => !f.nueva)
  avisar('Mods de Modrinth cambiados a la nueva versión.')
  pintar()
}

/* ---------- Noticias ---------- */

function vistaNoticias () {
  const noticias = ajustes.noticias || (ajustes.noticias = [])
  const hoy = new Date().toISOString().slice(0, 10)
  return [
    h('h1', {}, 'Noticias'),
    h('p', { class: 'intro' }, 'Aparecen a la derecha del launcher, en este orden.'),
    h('p', {}, h('button', { class: 'boton', onclick: () => { noticias.unshift({ fecha: hoy, titulo: '', texto: '' }); pintar() } }, 'Añadir noticia')),
    h('div', { class: 'tarjetas' }, noticias.length
      ? noticias.map((noticia, i) => h('div', { class: 'tarjeta' },
        h('div', { class: 'fila' },
          campo('Título', h('input', { value: noticia.titulo || '', oninput: (e) => { noticia.titulo = e.target.value; pintarCabecera() } })),
          campo('Fecha', h('input', { type: 'date', value: noticia.fecha || '', oninput: (e) => { noticia.fecha = e.target.value; pintarCabecera() } }))),
        campo('Texto', h('textarea', { oninput: (e) => { noticia.texto = e.target.value; pintarCabecera() } }, noticia.texto || '')),
        h('p', {}, h('button', { class: 'boton boton--pequeno boton--peligro', onclick: () => { noticias.splice(i, 1); pintar() } }, 'Quitar noticia'))))
      : h('p', { class: 'vacio' }, 'No hay noticias.'))
  ]
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
  const actualizarPrevia = () => {
    const ms = new Date(ev.fecha).getTime() - Date.now()
    if (!ev.fecha || Number.isNaN(ms)) previa.textContent = 'Sin cuenta atrás.'
    else if (ms <= 0) previa.textContent = `${ev.titulo || 'El evento'}: ¡Ya empezó!`
    else {
      const s = Math.floor(ms / 1000)
      previa.textContent = `${ev.titulo || 'El próximo evento'} empieza en ${Math.floor(s / 86400)}d ${String(Math.floor(s / 3600) % 24).padStart(2, '0')}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m`
    }
  }
  actualizarPrevia()
  return [
    h('h1', {}, 'Cuenta atrás'),
    h('p', { class: 'intro' }, 'Se muestra en el launcher debajo del estado del servidor. Al llegar la hora dice "¡Ya empezó!" durante las horas que indiques y luego desaparece.'),
    h('div', { class: 'formulario' },
      campo('Título', h('input', { value: ev.titulo || '', placeholder: 'Episodio 2', oninput: (e) => { ev.titulo = e.target.value; actualizarPrevia(); pintarCabecera() } })),
      h('div', { class: 'fila' },
        campo('Fecha y hora', h('input', {
          type: 'datetime-local',
          value: ev.fecha ? aFechaLocal(ev.fecha) : '',
          oninput: (e) => { ev.fecha = e.target.value ? `${e.target.value}:00${desfaseLocal()}` : ''; actualizarPrevia(); pintarCabecera() }
        }), `Hora de este dispositivo (UTC${desfaseLocal()}). Cada jugador la verá en su hora.`),
        campo('Duración (horas)', h('input', { type: 'number', min: 1, max: 48, value: ev.duracionHoras || 3, oninput: (e) => { ev.duracionHoras = Number(e.target.value) || 3; pintarCabecera() } }))),
      h('div', { class: 'tarjeta' }, h('span', { class: 'campo__ayuda' }, 'Así se verá ahora mismo:'), previa),
      ev.fecha ? h('p', {}, h('button', { class: 'boton boton--peligro', onclick: () => { ajustes.evento = { titulo: '', fecha: '', duracionHoras: 3 }; pintar() } }, 'Quitar cuenta atrás')) : null)
  ]
}

/* ---------- Enlaces ---------- */

function vistaEnlaces () {
  const enlaces = ajustes.enlaces || (ajustes.enlaces = {})
  const tipos = [['discord', 'Discord', 'https://discord.gg/…'], ['youtube', 'YouTube', 'https://youtube.com/@…'], ['tiktok', 'TikTok', 'https://tiktok.com/@…'], ['twitch', 'Twitch', 'https://twitch.tv/…'], ['x', 'X', 'https://x.com/…'], ['web', 'Web', 'https://…']]
  return [
    h('h1', {}, 'Enlaces'),
    h('p', { class: 'intro' }, 'Los que tengan dirección aparecen abajo en el launcher. Discord además sale en el menú de pausa del juego.'),
    h('div', { class: 'formulario' }, tipos.map(([clave, nombre, ejemplo]) => {
      const error = h('span', { class: 'campo__ayuda error', hidden: true }, 'Tiene que empezar por https://')
      return campo(nombre, [h('input', {
        type: 'url',
        value: enlaces[clave] || '',
        placeholder: ejemplo,
        oninput: (e) => {
          const v = e.target.value.trim()
          error.hidden = !v || /^https:\/\//.test(v)
          if (!v) delete enlaces[clave]
          else enlaces[clave] = v
          pintarCabecera()
        }
      }), error])
    }))
  ]
}

/* ---------- Conexión ---------- */

function abrirDialogo (nombre) {
  const d = $(`[data-dialogo="${nombre}"]`)
  if (!d.open) d.showModal()
  return d
}

async function conectar (llave, recordar) {
  const prueba = new n.GitHub(llave)
  usuario = await prueba.comprobarLlave()
  gh = prueba
  guardarLlave(llave, recordar)
  pintarCabecera()
}

function desconectar () {
  guardarLlave('', false)
  gh = new n.GitHub('')
  usuario = null
  pintarCabecera()
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
    const NOMBRES_ENLACE = { discord: 'Discord', youtube: 'YouTube', tiktok: 'TikTok', twitch: 'Twitch', x: 'X', web: 'Web' }
    for (const [clave, url] of Object.entries(ajustes.enlaces)) {
      if (!/^https:\/\//.test(url)) throw new Error(`El enlace de ${NOMBRES_ENLACE[clave] || clave} tiene que empezar por https:// (o déjalo vacío en Enlaces).`)
    }
    if (ajustes.externos && !ajustes.externos.length) delete ajustes.externos
    alProgreso('Preparando el manifiesto', 0, 1)
    const manifiesto = await n.generarManifiesto({ gh, ajustes, archivos: archivosFinales(), manifiestoPrevio: base.manifiesto, alProgreso })
    const commit = await n.publicar({ gh, head: base.head, arbol: base.arbol, nuevos, borrados, ajustes, manifiesto, mensaje: form.mensaje.value.trim(), alProgreso })
    alProgreso('Publicado', 1, 1)
    form.closest('dialog').close()
    avisar('Publicado. Los jugadores lo recibirán al pulsar Jugar (en unos minutos).')
    console.info('Commit publicado:', commit.html_url)
    await cargar()
  } catch (err) {
    error.textContent = err.message
    error.hidden = false
    boton.disabled = false
  }
})

/* ---------- Carga ---------- */

async function cargar () {
  const contenido = $('[data-contenido]')
  try {
    base = await n.cargarModpack(gh)
  } catch (e) {
    contenido.replaceChildren(h('p', { class: 'error' }, `No se pudo cargar el modpack: ${e.message}`),
      h('button', { class: 'boton', onclick: cargar }, 'Reintentar'))
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
}

document.addEventListener('click', (e) => {
  const opcion = e.target.closest('[data-seccion]')
  if (opcion) {
    seccion = opcion.dataset.seccion
    pintar()
    $('[data-contenido]').focus?.()
  }
  const accion = e.target.closest('[data-accion]')?.dataset.accion
  if (accion === 'abrir-publicar') abrirPublicar()
  if (accion === 'cerrar-dialogo') e.target.closest('dialog').close()
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

window.addEventListener('beforeunload', (e) => {
  if (base && cambios().length) e.preventDefault()
})

;(async () => {
  if (gh.token) {
    try {
      usuario = await gh.comprobarLlave()
    } catch (e) {
      avisar(e.message, 'error')
      desconectar()
    }
  }
  pintarCabecera()
  await cargar()
})()
