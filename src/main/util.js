const fsp = require('fs').promises
const path = require('path')

async function existe (ruta) {
  try {
    await fsp.access(ruta)
    return true
  } catch {
    return false
  }
}

async function leerJson (ruta, porDefecto) {
  try {
    return JSON.parse(await fsp.readFile(ruta, 'utf8'))
  } catch {
    return porDefecto
  }
}

async function escribirJson (ruta, datos) {
  await fsp.mkdir(path.dirname(ruta), { recursive: true })
  const temporal = ruta + '.tmp'
  await fsp.writeFile(temporal, JSON.stringify(datos, null, 2))
  await fsp.rename(temporal, ruta)
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/** Lo que pasó de verdad con la red (fetch solo dice "fetch failed"), en palabras para el jugador. */
const MOTIVOS_RED = [
  [/ENOTFOUND|EAI_AGAIN/, 'no se encuentra en internet (¿sin conexión o un problema de DNS?)'],
  [/ECONNREFUSED/, 'rechazó la conexión'],
  [/ECONNRESET|UND_ERR_SOCKET|EPIPE/, 'cortó la conexión a medias'],
  [/ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|TimeoutError|ABORT_ERR/, 'no respondió a tiempo'],
  [/CERT_HAS_EXPIRED|CERT_NOT_YET_VALID/, 'tiene un certificado que no cuadra con la fecha: revisa la fecha y la hora del PC'],
  [/CERT|SELF_SIGNED|UNABLE_TO_(GET|VERIFY)|ERR_TLS/, 'no tiene una conexión segura de confianza (suele ser un antivirus o un proxy que revisa las conexiones)'],
  [/ENETUNREACH|EHOSTUNREACH|ENETDOWN/, 'no se alcanza desde tu red']
]

function explicarErrorRed (error) {
  const partes = []
  for (let e = error; e && partes.length < 4; e = e.cause) partes.push(`${e.code || ''} ${e.name || ''} ${e.message || ''}`)
  const texto = partes.join(' ')
  for (const [patron, motivo] of MOTIVOS_RED) if (patron.test(texto)) return motivo
  return null
}

/** Error de una descarga con el archivo, el sitio y el motivo; el original queda en "cause". */
function errorDeRed (error, url, que) {
  if (/^El servidor respondió/.test(error?.message || '')) return error
  let sitio = url
  try { sitio = new URL(url).hostname } catch {}
  const motivo = explicarErrorRed(error) || `falló la conexión (${error?.cause?.code || error?.message || error})`
  return new Error(`No se pudo descargar ${que} de ${sitio}: ${motivo}.`, { cause: error })
}

async function pedirJson (url, intentos = 3) {
  let ultimo
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (!res.ok) throw new Error(`El servidor respondió ${res.status} al pedir ${url}`)
      return await res.json()
    } catch (e) {
      ultimo = e
      if (intento < intentos) await espera(2000 * intento)
    }
  }
  throw errorDeRed(ultimo, url, url.split('?')[0].split('/').pop() || 'datos del juego')
}

/** Compara versiones con puntos ("21.1.65" < "21.1.172"). */
function compararVersiones (a, b) {
  const pa = a.split(/[.-]/)
  const pb = b.split(/[.-]/)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = Number(pa[i] ?? 0)
    const nb = Number(pb[i] ?? 0)
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      const c = String(pa[i] ?? '').localeCompare(String(pb[i] ?? ''))
      if (c) return c
    } else if (na !== nb) {
      return na - nb
    }
  }
  return 0
}

module.exports = { existe, leerJson, escribirJson, pedirJson, compararVersiones, explicarErrorRed, errorDeRed }
