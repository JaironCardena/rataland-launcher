const fsp = require('fs').promises
const path = require('path')
const { descargar, sha1Archivo, enParalelo } = require('./descargas')
const { leerJson, escribirJson } = require('./util')

const normalizar = (ruta) => {
  const r = ruta.replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '')
  return process.platform === 'win32' ? r.toLowerCase() : r
}

/** Evita que un manifiesto malicioso escriba fuera de la carpeta del juego. */
function rutaSegura (base, relativa) {
  const raiz = path.resolve(base)
  const destino = path.resolve(raiz, relativa)
  if (!destino.startsWith(raiz + path.sep)) throw new Error(`Ruta no permitida en el manifiesto: ${relativa}`)
  return destino
}

function limitador (fn, ms = 120) {
  let ultimo = 0
  return (forzar) => {
    const ahora = Date.now()
    if (forzar || ahora - ultimo >= ms) {
      ultimo = ahora
      fn()
    }
  }
}

/**
 * Deja la carpeta del juego igual que el manifiesto:
 *  - descarga los archivos que faltan o que el jugador modificó,
 *  - borra los que el launcher puso antes y ya no están en el manifiesto,
 *  - borra archivos ajenos en las carpetas sincronizadas (por defecto "mods").
 * Los archivos con "soloSiFalta" (p. ej. options.txt) se descargan una vez y luego se respetan.
 */
async function sincronizar (manifiesto, dirJuego, { reportar = () => {}, reparar = false } = {}) {
  const archivos = manifiesto.archivos || []
  const rutaEstado = path.join(dirJuego, '.launcher', 'archivos.json')
  const estado = await leerJson(rutaEstado, {})
  const nuevoEstado = {}
  const pendientes = []

  let revisados = 0
  const avisarRevision = limitador(() => reportar({
    etapa: 'verificar', texto: 'Comprobando mods', actual: revisados, total: archivos.length
  }))
  avisarRevision(true)

  await enParalelo(archivos, 8, async (a) => {
    const destino = rutaSegura(dirJuego, a.ruta)
    const clave = normalizar(a.ruta)
    const st = await fsp.stat(destino).catch(() => null)

    if (st && a.soloSiFalta) {
      nuevoEstado[clave] = { soloSiFalta: true }
    } else if (st) {
      const previo = estado[clave]
      const sinCambios = !reparar && previo && previo.sha1 === a.sha1 &&
        previo.tamano === st.size && previo.mtimeMs === st.mtimeMs
      const tamanoOk = a.tamano == null || st.size === a.tamano
      if (sinCambios || (tamanoOk && await sha1Archivo(destino) === a.sha1.toLowerCase())) {
        nuevoEstado[clave] = { sha1: a.sha1, tamano: st.size, mtimeMs: st.mtimeMs }
      } else {
        pendientes.push(a)
      }
    } else {
      pendientes.push(a)
    }
    revisados++
    avisarRevision()
  })

  if (pendientes.length) {
    const totalBytes = pendientes.reduce((s, a) => s + (a.tamano || 0), 0)
    let bytes = 0
    let hechos = 0
    const avisarDescarga = limitador(() => reportar({
      etapa: 'mods',
      texto: `Descargando mods (${hechos} de ${pendientes.length})`,
      actual: totalBytes ? bytes : hechos,
      total: totalBytes || pendientes.length
    }))
    avisarDescarga(true)

    await enParalelo(pendientes, 6, async (a) => {
      const destino = rutaSegura(dirJuego, a.ruta)
      await descargar(a.url, destino, {
        sha1: a.sha1,
        alProgreso: (n) => { bytes += n; avisarDescarga() }
      })
      const st = await fsp.stat(destino)
      nuevoEstado[normalizar(a.ruta)] = a.soloSiFalta
        ? { soloSiFalta: true }
        : { sha1: a.sha1, tamano: st.size, mtimeMs: st.mtimeMs }
      hechos++
      avisarDescarga(true)
    })
  }

  // Limpieza: lo que ya no está en el manifiesto se va.
  const enManifiesto = new Set(archivos.map((a) => normalizar(a.ruta)))
  let eliminados = 0

  for (const [clave, info] of Object.entries(estado)) {
    if (enManifiesto.has(clave) || info.soloSiFalta) continue
    await fsp.rm(rutaSegura(dirJuego, clave), { force: true })
    eliminados++
  }

  for (const carpeta of manifiesto.carpetasSincronizadas ?? ['mods']) {
    const dir = rutaSegura(dirJuego, carpeta)
    const entradas = await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entradas) {
      if (!e.isFile()) continue
      if (enManifiesto.has(normalizar(`${carpeta}/${e.name}`))) continue
      await fsp.rm(path.join(dir, e.name), { force: true })
      eliminados++
    }
  }

  await escribirJson(rutaEstado, nuevoEstado)
  return { descargados: pendientes.length, eliminados }
}

module.exports = { sincronizar }
