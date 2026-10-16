#!/usr/bin/env node
// Empaqueta la traducción propia. Opcional: pasa el JAR de Undead Nights para comprobar sus claves.
const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')

const raiz = path.resolve(__dirname, '..')
const fuente = path.join(raiz, 'resourcepacks', 'undeadnights-es')
const rutaIdioma = 'assets/undeadnights/lang/es_es.json'
const idiomas = ['es_es', 'es_ec', 'es_mx', 'es_ar', 'es_cl', 'es_uy', 'es_ve']
const destino = path.join(raiz, 'modpack', 'resourcepacks', 'UndeadNights-Espanol-RataLand.zip')
// Opciones que sí están en la configuración del mod pero sin texto en su en_us.json
const extras = new Set([
  'ignoreDoMobSpawningGamerule', 'hordeWavesCanSpawnInCaves',
  'caveSpawnDistance', 'enableAutomaticDifficultyProgression'
].flatMap(campo => [
  `text.autoconfig.undeadnights.option.${campo}`,
  `text.autoconfig.undeadnights.option.${campo}.@Tooltip`
]))

function parametros (texto) {
  return texto.match(/%%|%(?:\d+\$)?[A-Za-z]|%/g) || []
}

function crear () {
  const texto = fs.readFileSync(path.join(fuente, rutaIdioma), 'utf8')
  const traduccion = JSON.parse(texto)
  const claves = Object.keys(traduccion)
  if (claves.length !== 130 || claves.some(clave => typeof traduccion[clave] !== 'string' || !traduccion[clave].trim())) {
    throw new Error('La traducción de Undead Nights 2.2.6 debe contener 130 textos no vacíos.')
  }
  const metadatos = fs.readFileSync(path.join(fuente, 'pack.mcmeta'), 'utf8')
  const pack = JSON.parse(metadatos).pack
  if (pack.min_format !== 97 || pack.max_format !== 97) {
    throw new Error('Minecraft 26.3 necesita el formato de recursos 97 (min_format y max_format).')
  }

  if (process.argv[2]) {
    const jar = new AdmZip(path.resolve(process.argv[2]))
    const mod = JSON.parse(jar.readAsText('fabric.mod.json'))
    if (mod.id !== 'undeadnights' || mod.version !== '2.2.6-Fabric-mc26.3') {
      throw new Error('La comprobación corresponde a Undead Nights 2.2.6 para Fabric y Minecraft 26.3.')
    }
    const original = JSON.parse(jar.readAsText('assets/undeadnights/lang/en_us.json'))
    for (const [clave, ingles] of Object.entries(original)) {
      if (!Object.hasOwn(traduccion, clave)) throw new Error(`Falta la traducción: ${clave}`)
      if (JSON.stringify(parametros(ingles)) !== JSON.stringify(parametros(traduccion[clave]))) {
        throw new Error(`Los parámetros no coinciden: ${clave}`)
      }
    }
    for (const clave of claves) {
      if (!Object.hasOwn(original, clave) && !extras.has(clave)) throw new Error(`Clave desconocida: ${clave}`)
    }
    console.log(`${Object.keys(original).length} claves del mod comprobadas; parámetros conservados.`)
  }

  const zip = new AdmZip()
  zip.addFile('pack.mcmeta', Buffer.from(metadatos, 'utf8'))
  // Una traducción común para todas las variantes de español disponibles en Minecraft 26.3.
  for (const idioma of idiomas) zip.addFile(`assets/undeadnights/lang/${idioma}.json`, Buffer.from(texto, 'utf8'))
  zip.addLocalFile(path.join(raiz, 'mod', 'common', 'src', 'main', 'resources', 'assets', 'rataland', 'icons', 'icono_128.png'), '', 'pack.png')
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  zip.writeZip(destino)
  console.log(`Pack listo: ${destino} (${claves.length} textos, ${idiomas.length} variantes de español).`)
}

try { crear() } catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
