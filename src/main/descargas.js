const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const crypto = require('crypto')
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const { fileURLToPath } = require('url')

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

function sha1Archivo (ruta) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1')
    fs.createReadStream(ruta)
      .on('error', reject)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * Descarga `url` en `destino` verificando el sha1 (si se da).
 * Escribe primero en un .part y lo renombra al terminar, así nunca queda un archivo a medias.
 * `alProgreso(bytes)` recibe los bytes nuevos (negativos si un intento falla y se descuenta).
 */
async function descargar (url, destino, { sha1, alProgreso, intentos = 3 } = {}) {
  await fsp.mkdir(path.dirname(destino), { recursive: true })
  const temporal = destino + '.part'
  let ultimoError

  for (let intento = 1; intento <= intentos; intento++) {
    let recibidos = 0
    try {
      let cuerpo
      if (url.startsWith('file:')) {
        cuerpo = fs.createReadStream(fileURLToPath(url))
      } else {
        const res = await fetch(url, { signal: AbortSignal.timeout(5 * 60 * 1000) })
        if (!res.ok) throw new Error(`El servidor respondió ${res.status} al descargar ${url}`)
        cuerpo = Readable.fromWeb(res.body)
      }

      const hash = crypto.createHash('sha1')
      cuerpo.on('data', (d) => {
        hash.update(d)
        recibidos += d.length
        alProgreso?.(d.length)
      })
      await pipeline(cuerpo, fs.createWriteStream(temporal))

      const obtenido = hash.digest('hex')
      if (sha1 && obtenido !== sha1.toLowerCase()) {
        throw new Error(`El archivo descargado está dañado (sha1 distinto): ${url}`)
      }
      await fsp.rename(temporal, destino)
      return
    } catch (e) {
      ultimoError = e
      alProgreso?.(-recibidos)
      await fsp.rm(temporal, { force: true })
      if (intento < intentos) await espera(1000 * intento)
    }
  }
  throw ultimoError
}

/** Ejecuta `fn` sobre cada elemento con como mucho `limite` a la vez. */
async function enParalelo (elementos, limite, fn) {
  let siguiente = 0
  const trabajadores = Array.from({ length: Math.min(limite, elementos.length) }, async () => {
    while (siguiente < elementos.length) {
      const elemento = elementos[siguiente++]
      await fn(elemento)
    }
  })
  await Promise.all(trabajadores)
}

module.exports = { descargar, sha1Archivo, enParalelo }
