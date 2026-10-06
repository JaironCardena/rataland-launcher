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

/** "sodium-fabric-0.8.13+mc1.21.1.jar" → "sodium-fabric": la parte del nombre que no cambia entre versiones. */
function baseDe (archivo) {
  return archivo.replace(/\.(jar|zip)$/i, '').split(/[-_ ](?=v?\d)/)[0].toLowerCase()
}

/** Nombre para mostrar: el de Modrinth, o el del archivo sin la versión. */
function nombreDe (a) {
  if (a.modrinth?.nombre) return a.modrinth.nombre
  const archivo = a.ruta.split('/').pop()
  if (/^rataland-menu/i.test(archivo)) return 'RataLand'
  const base = archivo.replace(/\.(jar|zip)$/i, '').split(/[-_ ](?=v?\d)/)[0].replace(/[-_]+/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/**
 * Deja la carpeta del juego igual que el manifiesto:
 *  - descarga los archivos que faltan o que el jugador modificó,
 *  - borra los que el launcher puso antes y ya no están en el manifiesto,
 *  - borra archivos ajenos en las carpetas sincronizadas (por defecto "mods").
 * Los archivos con "soloSiFalta" (p. ej. options.txt) se descargan una vez y luego se respetan.
 *
 * Va contando lo que hace ("Añadiendo Sodium", "Actualizando RataLand", "Quitando JourneyMap")
 * y devuelve un resumen con los nombres de lo añadido, actualizado, reparado y quitado.
 */
async function sincronizar (manifiesto, dirJuego, { reportar = () => {}, reparar = false } = {}) {
  const archivos = manifiesto.archivos || []
  const rutaEstado = path.join(dirJuego, '.launcher', 'archivos.json')
  const estado = await leerJson(rutaEstado, {})
  const nuevoEstado = {}
  const pendientes = []
  const resumen = { anadidos: [], actualizados: [], reparados: [], quitados: [] }

  let revisados = 0
  const avisarRevision = limitador(() => reportar({
    etapa: 'verificar', texto: `Comprobando mods (${revisados} de ${archivos.length})`, actual: revisados, total: archivos.length
  }))
  avisarRevision(true)

  await enParalelo(archivos, 8, async (a) => {
    const destino = rutaSegura(dirJuego, a.ruta)
    const clave = normalizar(a.ruta)
    const st = await fsp.stat(destino).catch(() => null)
    const datos = { nombre: nombreDe(a), proyecto: a.modrinth?.proyecto }

    if (st && a.soloSiFalta) {
      nuevoEstado[clave] = { soloSiFalta: true }
    } else if (st) {
      const previo = estado[clave]
      const sinCambios = !reparar && previo && previo.sha1 === a.sha1 &&
        previo.tamano === st.size && previo.mtimeMs === st.mtimeMs
      const tamanoOk = a.tamano == null || st.size === a.tamano
      if (sinCambios || (tamanoOk && await sha1Archivo(destino) === a.sha1.toLowerCase())) {
        nuevoEstado[clave] = { sha1: a.sha1, tamano: st.size, mtimeMs: st.mtimeMs, ...datos }
      } else {
        // Si el manifiesto trae otra versión del mismo archivo es una actualización; si no, el archivo se dañó.
        pendientes.push({ a, tipo: previo?.sha1 && previo.sha1 !== a.sha1 ? 'actualizar' : 'reparar' })
      }
    } else {
      pendientes.push({ a, tipo: 'anadir' })
    }
    revisados++
    avisarRevision()
  })

  // Lo que el launcher instaló antes y ya no está: si hay uno nuevo "igual" (mismo proyecto o
  // mismo nombre sin versión, en la misma carpeta), es una actualización y no un mod quitado.
  const enManifiesto = new Set(archivos.map((a) => normalizar(a.ruta)))
  const viejos = Object.entries(estado).filter(([clave, info]) => !enManifiesto.has(clave) && !info.soloSiFalta)
  const reemplazados = new Set()
  for (const p of pendientes) {
    if (p.tipo !== 'anadir') continue
    const carpeta = normalizar(p.a.ruta).split('/')[0]
    const base = baseDe(p.a.ruta.split('/').pop())
    const viejo = viejos.find(([clave, info]) => !reemplazados.has(clave) && clave.split('/')[0] === carpeta &&
      ((p.a.modrinth?.proyecto && info.proyecto === p.a.modrinth.proyecto) || baseDe(clave.split('/').pop()) === base))
    if (viejo) {
      p.tipo = 'actualizar'
      reemplazados.add(viejo[0])
    }
  }

  if (pendientes.length) {
    const totalBytes = pendientes.reduce((s, p) => s + (p.a.tamano || 0), 0)
    const verbo = { anadir: 'Añadiendo', actualizar: 'Actualizando', reparar: 'Reparando' }
    let bytes = 0
    let empezados = 0
    let texto = ''
    const avisarDescarga = limitador(() => reportar({
      etapa: 'mods', texto, actual: totalBytes ? bytes : empezados, total: totalBytes || pendientes.length
    }))

    await enParalelo(pendientes, 6, async ({ a, tipo }) => {
      empezados++
      texto = `${verbo[tipo]} ${nombreDe(a)}${pendientes.length > 1 ? ` (${empezados} de ${pendientes.length})` : ''}`
      avisarDescarga(true)
      const destino = rutaSegura(dirJuego, a.ruta)
      await descargar(a.url, destino, {
        sha1: a.sha1,
        alProgreso: (n) => { bytes += n; avisarDescarga() }
      })
      const st = await fsp.stat(destino)
      nuevoEstado[normalizar(a.ruta)] = a.soloSiFalta
        ? { soloSiFalta: true }
        : { sha1: a.sha1, tamano: st.size, mtimeMs: st.mtimeMs, nombre: nombreDe(a), proyecto: a.modrinth?.proyecto }
      const lista = { anadir: resumen.anadidos, actualizar: resumen.actualizados, reparar: resumen.reparados }[tipo]
      if (!a.soloSiFalta) lista.push(nombreDe(a))
    })
  }

  // Limpieza: lo que ya no está en el manifiesto se va.
  for (const [clave, info] of viejos) {
    if (!reemplazados.has(clave)) {
      const nombre = info.nombre || nombreDe({ ruta: clave })
      reportar({ etapa: 'limpiar', texto: `Quitando ${nombre}`, actual: 0, total: 0 })
      resumen.quitados.push(nombre)
    }
    await fsp.rm(rutaSegura(dirJuego, clave), { force: true })
  }

  for (const carpeta of manifiesto.carpetasSincronizadas ?? ['mods']) {
    const dir = rutaSegura(dirJuego, carpeta)
    const entradas = await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entradas) {
      if (!e.isFile()) continue
      if (enManifiesto.has(normalizar(`${carpeta}/${e.name}`))) continue
      const nombre = nombreDe({ ruta: `${carpeta}/${e.name}` })
      reportar({ etapa: 'limpiar', texto: `Quitando ${nombre}`, actual: 0, total: 0 })
      await fsp.rm(path.join(dir, e.name), { force: true })
      resumen.quitados.push(nombre)
    }
  }

  await escribirJson(rutaEstado, nuevoEstado)
  return { ...resumen, total: archivos.filter((a) => !a.soloSiFalta).length, descargados: pendientes.length, eliminados: resumen.quitados.length }
}

module.exports = { sincronizar }
