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

async function pedirJson (url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`El servidor respondió ${res.status} al pedir ${url}`)
  return res.json()
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

module.exports = { existe, leerJson, escribirJson, pedirJson, compararVersiones }
