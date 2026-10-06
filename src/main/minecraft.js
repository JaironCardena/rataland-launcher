const fsp = require('fs').promises
const path = require('path')
const { Version } = require('@xmcl/core')
const {
  getVersionList,
  installTask,
  installDependenciesTask,
  installFabric,
  getLoaderArtifactListFor,
  installForgeTask,
  installNeoForgedTask,
  installJavaRuntimeTask
} = require('@xmcl/installer')
const { existe, leerJson, escribirJson, pedirJson, compararVersiones } = require('./util')

const NOMBRE_LOADER = { vanilla: 'Minecraft', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge' }

/**
 * Ejecuta una tarea de @xmcl/installer avisando del progreso cada ~120 ms.
 * `crear` devuelve una tarea nueva: si falla (cortes de red), se reintenta y solo baja lo que falte.
 */
async function correrTarea (crear, etapa, texto, reportar, intentos = 3) {
  for (let intento = 1; ; intento++) {
    const tarea = crear()
    let ultimo = 0
    try {
      return await tarea.startAndWait({
        onUpdate () {
          const ahora = Date.now()
          if (ahora - ultimo < 120) return
          ultimo = ahora
          reportar({ etapa, texto, actual: tarea.progress, total: tarea.total })
        }
      })
    } catch (e) {
      if (intento >= intentos) throw e
      reportar({ etapa, texto: `${texto} (reintentando)`, actual: 0, total: 0 })
      await new Promise((r) => setTimeout(r, 2000 * intento))
    }
  }
}

function rutaJava (destino, consola = false) {
  if (process.platform === 'win32') return path.join(destino, 'bin', consola ? 'java.exe' : 'javaw.exe')
  if (process.platform === 'darwin') return path.join(destino, 'jre.bundle', 'Contents', 'Home', 'bin', 'java')
  return path.join(destino, 'bin', 'java')
}

const INDICE_JAVA = 'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'

function plataformaJava () {
  const { platform, arch } = process
  if (platform === 'win32') return arch === 'arm64' ? 'windows-arm64' : arch === 'ia32' ? 'windows-x86' : 'windows-x64'
  if (platform === 'darwin') return arch === 'arm64' ? 'mac-os-arm64' : 'mac-os'
  return arch === 'ia32' ? 'linux-i386' : 'linux'
}

// Equivale a fetchJavaRuntimeManifest de @xmcl/installer, que falla con la versión actual de undici.
async function manifiestoJava (componente) {
  const indice = await pedirJson(INDICE_JAVA)
  const [objetivo] = indice[plataformaJava()]?.[componente] || []
  if (!objetivo) throw new Error(`Mojang no publica Java "${componente}" para este sistema (${plataformaJava()}).`)
  const { files } = await pedirJson(objetivo.manifest.url)
  return { files, target: componente, version: objetivo.version }
}

/** Descarga el Java oficial de Mojang que pide esta versión de Minecraft (no hace falta tener Java instalado). */
async function prepararJava (raiz, version, reportar, reparar) {
  const componente = version.javaVersion?.component || 'jre-legacy'
  const destino = path.join(raiz, 'runtime', componente)
  const marca = path.join(destino, '.instalado')
  const java = { exe: rutaJava(destino), consola: rutaJava(destino, true) }

  if (!reparar && await existe(marca) && await existe(java.exe)) return java

  const texto = `Descargando Java ${version.javaVersion?.majorVersion ?? ''}`.trim()
  reportar({ etapa: 'java', texto, actual: 0, total: 0 })
  const manifest = await manifiestoJava(componente)
  await correrTarea(() => installJavaRuntimeTask({ destination: destino, manifest }), 'java', texto, reportar)
  await fsp.writeFile(marca, componente)
  return java
}

/** "1.21.1" -> "21.1." ; "1.21" -> "21.0." ; "26.1" -> "26.1.0." */
function prefijoNeoForge (mc) {
  const p = mc.split('.')
  if (p[0] === '1') return `${p[1]}.${p[2] ?? 0}.`
  return `${p[0]}.${p[1] ?? 0}.${p[2] ?? 0}.`
}

async function resolverVersionLoader (loader, mc) {
  const pedida = loader.version
  if (pedida && pedida !== 'latest' && pedida !== 'recommended') return pedida

  if (loader.tipo === 'fabric') {
    const lista = await getLoaderArtifactListFor(mc)
    const elegida = lista.find((a) => a.loader.stable) || lista[0]
    if (!elegida) throw new Error(`Fabric todavía no tiene versión para Minecraft ${mc}.`)
    return elegida.loader.version
  }

  if (loader.tipo === 'forge') {
    const { promos } = await pedirJson('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json')
    const elegida = pedida === 'latest'
      ? promos[`${mc}-latest`] || promos[`${mc}-recommended`]
      : promos[`${mc}-recommended`] || promos[`${mc}-latest`]
    if (!elegida) throw new Error(`Forge no tiene versión para Minecraft ${mc}.`)
    return elegida
  }

  if (loader.tipo === 'neoforge') {
    const { versions } = await pedirJson('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge')
    const candidatas = versions.filter((v) => v.startsWith(prefijoNeoForge(mc))).sort(compararVersiones)
    const estables = candidatas.filter((v) => !/beta|alpha/i.test(v))
    const elegida = (estables.length ? estables : candidatas).at(-1)
    if (!elegida) throw new Error(`NeoForge no tiene versión para Minecraft ${mc}.`)
    return elegida
  }

  throw new Error(`Tipo de loader desconocido: "${loader.tipo}". Usa vanilla, fabric, forge o neoforge.`)
}

async function instalarLoader (perfil, raiz, java, reportar) {
  const mc = perfil.minecraft
  const tipo = perfil.loader.tipo
  if (tipo === 'vanilla') return { id: mc, version: null }

  const version = await resolverVersionLoader(perfil.loader, mc)
  const texto = `Instalando ${NOMBRE_LOADER[tipo]} ${version}`
  reportar({ etapa: 'loader', texto, actual: 0, total: 0 })

  // Forge y NeoForge ejecutan su instalador con Java; usamos java.exe (con consola) para eso.
  const javaInstalador = java.consola
  let id
  if (tipo === 'fabric') {
    id = await installFabric({ minecraftVersion: mc, version, minecraft: raiz })
  } else if (tipo === 'forge') {
    id = await correrTarea(() => installForgeTask({ mcversion: mc, version }, raiz, { java: javaInstalador }), 'loader', texto, reportar)
  } else {
    id = await correrTarea(() => installNeoForgedTask('neoforge', version, raiz, { java: javaInstalador }), 'loader', texto, reportar)
  }

  const resuelta = await Version.parse(raiz, id)
  await correrTarea(() => installDependenciesTask(resuelta), 'loader', texto, reportar)
  return { id, version }
}

/**
 * Deja instalado Minecraft + Java + loader. Si ya está todo y no se pide reparar, no descarga nada.
 * Devuelve { versionId, java, minecraft, loader, loaderVersion }.
 */
async function prepararJuego (perfil, raiz, { reportar = () => {}, reparar = false } = {}) {
  const rutaEstado = path.join(raiz, '.launcher', 'instalacion.json')
  const clave = `${perfil.minecraft}|${perfil.loader.tipo}|${perfil.loader.version || 'latest'}`
  const previo = await leerJson(rutaEstado, null)

  if (!reparar && previo?.clave === clave && await existe(previo.java)) {
    try {
      await Version.parse(raiz, previo.versionId)
      return previo
    } catch { /* falta algo: reinstalar */ }
  }

  const texto = `Descargando Minecraft ${perfil.minecraft}`
  reportar({ etapa: 'minecraft', texto, actual: 0, total: 0 })
  const { versions } = await getVersionList()
  const meta = versions.find((v) => v.id === perfil.minecraft)
  if (!meta) throw new Error(`No existe la versión ${perfil.minecraft} de Minecraft.`)

  const vanilla = await correrTarea(() => installTask(meta, raiz, {
    side: 'client',
    assetsDownloadConcurrency: 12,
    prevalidSizeOnly: !reparar
  }), 'minecraft', texto, reportar)

  const java = await prepararJava(raiz, vanilla, reportar, reparar)
  const { id, version } = await instalarLoader(perfil, raiz, java, reportar)

  const instalacion = {
    clave,
    versionId: id,
    java: java.exe,
    minecraft: perfil.minecraft,
    loader: perfil.loader.tipo,
    loaderVersion: version
  }
  await escribirJson(rutaEstado, instalacion)
  return instalacion
}

module.exports = { prepararJuego, resolverVersionLoader, NOMBRE_LOADER, prefijoNeoForge }
