#!/usr/bin/env node
// Pone el mod de RataLand recién compilado donde lo usan los demás:
//   - mod/builds/: un jar por cargador (Fabric y NeoForge) y versiones.json. El panel los usa al
//     cambiar de cargador o de versión de Minecraft para cambiar el mod en vez de quitarlo.
//   - modpack/mods/: el jar del cargador y la versión que usa ahora el modpack.
// Uso (después de "gradlew build" en mod/):  node tools/publicar-mod.js   y luego  npm run publicar
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const RAIZ = path.join(__dirname, '..')
const MOD = path.join(RAIZ, 'mod')
const BUILDS = path.join(MOD, 'builds')
const INDICE = path.join(BUILDS, 'versiones.json')
const MODPACK = path.join(RAIZ, 'modpack')

const propiedades = Object.fromEntries(fs.readFileSync(path.join(MOD, 'gradle.properties'), 'utf8')
  .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.split('=').map((x) => x.trim())))
const version = propiedades.mod_version
const minecraft = propiedades.minecraft_version
const cargadores = propiedades.enabled_platforms.split(',')

fs.mkdirSync(BUILDS, { recursive: true })
let indice = fs.existsSync(INDICE) ? JSON.parse(fs.readFileSync(INDICE, 'utf8')) : []

for (const cargador of cargadores) {
  const origen = path.join(MOD, cargador, 'build', 'libs', `rataland-menu-${cargador}-${version}.jar`)
  if (!fs.existsSync(origen)) throw new Error(`No está ${path.relative(RAIZ, origen)}: compila antes el mod (gradlew build en mod/).`)
  const archivo = `rataland-menu-${cargador}-${minecraft}-${version}.jar`
  const bytes = fs.readFileSync(origen)
  // Solo se guarda la última de cada cargador y versión de Minecraft (las viejas siguen en el historial de git)
  for (const viejo of indice.filter((b) => b.cargador === cargador && b.minecraft === minecraft && b.archivo !== archivo)) {
    fs.rmSync(path.join(BUILDS, viejo.archivo), { force: true })
  }
  indice = indice.filter((b) => !(b.cargador === cargador && b.minecraft === minecraft))
  fs.writeFileSync(path.join(BUILDS, archivo), bytes)
  indice.push({ cargador, minecraft, version, archivo, sha1: crypto.createHash('sha1').update(bytes).digest('hex'), tamano: bytes.length })
  console.log(`mod/builds/${archivo}`)
}
indice.sort((a, b) => (a.minecraft + a.cargador).localeCompare(b.minecraft + b.cargador))
fs.writeFileSync(INDICE, JSON.stringify(indice, null, 2) + '\n')

// El modpack se queda con el de su cargador y su versión de Minecraft
const ajustes = JSON.parse(fs.readFileSync(path.join(MODPACK, 'modpack.json'), 'utf8'))
const tipo = ajustes.loader?.tipo || 'fabric'
const propio = indice.find((b) => b.cargador === tipo && b.minecraft === ajustes.minecraft)
const carpetaMods = path.join(MODPACK, 'mods')
const actuales = fs.readdirSync(carpetaMods).filter((f) => /^rataland-menu.*\.jar$/i.test(f))
if (!propio) {
  console.log(`El modpack usa Minecraft ${ajustes.minecraft} con ${tipo} y no hay mod de RataLand para eso: no se toca modpack/mods.`)
} else if (actuales.length === 1 && actuales[0] === propio.archivo) {
  console.log(`modpack/mods ya tiene ${propio.archivo}.`)
} else {
  for (const f of actuales) fs.rmSync(path.join(carpetaMods, f))
  fs.copyFileSync(path.join(BUILDS, propio.archivo), path.join(carpetaMods, propio.archivo))
  console.log(`modpack/mods: ${actuales.join(', ') || '(nada)'} -> ${propio.archivo}. Ahora: npm run publicar`)
}
