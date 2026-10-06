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
  for (const a of manifiesto.archivos || []) a.url = pathToFileURL(path.join(dir, a.ruta)).href
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
 * Descarga el manifiesto remoto (lista de mods, versión del juego, noticias).
 * Si no hay internet usa la última copia guardada para que se pueda seguir jugando.
 */
async function obtenerManifiesto (config, dirDatos) {
  if (!config.manifiesto || SIN_CONFIGURAR.test(config.manifiesto)) {
    return { manifiesto: {}, origen: 'sin-configurar' }
  }
  if (!/^https?:\/\//i.test(config.manifiesto)) return manifiestoLocal(config.manifiesto)
  const copia = path.join(dirDatos, 'manifest.json')
  try {
    const url = new URL(config.manifiesto)
    url.searchParams.set('t', Date.now())
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`El servidor respondió ${res.status}`)
    const manifiesto = await res.json()
    validar(manifiesto)
    await escribirJson(copia, manifiesto)
    return { manifiesto, origen: 'red' }
  } catch (e) {
    const guardado = await leerJson(copia, null)
    if (guardado) return { manifiesto: guardado, origen: 'copia', error: e.message }
    throw new Error(`No se pudo descargar la lista de mods (${e.message}). Revisa tu conexión a internet.`)
  }
}

/** Mezcla la configuración del launcher con lo que diga el manifiesto remoto (el remoto manda). */
function combinarPerfil (config, manifiesto) {
  return {
    minecraft: manifiesto.minecraft || config.minecraft,
    loader: { tipo: 'vanilla', ...(manifiesto.loader || config.loader) },
    servidor: { puerto: 25565, ...config.servidor, ...manifiesto.servidor },
    noticias: Array.isArray(manifiesto.noticias) ? manifiesto.noticias : []
  }
}

module.exports = { obtenerManifiesto, combinarPerfil, validar }
