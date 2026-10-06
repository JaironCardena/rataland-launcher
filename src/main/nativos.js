const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const AdmZip = require('adm-zip')
const { getPlatform } = require('@xmcl/core')
const { leerJson, escribirJson } = require('./util')

/**
 * Extrae las librerías nativas (DLL de LWJGL, etc.) a la carpeta de nativos de la versión.
 * Sustituye a LaunchPrecheck.checkNatives de @xmcl/core, que se queda colgado con @xmcl/unzip.
 * Mismas reglas que el original: sin META-INF, sin .sha1/.git, respetando extractExclude
 * y, si la ruta empieza por "sistema/arquitectura/", solo la de este equipo.
 */
async function extraerNativos (carpeta, version, opciones) {
  const destino = opciones.nativeRoot || carpeta.getNativesRoot(version.id)
  const nativos = version.libraries.filter((l) => l.isNative || (l.classifier || '').startsWith('natives'))
  const marca = path.join(destino, '.extraidos.json')
  const nombres = nativos.map((n) => n.name).sort()

  const previo = await leerJson(marca, null)
  if (Array.isArray(previo) && previo.join('|') === nombres.join('|')) return

  await fsp.mkdir(destino, { recursive: true })
  const plataforma = opciones.platform || getPlatform()
  const deEstaPlataforma = (ruta) => {
    if (!ruta.includes('/')) return true
    const [sistema, arquitectura] = ruta.split('/')
    return sistema === plataforma.name && (arquitectura === 'ia32' ? 'x86' : arquitectura) === plataforma.arch
  }

  for (const n of nativos) {
    const excluidos = n.extractExclude || []
    const zip = new AdmZip(carpeta.getLibraryByPath(n.download.path))
    for (const entrada of zip.getEntries()) {
      const nombre = entrada.entryName
      if (entrada.isDirectory || nombre.includes('META-INF/')) continue
      if (nombre.endsWith('.sha1') || nombre.endsWith('.git')) continue
      if (excluidos.some((x) => nombre.startsWith(x)) || !deEstaPlataforma(nombre)) continue
      await fsp.writeFile(path.join(destino, path.basename(nombre)), entrada.getData())
    }
  }
  await escribirJson(marca, nombres)
}

module.exports = { extraerNativos }
