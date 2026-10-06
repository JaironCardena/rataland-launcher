const fsp = require('fs').promises
const path = require('path')
const { pathToFileURL } = require('url')
const { leerJson, escribirJson } = require('./util')

const SIN_CONFIGURAR = /TU_USUARIO|TU_REPO/
const RAIZ_PROYECTO = path.join(__dirname, '..', '..')

/**
 * Modo de pruebas: "manifiesto" es una carpeta del proyecto (p. ej. "modpack") en lugar de una URL.
 * Los archivos se copian desde esa carpeta, así se puede probar sin haber subido nada.
 */
async function manifiestoLocal (carpeta) {
  const dir = path.resolve(RAIZ_PROYECTO, carpeta)
  let manifiesto
  try {
    manifiesto = JSON.parse(await fsp.readFile(path.join(dir, 'manifest.json'), 'utf8'))
  } catch {
    throw new Error(`No se encontró ${carpeta}/manifest.json. Ejecuta "npm run publicar" primero.`)
  }
  validar(manifiesto)
  for (const a of manifiesto.archivos || []) {
    // Los de Modrinth no están en la carpeta: se siguen descargando de su URL.
    const local = path.join(dir, a.ruta)
    if (await fsp.access(local).then(() => true, () => false)) a.url = pathToFileURL(local).href
  }
  return { manifiesto, origen: 'local' }
}

function validar (m) {
  if (!m || typeof m !== 'object') throw new Error('manifest.json no tiene el formato esperado.')
  if (m.archivos !== undefined && !Array.isArray(m.archivos)) throw new Error('"archivos" debe ser una lista.')
  for (const a of m.archivos || []) {
    if (typeof a.ruta !== 'string' || typeof a.url !== 'string' || !/^[0-9a-f]{40}$/i.test(a.sha1 || '')) {
      throw new Error(`Entrada inválida en manifest.json: ${JSON.stringify(a)}`)
    }
  }
}

/**
 * raw.githubusercontent.com guarda "main" en caché unos minutos: justo después de publicar puede
 * servir el manifiesto viejo, que apunta a archivos que ya se borraron (error 404).
 * Si el manifiesto está en GitHub se pregunta cuál es el último commit y se lee todo de ese commit,
 * cuyo contenido no cambia nunca. Devuelve null si no se puede (otra web, límite de la API...).
 */
async function fijarCommit (direccion) {
  const m = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/.exec(direccion)
  if (!m) return null
  const [, dueno, repo, rama, ruta] = m
  if (/^[0-9a-f]{40}$/.test(rama)) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${dueno}/${repo}/commits/${encodeURIComponent(rama)}`, {
      headers: { accept: 'application/vnd.github.sha', 'user-agent': 'RataLand-Launcher' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return null
    const sha = (await res.text()).trim()
    if (!/^[0-9a-f]{40}$/.test(sha)) return null
    const raiz = `https://raw.githubusercontent.com/${dueno}/${repo}/`
    return { rama: `${raiz}${rama}/`, commit: `${raiz}${sha}/`, manifiesto: `${raiz}${sha}/${ruta}` }
  } catch {
    return null
  }
}

/**
 * Descarga el manifiesto remoto (lista de mods, versión del juego, noticias).
 * Si no hay internet usa la última copia guardada para que se pueda seguir jugando.
 *
 * `rapido`: sin preguntar el último commit a la API de GitHub (que limita a 60 consultas por hora);
 * sirve para mirar las novedades a menudo con el launcher abierto, aunque la caché de GitHub
 * puede tardar unos minutos en dar lo último.
 */
async function obtenerManifiesto (config, dirDatos, { rapido = false } = {}) {
  if (!config.manifiesto || SIN_CONFIGURAR.test(config.manifiesto)) {
    return { manifiesto: {}, origen: 'sin-configurar' }
  }
  if (!/^https?:\/\//i.test(config.manifiesto)) return manifiestoLocal(config.manifiesto)
  const copia = path.join(dirDatos, 'manifest.json')
  try {
    const fijo = rapido ? null : await fijarCommit(config.manifiesto)
    const url = new URL(fijo ? fijo.manifiesto : config.manifiesto)
    if (!fijo) url.searchParams.set('t', Date.now())
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`El servidor respondió ${res.status}`)
    const manifiesto = await res.json()
    validar(manifiesto)
    // Los archivos subidos al repositorio también se bajan de ese mismo commit
    if (fijo) {
      for (const a of manifiesto.archivos || []) {
        if (a.url.startsWith(fijo.rama)) a.url = fijo.commit + a.url.slice(fijo.rama.length)
      }
    }
    // La caché puede dar uno más antiguo que el que ya teníamos: ese no sustituye a la copia
    const anterior = await leerJson(copia, null)
    if (!anterior?.generado || !manifiesto.generado || manifiesto.generado >= anterior.generado) await escribirJson(copia, manifiesto)
    return { manifiesto, origen: 'red' }
  } catch (e) {
    const guardado = await leerJson(copia, null)
    if (guardado) return { manifiesto: guardado, origen: 'copia', error: e.message }
    throw new Error(`No se pudo descargar la lista de mods (${e.message}). Revisa tu conexión a internet.`)
  }
}

/** Mezcla la configuración del launcher con lo que diga el manifiesto remoto (el remoto manda). */
/** Saca el id del vídeo de un enlace de YouTube (watch, youtu.be, shorts o live). */
function idYoutube (url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    let id = null
    if (/(^|\.)youtu\.be$/.test(u.hostname)) id = u.pathname.slice(1).split('/')[0]
    else if (/(^|\.)youtube\.com$/.test(u.hostname)) id = u.searchParams.get('v') || u.pathname.match(/^\/(shorts|live|embed)\/([^/]+)/)?.[2]
    return /^[A-Za-z0-9_-]{6,20}$/.test(id || '') ? id : null
  } catch { return null }
}

function episodioValido (ep) {
  if (!ep || typeof ep.url !== 'string') return null
  const id = idYoutube(ep.url)
  if (!id) return null
  return { titulo: typeof ep.titulo === 'string' ? ep.titulo : '', url: ep.url, id }
}

function combinarPerfil (config, manifiesto) {
  return {
    minecraft: manifiesto.minecraft || config.minecraft,
    loader: { tipo: 'vanilla', ...(manifiesto.loader || config.loader) },
    servidor: { puerto: 25565, ...config.servidor, ...manifiesto.servidor },
    noticias: Array.isArray(manifiesto.noticias) ? manifiesto.noticias : [],
    // Un enlace vacío en el modpack no borra el de la configuración del launcher.
    enlaces: { ...config.enlaces, ...Object.fromEntries(Object.entries(manifiesto.enlaces || {}).filter(([, url]) => url)) },
    evento: manifiesto.evento?.fecha ? manifiesto.evento : null,
    // Ambientación de la temporada: fondo del launcher y del juego, nombre, episodio y frases del menú
    temporada: typeof manifiesto.temporada === 'string' ? manifiesto.temporada : '',
    escena: ['noche', 'cloacas', 'amanecer'].includes(manifiesto.escena) ? manifiesto.escena : 'noche',
    episodio: episodioValido(manifiesto.episodio),
    frases: Array.isArray(manifiesto.frases) ? manifiesto.frases.filter((f) => typeof f === 'string' && f.trim()) : []
  }
}

module.exports = { obtenerManifiesto, combinarPerfil, validar }
