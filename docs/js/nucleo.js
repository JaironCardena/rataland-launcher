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

/** Cargadores de mods que el panel sabe manejar (el launcher también sabe instalarlos). */
export const LOADERS = { fabric: 'Fabric', neoforge: 'NeoForge' }
export const nombreLoader = (tipo) => LOADERS[tipo] || tipo || 'Fabric'

/** Con qué "loader" de Modrinth se buscan las versiones: los mods, el del modpack; packs y shaders, los suyos. */
const loadersDe = (categoria, loader) => categoria === 'mods' ? [loader || 'fabric'] : CATEGORIAS[categoria].loaders

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
export const ESCENAS = {
  noche: 'Noche de queso',
  cloacas: 'Las Cloacas',
  amanecer: 'Amanecer de queso'
}

/** Id del vídeo de un enlace de YouTube (watch, youtu.be, shorts o live), o null si no lo es. */
export function idYoutube (url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    let id = null
    if (/(^|\.)youtu\.be$/.test(u.hostname)) id = u.pathname.slice(1).split('/')[0]
    else if (/(^|\.)youtube\.com$/.test(u.hostname)) id = u.searchParams.get('v') || u.pathname.match(/^\/(shorts|live|embed)\/([^/]+)/)?.[2]
    return /^[A-Za-z0-9_-]{6,20}$/.test(id || '') ? id : null
  } catch { return null }
}

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
  const episodio = ajustes.episodio?.url ? ajustes.episodio : null
  if (episodio && !idYoutube(episodio.url)) throw new Error('El enlace del episodio no es de un vídeo de YouTube.')

  return {
    generado: new Date().toISOString(),
    minecraft: ajustes.minecraft,
    loader: ajustes.loader,
    servidor: ajustes.servidor,
    carpetasSincronizadas: ajustes.carpetasSincronizadas || ['mods'],
    noticias: ajustes.noticias || [],
    enlaces: ajustes.enlaces || {},
    evento,
    temporada: ajustes.temporada || '',
    escena: ESCENAS[ajustes.escena] ? ajustes.escena : 'noche',
    episodio,
    frases: (ajustes.frases || []).filter((t) => t.trim()),
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

export async function buscarEnModrinth (categoria, texto, mc, loader = 'fabric') {
  const c = CATEGORIAS[categoria]
  const facetas = [[`project_type:${c.tipoModrinth}`], [`versions:${mc}`]]
  if (categoria === 'mods') facetas.push([`categories:${loader}`])
  if (categoria === 'shaders') facetas.push(['categories:iris'])
  const q = new URLSearchParams({ query: texto, facets: JSON.stringify(facetas), limit: '20', index: texto ? 'relevance' : 'downloads' })
  return (await modrinth(`/search?${q}`)).hits
}

export const proyectoModrinth = (id) => modrinth(`/project/${encodeURIComponent(id)}`)
export const versionModrinth = (id) => modrinth(`/version/${encodeURIComponent(id)}`)

export async function proyectosModrinth (ids) {
  if (!ids.length) return []
  return modrinth(`/projects?ids=${encodeURIComponent(JSON.stringify(ids))}`)
}

/** Última versión del proyecto que funciona con esta versión de Minecraft (y el cargador del modpack, o Iris). */
export async function versionCompatible (proyecto, categoria, mc, loader = 'fabric') {
  const q = new URLSearchParams({ game_versions: JSON.stringify([mc]), loaders: JSON.stringify(loadersDe(categoria, loader)) })
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
export async function dependenciasDe (version, mc, yaPresentes = new Set(), loader = 'fabric') {
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
      const versionDep = d.version_id ? await modrinth(`/version/${d.version_id}`) : await versionCompatible(d.project_id, 'mods', mc, loader)
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

/**
 * Versiones de NeoForge para esta versión de Minecraft, de la más nueva a la más vieja.
 * NeoForge numera según Minecraft: 1.21.1 → 21.1.x; 26.1 → 26.1.0.x.
 */
export async function versionesNeoForge (mc) {
  const res = await fetch('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge')
  if (!res.ok) throw new Error('No se pudo consultar NeoForge.')
  const { versions } = await res.json()
  const p = mc.split('.')
  const prefijo = p[0] === '1' ? `${p[1]}.${p[2] ?? 0}.` : `${p[0]}.${p[1] ?? 0}.${p[2] ?? 0}.`
  return versions.filter((v) => v.startsWith(prefijo))
    .sort((a, b) => compararVersion(b.replace(/-.*$/, ''), a.replace(/-.*$/, '')))
    .slice(0, 25)
    .map((v) => ({ version: v, estable: !/beta|alpha/i.test(v) }))
}

/** Versiones del cargador elegido para esa versión de Minecraft. */
export const versionesLoader = (tipo, mc) => tipo === 'neoforge' ? versionesNeoForge(mc) : versionesFabric()

/* ---------- Estado del servidor y del repositorio ---------- */

/**
 * Estado del servidor de Minecraft usando mcstatus.io (el navegador no puede hablar con el servidor directamente).
 * Aternos contesta aunque esté apagado, con la versión "● Offline": eso cuenta como apagado.
 */
const sinColores = (texto) => String(texto || '').replace(/§./g, '').trim()

/**
 * Mientras el servidor no está listo, Aternos contesta con un aviso en su lugar: "● Offline",
 * "◌ Starting...", "◌ Waiting in queue"... Devuelve 'apagado', 'encendiendo' o null si es el servidor.
 */
function avisoDelHost (nombre, protocolo) {
  const texto = String(nombre || '').replace(/§./g, '')
  if (protocolo < 0 || /offline|apagado|stopping|saving/i.test(texto)) return 'apagado'
  if (/[●◌]|starting|loading|preparing|queue|waiting|restarting/i.test(texto)) return 'encendiendo'
  return null
}

/**
 * Pregunta a mcapi.us, que sí llega a los servidores de Aternos (mcstatus.io los da siempre por apagados).
 * Sin puerto, mcapi.us usa el registro SRV: en Aternos es el puerto de ahora aunque haya cambiado.
 */
async function estadoMcapi (ip, puerto) {
  const url = new URL('https://mcapi.us/server/status')
  url.searchParams.set('ip', ip)
  if (puerto && puerto !== 25565) url.searchParams.set('port', puerto)
  // Sin esto la caché de su web devuelve el mismo resultado durante 5 minutos
  url.searchParams.set('_', Math.floor(Date.now() / 20000))
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('No se pudo consultar el estado del servidor.')
  const j = await res.json()
  if (j.status !== 'success') throw new Error(j.error || 'No se pudo consultar el estado del servidor.')
  const version = sinColores(j.server?.name)
  const motd = typeof j.motd_json === 'string' ? j.motd_json : j.motd
  const aviso = j.online ? avisoDelHost(j.server?.name, j.server?.protocol) : 'apagado'
  return {
    encendido: !aviso,
    encendiendo: aviso === 'encendiendo',
    // mcapi.us guarda cada consulta unos minutos: se muestra de cuándo es el dato
    comprobado: Number(j.last_updated) * 1000 || null,
    version,
    versionMinecraft: (/\d+\.\d+(?:\.\d+)?/.exec(version) || [])[0] || null,
    jugadores: j.players?.now ?? 0,
    maximo: j.players?.max ?? 0,
    lista: (j.players?.sample || []).filter((p) => /^[A-Za-z0-9_]{3,16}$/.test(p.name || '')).map((p) => ({ nombre: p.name, uuid: p.id })),
    motd: sinColores(motd)
  }
}

/** Puerto del registro SRV de Minecraft, preguntado al DNS de Google (responde al momento y admite CORS). */
async function puertoSrv (ip) {
  const res = await fetch(`https://dns.google/resolve?name=_minecraft._tcp.${encodeURIComponent(ip)}&type=SRV`, { cache: 'no-store' })
  if (!res.ok) return null
  const j = await res.json()
  const registro = (j.Answer || []).find((a) => a.type === 33)
  return registro ? Number(String(registro.data).trim().split(/\s+/)[2]) || null : null
}

async function estadoSinAternos (ip, puerto) {
  try {
    const r = await estadoMcapi(ip, puerto)
    // Con un puerto fijo que ya no vale, se prueba la dirección sin puerto.
    if (r.encendido || puerto === 25565) return r
    const sinPuerto = await estadoMcapi(ip, 25565).catch(() => null)
    return sinPuerto?.encendido ? sinPuerto : r
  } catch {
    return estadoMcstatus(ip, puerto)
  }
}

/**
 * Estado del servidor. En Aternos manda el registro SRV, que cambia al momento: apunta al puerto
 * del servidor solo mientras está encendido, y al 25565 (su aviso de "apagado") cuando no.
 * Los jugadores salen de mcapi.us, que puede tener unos minutos de retraso.
 */
export async function estadoServidor (ip, puerto) {
  puerto = Number(puerto) || 25565
  if (!/\.aternos\.me$/i.test(ip)) return estadoSinAternos(ip, puerto)
  const srv = await puertoSrv(ip).catch(() => null)
  if (!srv) return estadoSinAternos(ip, puerto)
  const r = await estadoMcapi(ip, srv).catch(() => null)
  if (srv !== 25565) {
    // Encendido. Si mcapi.us aún tiene guardado el "apagado" de antes, no hay número de jugadores.
    return r?.encendido ? r : { encendido: true, encendiendo: false, sinDatos: true, comprobado: Date.now(), version: '', versionMinecraft: null, jugadores: 0, maximo: 0, lista: [], motd: '' }
  }
  // Apagado o arrancando: lo que diga el aviso de Aternos, sin fiarse de un "encendido" guardado.
  return r && !r.encendido ? r : { encendido: false, encendiendo: false, comprobado: Date.now(), version: '', versionMinecraft: null, jugadores: 0, maximo: 0, lista: [], motd: '' }
}

async function estadoMcstatus (ip, puerto) {
  const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(ip)}:${Number(puerto) || 25565}`)
  if (!res.ok) throw new Error('No se pudo consultar el estado del servidor.')
  const j = await res.json()
  const version = j.version?.name_clean || ''
  const aviso = j.online ? avisoDelHost(j.version?.name, j.version?.protocol) : 'apagado'
  return {
    encendido: !aviso,
    encendiendo: aviso === 'encendiendo',
    comprobado: j.retrieved_at || null,
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

async function leerFabricModJson (zip) {
  const archivo = zip.file('fabric.mod.json')
  if (!archivo) return null
  try { return JSON.parse(await archivo.async('string')) } catch { return null }
}

/**
 * Lee lo justo de un archivo TOML (neoforge.mods.toml): las tablas ([x] y [[x]]) con sus claves de
 * texto, número o sí/no. Las cadenas de varias líneas (descripciones) se saltan.
 */
function leerToml (texto) {
  const tablas = [{ nombre: '', datos: {} }]
  const lineas = texto.split(/\r?\n/)
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim()
    if (!linea || linea.startsWith('#')) continue
    const tabla = /^\[\[\s*([^\]]+?)\s*\]\]/.exec(linea) || /^\[\s*([^\]]+?)\s*\]/.exec(linea)
    if (tabla) { tablas.push({ nombre: tabla[1], datos: {} }); continue }
    const par = /^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(linea)
    if (!par) continue
    const datos = tablas.at(-1).datos
    const valor = par[2]
    const triple = /^('''|""")/.exec(valor)
    if (triple) {
      if (!valor.slice(3).includes(triple[1])) while (++i < lineas.length && !lineas[i].includes(triple[1]));
      continue
    }
    const cadena = /^"((?:[^"\\]|\\.)*)"/.exec(valor) || /^'([^']*)'/.exec(valor)
    if (cadena) datos[par[1]] = cadena[1]
    else if (/^(true|false)\b/.test(valor)) datos[par[1]] = valor.startsWith('true')
    else datos[par[1]] = valor.replace(/\s+#.*$/, '').trim()
  }
  return tablas
}

/** Datos de un mod de NeoForge (META-INF/neoforge.mods.toml), con la misma forma que los de Fabric. */
async function leerNeoForge (zip) {
  const archivo = zip.file('META-INF/neoforge.mods.toml')
  if (!archivo) return null
  const tablas = leerToml(await archivo.async('string'))
  const mods = tablas.filter((t) => t.nombre === 'mods').map((t) => t.datos).filter((m) => m.modId)
  if (!mods.length) return null
  // "${file.jarVersion}": la versión está en el MANIFEST.MF
  let versionJar = null
  const manifiesto = zip.file('META-INF/MANIFEST.MF')
  if (manifiesto) versionJar = /Implementation-Version:\s*(\S+)/.exec(await manifiesto.async('string'))?.[1] || null
  const version = (m) => /\$\{/.test(m.version || '') ? versionJar : m.version
  const principal = mods[0]
  const depende = {}
  const rompe = {}
  for (const t of tablas) {
    const d = /^dependencies\.(.+)$/.exec(t.nombre)
    if (!d || !mods.some((m) => m.modId === d[1]) || !t.datos.modId) continue
    const tipo = String(t.datos.type || (t.datos.mandatory === false ? 'optional' : 'required')).toLowerCase()
    const rango = t.datos.versionRange || '*'
    if (tipo === 'required') depende[t.datos.modId] = rango
    else if (tipo === 'incompatible') rompe[t.datos.modId] = rango
  }
  return {
    id: principal.modId,
    nombre: principal.displayName || principal.modId,
    version: version(principal),
    depende,
    rompe,
    ofrece: mods.map((m) => ({ id: m.modId, version: version(m) }))
  }
}

/** Mod de NeoForge contando los que lleva dentro (en META-INF/jarjar o META-INF/jars). */
async function infoNeoForge (JSZip, zip) {
  const neo = await leerNeoForge(zip)
  if (!neo) return null
  for (const ruta of Object.keys(zip.files).filter((r) => /^META-INF\/(jarjar|jars)\/.+\.jar$/i.test(r))) {
    try {
      const sub = await leerNeoForge(await JSZip.loadAsync(await zip.file(ruta).async('uint8array')))
      if (sub) neo.ofrece.push(...sub.ofrece)
    } catch { /* un jar interno raro no impide lo demás */ }
  }
  return { ...neo, entorno: '*' }
}

/**
 * Datos de fabric.mod.json: id, nombre, versión, si es solo para el cliente, qué necesita
 * ("depends"), con qué no funciona ("breaks") y qué ids ofrece, contando los mods que lleva
 * dentro (Fabric API, por ejemplo, son unos 40 módulos que otros mods piden por su nombre).
 */
export async function infoDeMod (JSZip, bytes, loader = 'fabric') {
  const zip = await JSZip.loadAsync(bytes)
  // Hay jars para varios cargadores (o con un fabric.mod.json de aviso, como JourneyMap para
  // NeoForge): se leen primero los datos del cargador del modpack.
  if (loader === 'neoforge' || !zip.file('fabric.mod.json')) {
    const neo = await infoNeoForge(JSZip, zip)
    if (neo) return neo
  }
  const info = await leerFabricModJson(zip)
  if (!info) return null
  const ofrece = [{ id: info.id, version: info.version }, ...[].concat(info.provides || []).map((id) => ({ id, version: info.version }))]
  for (const j of info.jars || []) {
    const interno = zip.file(j.file)
    if (!interno) continue
    try {
      const sub = await leerFabricModJson(await JSZip.loadAsync(await interno.async('uint8array')))
      if (sub?.id) ofrece.push({ id: sub.id, version: sub.version }, ...[].concat(sub.provides || []).map((id) => ({ id, version: sub.version })))
    } catch { /* un jar interno raro no impide lo demás */ }
  }
  return {
    id: info.id,
    nombre: info.name || info.id,
    version: info.version,
    entorno: info.environment || '*',
    depende: info.depends || {},
    rompe: info.breaks || {},
    ofrece
  }
}

// Lo que pone el propio juego: no son mods del modpack
const INTEGRADOS = new Set(['java', 'fabricloader', 'fabric-loader', 'neoforge', 'forge', 'javafml'])

/** ¿La versión `tiene` cumple el requisito? Ante algo que no se entiende, se da por bueno (mejor no avisar en falso). */
function satisface (requisito, tiene) {
  if (!tiene) return true
  try {
    return cumpleRequisito(requisito, String(tiene).split('+')[0].split('-')[0])
  } catch {
    return true
  }
}

/**
 * Revisa los mods entre sí. Recibe [{ nombre, info }] (info de infoDeMod) y devuelve:
 * faltan (un mod pide otro que no está), version (está pero en otra versión o pide otro Minecraft)
 * e incompatibles (un mod dice que no funciona junto a otro que sí está).
 */
export function revisarDependencias (mods, mc) {
  const disponibles = new Map()
  const nombres = new Map()
  for (const m of mods) {
    if (m.info?.id) nombres.set(m.info.id, m.nombre)
    for (const o of m.info?.ofrece || []) if (!disponibles.has(o.id)) disponibles.set(o.id, o.version)
  }
  // "fabric" es el nombre antiguo de Fabric API
  if (disponibles.has('fabric-api') && !disponibles.has('fabric')) disponibles.set('fabric', disponibles.get('fabric-api'))
  const nombreDe = (id) => nombres.get(id) || id

  const faltan = []
  const version = []
  const incompatibles = []
  for (const m of mods) {
    if (!m.info) continue
    const pide = []
    for (const [id, requisito] of Object.entries(m.info.depende)) {
      if (INTEGRADOS.has(id)) continue
      if (id === 'minecraft') {
        if (!satisface(requisito, mc)) version.push({ mod: m, texto: `pide Minecraft ${[].concat(requisito).join(' o ')} y el modpack usa ${mc}` })
        continue
      }
      if (!disponibles.has(id)) pide.push(id)
      else if (!satisface(requisito, disponibles.get(id))) {
        version.push({ mod: m, texto: `pide ${nombreDe(id)} ${[].concat(requisito).join(' o ')} y hay la ${disponibles.get(id)}` })
      }
    }
    if (pide.length) faltan.push({ mod: m, ids: pide })
    for (const [id, requisito] of Object.entries(m.info.rompe)) {
      if (disponibles.has(id) && id !== m.info.id && satisface(requisito, disponibles.get(id))) incompatibles.push({ mod: m, con: nombreDe(id) })
    }
  }
  return { faltan, version, incompatibles }
}

/** ¿Hace falta este mod en el servidor? Lo dice su fabric.mod.json ("environment") y, si no, Modrinth. */
export function ladoServidor (info, proyecto) {
  if (info?.entorno === 'client') return { va: false, motivo: 'Solo funciona en el juego de cada jugador.' }
  if (proyecto?.server_side === 'unsupported') return { va: false, motivo: 'Según Modrinth, solo es para los jugadores.' }
  if (proyecto?.server_side === 'optional') return { va: true, motivo: 'Opcional en el servidor: si también lo tiene, añade funciones.' }
  if (!info && !proyecto) return { va: true, motivo: 'No se pudo saber; se incluye por si acaso.' }
  return { va: true, motivo: '' }
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

/** Rango de versiones al estilo de Maven (el de NeoForge): "[1.21.1,1.22)", "[21.1,)", "[1.0]"; varios separados por comas. */
function cumpleRangoMaven (rango, v) {
  const partes = String(rango).match(/[[(][^\])]*[\])]/g)
  if (!partes) return true
  const limpia = (x) => x.trim().replace(/\+.*$/, '').replace(/-.*$/, '')
  return partes.some((p) => {
    const dentro = p.slice(1, -1)
    if (!dentro.includes(',')) return compararVersion(v, limpia(dentro)) === 0
    const [min, max] = dentro.split(',')
    if (limpia(min)) {
      const c = compararVersion(v, limpia(min))
      if (c < 0 || (c === 0 && p[0] === '(')) return false
    }
    if (limpia(max)) {
      const c = compararVersion(v, limpia(max))
      if (c > 0 || (c === 0 && p.at(-1) === ')')) return false
    }
    return true
  })
}

/** ¿La versión `mc` cumple el requisito de fabric.mod.json (">=1.21", "~1.21.1", "1.21.x", "*"…) o de NeoForge ("[1.21.1,1.22)")? */
export function cumpleRequisito (requisito, mc) {
  if (typeof requisito === 'string' && /^\s*[[(]/.test(requisito)) return cumpleRangoMaven(requisito, mc)
  const opciones = [].concat(requisito)
  return opciones.some((op) => String(op).trim().split(/\s+/).every((parte) => {
    if (parte === '*' || parte === '') return true
    const m = /^(>=|<=|>|<|=|~|\^)?(.+)$/.exec(parte)
    // "~1.21-" o "1.21.1-rc.1": lo de detrás del guion es una versión de prueba, y "+1.21.1" solo dice
    // para qué se compiló; para comparar cuenta lo de delante
    const [, operador = '=', bruta] = m
    const version = bruta.replace(/\+.*$/, '').replace(/-.*$/, '')
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
export async function analizarArchivo (JSZip, categoria, nombreArchivo, bytes, mc, loader = 'fabric') {
  const c = CATEGORIAS[categoria]
  if (!nombreArchivo.toLowerCase().endsWith(c.extension)) return { error: `Un ${c.nombre} tiene que ser un archivo ${c.extension}.` }
  if (bytes.length > LIMITE_SUBIDA) return { error: 'GitHub no admite archivos de más de 95 MB. Para un pack tan grande, usa el pack de recursos del servidor.' }
  let zip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    return { error: 'El archivo está dañado o no es un .zip/.jar válido.' }
  }

  if (categoria === 'mods' && loader === 'neoforge') {
    if (!zip.file('META-INF/neoforge.mods.toml')) {
      if (zip.file('fabric.mod.json')) return { error: 'Este mod es para Fabric y el modpack usa NeoForge. Descarga la versión para NeoForge.' }
      if (zip.file('META-INF/mods.toml')) return { error: 'Este mod es para Forge, no para NeoForge. Descarga la versión para NeoForge.' }
      return { error: 'Este archivo no es un mod de NeoForge (le falta META-INF/neoforge.mods.toml).' }
    }
    const info = await leerNeoForge(zip).catch(() => null)
    if (!info) return { nombre: nombreArchivo, aviso: `No se pudo leer la información del mod; revisa que sea para NeoForge ${mc}.` }
    const requisito = info.depende.minecraft
    const aviso = requisito && !cumpleRequisito(requisito, mc)
      ? `Este mod pide Minecraft ${requisito} y el modpack usa ${mc}. Puede que no funcione.`
      : null
    return { nombre: info.nombre || nombreArchivo, version: info.version, aviso }
  }

  if (categoria === 'mods') {
    const fmj = zip.file('fabric.mod.json')
    if (!fmj) {
      if (zip.file('META-INF/neoforge.mods.toml')) return { error: 'Este mod es para NeoForge y el modpack usa Fabric. Descarga la versión para Fabric.' }
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
