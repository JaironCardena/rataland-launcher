// Lógica del panel (sin interfaz): GitHub, Modrinth, análisis de archivos y manifiesto.
// Funciona igual en el navegador y en Node (para las pruebas).

export const CONFIG = {
  propietario: 'JaironCardena',
  repositorio: 'rataland-launcher',
  rama: 'main',
  carpeta: 'modpack'
}

// Archivos de la carpeta del modpack que no se reparten a los jugadores.
const IGNORADOS = new Set(['modpack.json', 'manifest.json', 'readme.md', 'license', 'license.md'])
const LIMITE_SUBIDA = 95 * 1024 * 1024

export const CATEGORIAS = {
  mods: { carpeta: 'mods', tipoModrinth: 'mod', loaders: ['fabric'], extension: '.jar', nombre: 'mod' },
  texturas: { carpeta: 'resourcepacks', tipoModrinth: 'resourcepack', loaders: ['minecraft'], extension: '.zip', nombre: 'pack de texturas' },
  shaders: { carpeta: 'shaderpacks', tipoModrinth: 'shader', loaders: ['iris'], extension: '.zip', nombre: 'shader' }
}

export function categoriaDe (ruta) {
  return Object.keys(CATEGORIAS).find((c) => ruta.startsWith(CATEGORIAS[c].carpeta + '/')) || null
}

/* ---------- Utilidades ---------- */

export function aBase64 (bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export async function sha1Hex (bytes) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA que Git da a un archivo (el que muestra GitHub); sirve para saber si cambió sin descargarlo. */
export async function shaGit (bytes) {
  const cabecera = new TextEncoder().encode(`blob ${bytes.length}\0`)
  const todo = new Uint8Array(cabecera.length + bytes.length)
  todo.set(cabecera)
  todo.set(bytes, cabecera.length)
  return sha1Hex(todo)
}

export const codificarRuta = (ruta) => ruta.split('/').map(encodeURIComponent).join('/')

/* ---------- GitHub ---------- */

function mensajeGitHub (status, detalle) {
  if (status === 401) return 'La llave de GitHub no es válida o ha caducado. Crea una nueva.'
  if (status === 403 && /rate limit/i.test(detalle)) return 'GitHub ha limitado las consultas sin llave. Conecta tu llave o espera unos minutos.'
  if (status === 403 || status === 404) return `GitHub rechazó la operación (${detalle || status}). Comprueba que la llave tenga permiso de escritura en ${CONFIG.repositorio}.`
  if (status === 409 || status === 422) return `GitHub no aceptó el cambio: ${detalle || status}.`
  return `GitHub respondió ${status}${detalle ? `: ${detalle}` : ''}.`
}

export class GitHub {
  constructor (token = '') {
    this.token = token
    this.base = `https://api.github.com/repos/${CONFIG.propietario}/${CONFIG.repositorio}`
  }

  async pedir (metodo, ruta, cuerpo, { crudo = false } = {}) {
    const cabeceras = {
      Accept: crudo ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
    if (this.token) cabeceras.Authorization = `Bearer ${this.token}`
    if (cuerpo) cabeceras['Content-Type'] = 'application/json'
    const url = ruta.startsWith('https://') ? ruta : this.base + ruta
    const res = await fetch(url, { method: metodo, headers: cabeceras, body: cuerpo ? JSON.stringify(cuerpo) : undefined, cache: 'no-store' })
    if (!res.ok) {
      let detalle = ''
      try { detalle = (await res.json()).message || '' } catch { /* sin cuerpo */ }
      const error = new Error(mensajeGitHub(res.status, detalle))
      error.status = res.status
      throw error
    }
    if (crudo) return new Uint8Array(await res.arrayBuffer())
    return res.status === 204 ? null : res.json()
  }

  get (ruta, opciones) { return this.pedir('GET', ruta, null, opciones) }
  post (ruta, cuerpo) { return this.pedir('POST', ruta, cuerpo) }
  patch (ruta, cuerpo) { return this.pedir('PATCH', ruta, cuerpo) }

  /** Comprueba la llave: devuelve el usuario o lanza un error claro. */
  async comprobarLlave () {
    const repo = await this.get('')
    // GitHub indica el rol de la cuenta (no el de la llave): si ni la cuenta puede escribir, la llave tampoco.
    if (repo.permissions && !repo.permissions.push) throw new Error(`Esa cuenta no puede escribir en ${CONFIG.repositorio}. Crea la llave con la cuenta dueña del repositorio.`)
    const usuario = await this.get('https://api.github.com/user').catch(() => null)
    return usuario?.login || CONFIG.propietario
  }
}

/** Lee el estado actual del modpack en GitHub. */
export async function cargarModpack (gh) {
  const ref = await gh.get(`/git/ref/heads/${CONFIG.rama}`)
  const head = ref.object.sha
  const commit = await gh.get(`/git/commits/${head}`)
  const arbol = await gh.get(`/git/trees/${commit.tree.sha}?recursive=1`)
  if (arbol.truncated) throw new Error('El repositorio es demasiado grande para leerlo de una vez.')

  const prefijo = CONFIG.carpeta + '/'
  const archivos = new Map()
  let shaAjustes = null
  let shaManifiesto = null
  for (const e of arbol.tree) {
    if (e.type !== 'blob' || !e.path.startsWith(prefijo)) continue
    const ruta = e.path.slice(prefijo.length)
    if (ruta === 'modpack.json') { shaAjustes = e.sha; continue }
    if (ruta === 'manifest.json') { shaManifiesto = e.sha; continue }
    if (ruta.split('/').some((parte) => parte.startsWith('.'))) continue
    if (!ruta.includes('/') && IGNORADOS.has(ruta.toLowerCase())) continue
    archivos.set(ruta, { ruta, git: e.sha, tamano: e.size })
  }

  const leerJson = async (sha) => JSON.parse(new TextDecoder().decode(await gh.get(`/git/blobs/${sha}`, { crudo: true })))
  const ajustes = shaAjustes ? await leerJson(shaAjustes) : {}
  const manifiesto = shaManifiesto ? await leerJson(shaManifiesto) : { archivos: [] }
  return { head, arbol: commit.tree.sha, archivos, ajustes, manifiesto }
}

/**
 * Genera manifest.json igual que tools/publicar.js.
 * `archivos`: los archivos del repositorio que quedarán tras publicar ({ ruta, git, tamano, sha1? }).
 */
export async function generarManifiesto ({ gh, ajustes, archivos, manifiestoPrevio, alProgreso }) {
  if (!/^https?:\/\/.+\/$/.test(ajustes.urlBase || '')) throw new Error('Falta "urlBase" en modpack.json.')
  const previo = new Map((manifiestoPrevio?.archivos || []).map((a) => [a.ruta, a]))
  const soloSiFalta = new Set(ajustes.soloSiFalta || [])
  const lista = []
  const ordenados = [...archivos.values()].sort((a, b) => a.ruta.localeCompare(b.ruta))
  let i = 0
  for (const a of ordenados) {
    let sha1 = a.sha1
    const p = previo.get(a.ruta)
    if (!sha1 && p?.git === a.git && p.sha1) sha1 = p.sha1
    if (!sha1) {
      alProgreso?.(`Comprobando ${a.ruta}`, i, ordenados.length)
      sha1 = await sha1Hex(await gh.get(`/git/blobs/${a.git}`, { crudo: true }))
    }
    i++
    lista.push({
      ruta: a.ruta,
      url: ajustes.urlBase + codificarRuta(a.ruta),
      sha1,
      tamano: a.tamano,
      git: a.git,
      ...(soloSiFalta.has(a.ruta) ? { soloSiFalta: true } : {})
    })
  }
  const rutas = new Set(lista.map((a) => a.ruta))
  for (const e of ajustes.externos || []) {
    if (rutas.has(e.ruta)) throw new Error(`"${e.ruta}" está dos veces (subido y de Modrinth).`)
    lista.push({ ruta: e.ruta, url: e.url, sha1: e.sha1, tamano: e.tamano, ...(e.modrinth ? { modrinth: e.modrinth } : {}) })
    rutas.add(e.ruta)
  }

  const evento = ajustes.evento?.fecha ? ajustes.evento : null
  if (evento && Number.isNaN(new Date(evento.fecha).getTime())) throw new Error('La fecha de la cuenta atrás no es válida.')

  return {
    generado: new Date().toISOString(),
    minecraft: ajustes.minecraft,
    loader: ajustes.loader,
    servidor: ajustes.servidor,
    carpetasSincronizadas: ajustes.carpetasSincronizadas || ['mods'],
    noticias: ajustes.noticias || [],
    enlaces: ajustes.enlaces || {},
    evento,
    packsActivos: (ajustes.packsActivos || []).filter((r) => rutas.has(r)),
    archivos: lista
  }
}

/**
 * Publica todo en un único commit: archivos subidos, archivos quitados, modpack.json y manifest.json.
 * Si alguien cambió el repositorio mientras tanto, no publica (para no pisar sus cambios).
 */
export async function publicar ({ gh, head, arbol, nuevos, borrados, ajustes, manifiesto, mensaje, alProgreso }) {
  const ref = await gh.get(`/git/ref/heads/${CONFIG.rama}`)
  if (ref.object.sha !== head) {
    throw new Error('El repositorio cambió en GitHub mientras editabas. Recarga el panel y vuelve a hacer los cambios.')
  }
  const entradas = []
  let i = 0
  for (const n of nuevos.values()) {
    alProgreso?.(`Subiendo ${n.ruta}`, i++, nuevos.size)
    const blob = await gh.post('/git/blobs', { content: aBase64(n.bytes), encoding: 'base64' })
    if (blob.sha !== n.git) throw new Error(`GitHub guardó ${n.ruta} distinto de lo esperado. Vuelve a intentarlo.`)
    entradas.push({ path: `${CONFIG.carpeta}/${n.ruta}`, mode: '100644', type: 'blob', sha: blob.sha })
  }
  for (const ruta of borrados) {
    if (!nuevos.has(ruta)) entradas.push({ path: `${CONFIG.carpeta}/${ruta}`, mode: '100644', type: 'blob', sha: null })
  }
  entradas.push({ path: `${CONFIG.carpeta}/modpack.json`, mode: '100644', type: 'blob', content: JSON.stringify(ajustes, null, 2) + '\n' })
  entradas.push({ path: `${CONFIG.carpeta}/manifest.json`, mode: '100644', type: 'blob', content: JSON.stringify(manifiesto, null, 2) + '\n' })

  alProgreso?.('Guardando en GitHub', nuevos.size, nuevos.size)
  const arbolNuevo = await gh.post('/git/trees', { base_tree: arbol, tree: entradas })
  const commit = await gh.post('/git/commits', { message: mensaje, tree: arbolNuevo.sha, parents: [head] })
  await gh.patch(`/git/refs/heads/${CONFIG.rama}`, { sha: commit.sha })
  return commit
}

/* ---------- Modrinth ---------- */

const MODRINTH = 'https://api.modrinth.com/v2'

async function modrinth (ruta, opciones) {
  const res = await fetch(MODRINTH + ruta, opciones)
  if (!res.ok) throw new Error(`Modrinth respondió ${res.status}. Prueba otra vez en un momento.`)
  return res.json()
}

export async function buscarEnModrinth (categoria, texto, mc) {
  const c = CATEGORIAS[categoria]
  const facetas = [[`project_type:${c.tipoModrinth}`], [`versions:${mc}`]]
  if (categoria === 'mods') facetas.push(['categories:fabric'])
  if (categoria === 'shaders') facetas.push(['categories:iris'])
  const q = new URLSearchParams({ query: texto, facets: JSON.stringify(facetas), limit: '20', index: texto ? 'relevance' : 'downloads' })
  return (await modrinth(`/search?${q}`)).hits
}

export const proyectoModrinth = (id) => modrinth(`/project/${encodeURIComponent(id)}`)

export async function proyectosModrinth (ids) {
  if (!ids.length) return []
  return modrinth(`/projects?ids=${encodeURIComponent(JSON.stringify(ids))}`)
}

/** Última versión del proyecto que funciona con esta versión de Minecraft (y Fabric/Iris si toca). */
export async function versionCompatible (proyecto, categoria, mc) {
  const c = CATEGORIAS[categoria]
  const q = new URLSearchParams({ game_versions: JSON.stringify([mc]), loaders: JSON.stringify(c.loaders) })
  const versiones = await modrinth(`/project/${encodeURIComponent(proyecto)}/version?${q}`)
  return versiones.find((v) => v.version_type === 'release') || versiones[0] || null
}

export function entradaDeVersion (version, categoria, proyecto) {
  const archivo = version.files.find((f) => f.primary) || version.files[0]
  return {
    ruta: `${CATEGORIAS[categoria].carpeta}/${archivo.filename}`,
    url: archivo.url,
    sha1: archivo.hashes.sha1,
    tamano: archivo.size,
    modrinth: {
      proyecto: proyecto.id,
      version: version.id,
      numero: version.version_number,
      nombre: proyecto.title,
      icono: proyecto.icon_url || ''
    }
  }
}

/** Dependencias obligatorias (y las de estas), listas para añadir. Las que no existen para esta versión van en `faltan`. */
export async function dependenciasDe (version, mc, yaPresentes = new Set()) {
  const anadir = []
  const faltan = []
  const vistos = new Set(yaPresentes)
  const pendientes = [version]
  while (pendientes.length) {
    const v = pendientes.shift()
    for (const d of v.dependencies || []) {
      if (d.dependency_type !== 'required' || !d.project_id || vistos.has(d.project_id)) continue
      vistos.add(d.project_id)
      const proyecto = await proyectoModrinth(d.project_id)
      const versionDep = d.version_id ? await modrinth(`/version/${d.version_id}`) : await versionCompatible(d.project_id, 'mods', mc)
      if (!versionDep) { faltan.push(proyecto.title); continue }
      anadir.push(entradaDeVersion(versionDep, 'mods', proyecto))
      pendientes.push(versionDep)
    }
  }
  return { anadir, faltan }
}

/** Identifica en Modrinth archivos subidos a mano (por su sha1): nombre, icono y proyecto. */
export async function identificarPorHash (hashes) {
  if (!hashes.length) return new Map()
  const versiones = await modrinth('/version_files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hashes, algorithm: 'sha1' })
  })
  const proyectos = await proyectosModrinth([...new Set(Object.values(versiones).map((v) => v.project_id))])
  const porId = new Map(proyectos.map((p) => [p.id, p]))
  const resultado = new Map()
  for (const [hash, v] of Object.entries(versiones)) {
    const p = porId.get(v.project_id)
    if (p) resultado.set(hash, { proyecto: p.id, version: v.id, numero: v.version_number, nombre: p.title, icono: p.icon_url || '' })
  }
  return resultado
}

/* ---------- Versiones de Minecraft y Fabric ---------- */

export async function versionesMinecraft () {
  const res = await fetch('https://meta.fabricmc.net/v2/versions/game')
  return (await res.json()).filter((v) => v.stable).map((v) => v.version)
}

/** Últimas versiones del loader de Fabric: [{ version, estable }]. */
export async function versionesFabric () {
  const res = await fetch('https://meta.fabricmc.net/v2/versions/loader')
  return (await res.json()).slice(0, 25).map((v) => ({ version: v.version, estable: v.stable }))
}

/* ---------- Estado del servidor y del repositorio ---------- */

/**
 * Estado del servidor de Minecraft usando mcstatus.io (el navegador no puede hablar con el servidor directamente).
 * Aternos contesta aunque esté apagado, con la versión "● Offline": eso cuenta como apagado.
 */
export async function estadoServidor (ip, puerto) {
  const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(ip)}:${Number(puerto) || 25565}`)
  if (!res.ok) throw new Error('No se pudo consultar el estado del servidor.')
  const j = await res.json()
  const version = j.version?.name_clean || ''
  const encendido = Boolean(j.online) && (j.version?.protocol ?? 0) >= 0 && !/offline/i.test(version)
  return {
    encendido,
    version,
    versionMinecraft: (/\d+\.\d+(?:\.\d+)?/.exec(version) || [])[0] || null,
    jugadores: j.players?.online ?? 0,
    maximo: j.players?.max ?? 0,
    lista: (j.players?.list || []).map((p) => ({ nombre: p.name_clean, uuid: p.uuid })),
    motd: j.motd?.clean || ''
  }
}

/** Último cambio publicado del modpack (fecha, mensaje y autor). */
export async function ultimaPublicacion (gh) {
  const [c] = await gh.get(`/commits?path=${CONFIG.carpeta}/manifest.json&per_page=1`)
  return c ? { fecha: c.commit.committer.date, mensaje: c.commit.message.split('\n')[0], autor: c.author?.login || c.commit.author.name, url: c.html_url } : null
}

/** Última versión publicada del launcher y cuántas veces se ha descargado su instalador. */
export async function ultimaVersionLauncher (gh) {
  const r = await gh.get('/releases/latest')
  const instalador = r.assets.find((a) => a.name.endsWith('.exe'))
  return { version: r.tag_name.replace(/^v/, ''), fecha: r.published_at, descargas: instalador?.download_count ?? 0, url: r.html_url }
}

/* ---------- Comparar con los mods del servidor ---------- */

const NO_SON_MODS = new Set(['java', 'minecraft', 'fabricloader'])

/**
 * Lee la lista "Loading N mods:" del registro de arranque de un servidor Fabric.
 * Solo los mods de primer nivel (no los que van dentro de otros, marcados con |-- o \--).
 */
export function modsDelRegistro (texto) {
  const lineas = texto.split(/\r?\n/)
  const inicio = lineas.findIndex((l) => /Loading \d+ mods:/.test(l))
  if (inicio < 0) return null
  const mods = []
  let loader = null
  let minecraft = null
  for (let i = inicio + 1; i < lineas.length; i++) {
    const l = lineas[i]
    if (!l.trim() || /^\s*[|\\]/.test(l) || /[|\\]--/.test(l)) continue
    const m = /(?:^|\s)- ([A-Za-z0-9_.-]+) (\S+)\s*$/.exec(l)
    if (!m) break
    if (m[1] === 'fabricloader') loader = m[2]
    if (m[1] === 'minecraft') minecraft = m[2]
    if (!NO_SON_MODS.has(m[1])) mods.push({ id: m[1], version: m[2] })
  }
  return { mods, loader, minecraft }
}

/** Datos de fabric.mod.json: id, nombre, versión y si es solo para el cliente. */
export async function infoDeMod (JSZip, bytes) {
  const zip = await JSZip.loadAsync(bytes)
  const fmj = zip.file('fabric.mod.json')
  if (!fmj) return null
  const info = JSON.parse(await fmj.async('string'))
  return { id: info.id, nombre: info.name || info.id, version: info.version, entorno: info.environment || '*' }
}

/**
 * Compara los mods del modpack (con su fabric.mod.json) con los del servidor.
 * Devuelve grupos: faltanEnModpack, otraVersion, faltanEnServidor, soloCliente, coinciden.
 */
export function compararMods (cliente, servidor) {
  const delServidor = new Map(servidor.map((m) => [m.id, m]))
  const delCliente = new Map(cliente.filter((m) => m.id).map((m) => [m.id, m]))
  const r = { faltanEnModpack: [], otraVersion: [], faltanEnServidor: [], soloCliente: [], coinciden: [] }
  for (const m of cliente) {
    if (!m.id) continue
    const s = delServidor.get(m.id)
    if (s) {
      if (s.version !== m.version) r.otraVersion.push({ ...m, versionServidor: s.version })
      else r.coinciden.push(m)
    } else if (m.entorno === 'client') {
      r.soloCliente.push(m)
    } else {
      r.faltanEnServidor.push(m)
    }
  }
  for (const s of servidor) if (!delCliente.has(s.id)) r.faltanEnModpack.push(s)
  return r
}

/* ---------- Análisis de archivos subidos ---------- */

function compararVersion (a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0)
  }
  return 0
}

/** ¿La versión `mc` cumple el requisito de fabric.mod.json (">=1.21", "~1.21.1", "1.21.x", "*"…)? */
export function cumpleRequisito (requisito, mc) {
  const opciones = [].concat(requisito)
  return opciones.some((op) => String(op).trim().split(/\s+/).every((parte) => {
    if (parte === '*' || parte === '') return true
    const m = /^(>=|<=|>|<|=|~|\^)?(.+)$/.exec(parte)
    const [, operador = '=', version] = m
    if (/[xX*]/.test(version)) {
      const base = version.replace(/\.[xX*].*$/, '')
      return mc === base || mc.startsWith(base + '.')
    }
    const c = compararVersion(mc, version)
    switch (operador) {
      case '>=': return c >= 0
      case '<=': return c <= 0
      case '>': return c > 0
      case '<': return c < 0
      case '~': return c >= 0 && mc.split('.').slice(0, 2).join('.') === version.split('.').slice(0, 2).join('.')
      case '^': return c >= 0 && mc.split('.')[0] === version.split('.')[0]
      default: return c === 0
    }
  }))
}

/**
 * Revisa un archivo antes de añadirlo. Devuelve { error } si no sirve,
 * o { nombre, version, aviso } (aviso = sirve pero conviene revisarlo).
 */
export async function analizarArchivo (JSZip, categoria, nombreArchivo, bytes, mc) {
  const c = CATEGORIAS[categoria]
  if (!nombreArchivo.toLowerCase().endsWith(c.extension)) return { error: `Un ${c.nombre} tiene que ser un archivo ${c.extension}.` }
  if (bytes.length > LIMITE_SUBIDA) return { error: 'GitHub no admite archivos de más de 95 MB. Para un pack tan grande, usa el pack de recursos del servidor.' }
  let zip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    return { error: 'El archivo está dañado o no es un .zip/.jar válido.' }
  }

  if (categoria === 'mods') {
    const fmj = zip.file('fabric.mod.json')
    if (!fmj) {
      if (zip.file('META-INF/neoforge.mods.toml')) return { error: 'Este mod es para NeoForge, no para Fabric. Descarga la versión para Fabric.' }
      if (zip.file('META-INF/mods.toml')) return { error: 'Este mod es para Forge, no para Fabric. Descarga la versión para Fabric.' }
      if (zip.file('quilt.mod.json')) return { error: 'Este mod es para Quilt. Descarga la versión para Fabric.' }
      return { error: 'Este archivo no es un mod de Fabric (le falta fabric.mod.json).' }
    }
    let info
    try {
      info = JSON.parse(await fmj.async('string'))
    } catch {
      return { nombre: nombreArchivo, aviso: 'No se pudo leer la información del mod; revisa que sea para Fabric ' + mc + '.' }
    }
    const requisito = info.depends?.minecraft
    const aviso = requisito && !cumpleRequisito(requisito, mc)
      ? `Este mod pide Minecraft ${[].concat(requisito).join(' o ')} y el modpack usa ${mc}. Puede que no funcione.`
      : null
    return { nombre: info.name || info.id || nombreArchivo, version: info.version, aviso }
  }

  if (categoria === 'texturas') {
    if (!zip.file('pack.mcmeta')) return { error: 'No es un pack de texturas: le falta pack.mcmeta.' }
    return { nombre: nombreArchivo.replace(/\.zip$/i, '') }
  }

  const tieneShaders = Object.keys(zip.files).some((r) => r.startsWith('shaders/'))
  return { nombre: nombreArchivo.replace(/\.zip$/i, ''), aviso: tieneShaders ? null : 'No parece un shader (no tiene carpeta shaders/).' }
}
