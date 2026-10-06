#!/usr/bin/env node
// Genera manifest.json a partir de la carpeta del modpack.
// Uso: npm run publicar            (usa la carpeta ./modpack)
//      node tools/publicar.js otra/carpeta
const fs = require('fs')
const path = require('path')
const { sha1Archivo } = require('../src/main/descargas')

const IGNORADOS = new Set(['modpack.json', 'manifest.json', 'readme.md', 'license', 'license.md'])

function listar (dir, base = dir) {
  const salida = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const ruta = path.join(dir, e.name)
    if (e.isDirectory()) salida.push(...listar(ruta, base))
    else if (e.isFile() && !(dir === base && IGNORADOS.has(e.name.toLowerCase()))) salida.push(ruta)
  }
  return salida
}

async function main () {
  const carpeta = path.resolve(process.argv[2] || 'modpack')
  const ajustes = JSON.parse(fs.readFileSync(path.join(carpeta, 'modpack.json'), 'utf8'))

  if (!/^https?:\/\/.+\/$/.test(ajustes.urlBase || '')) {
    throw new Error('En modpack.json, "urlBase" tiene que ser una URL que termine en "/".')
  }

  let loader = ajustes.loader || { tipo: 'vanilla' }
  if (loader.tipo !== 'vanilla' && (!loader.version || loader.version === 'latest' || loader.version === 'recommended')) {
    // Fijamos la versión exacta para que todos los jugadores usen la misma.
    const { resolverVersionLoader } = require('../src/main/minecraft')
    loader = { ...loader, version: await resolverVersionLoader(loader, ajustes.minecraft) }
    console.log(`Loader: ${loader.tipo} ${loader.version}`)
  }

  const soloSiFalta = new Set((ajustes.soloSiFalta || []).map((r) => r.replace(/\\/g, '/')))
  const archivos = []
  for (const ruta of listar(carpeta).sort()) {
    const relativa = path.relative(carpeta, ruta).split(path.sep).join('/')
    archivos.push({
      ruta: relativa,
      url: ajustes.urlBase + relativa.split('/').map(encodeURIComponent).join('/'),
      sha1: await sha1Archivo(ruta),
      tamano: fs.statSync(ruta).size,
      ...(soloSiFalta.has(relativa) ? { soloSiFalta: true } : {})
    })
  }

  const evento = ajustes.evento?.fecha ? ajustes.evento : null
  if (evento) {
    const fecha = new Date(evento.fecha)
    if (Number.isNaN(fecha.getTime())) throw new Error(`La fecha del evento no es válida: "${evento.fecha}". Usa el formato 2026-10-10T20:00:00-05:00`)
    if (!/[zZ]|[+-]\d\d:\d\d$/.test(evento.fecha)) console.warn('Aviso: la fecha del evento no lleva zona horaria; cada jugador la verá en su hora local.')
    console.log(`Evento: ${evento.titulo || 'sin título'} el ${fecha.toLocaleString('es')}`)
  }

  const manifiesto = {
    generado: new Date().toISOString(),
    minecraft: ajustes.minecraft,
    loader,
    servidor: ajustes.servidor,
    carpetasSincronizadas: ajustes.carpetasSincronizadas || ['mods'],
    noticias: ajustes.noticias || [],
    enlaces: ajustes.enlaces || {},
    evento,
    archivos
  }
  fs.writeFileSync(path.join(carpeta, 'manifest.json'), JSON.stringify(manifiesto, null, 2) + '\n')

  const mods = archivos.filter((a) => a.ruta.startsWith('mods/')).length
  const mb = (archivos.reduce((s, a) => s + a.tamano, 0) / 1048576).toFixed(1)
  console.log(`manifest.json listo: ${archivos.length} archivos (${mods} mods, ${mb} MB).`)
  console.log(`Sube el contenido de "${path.basename(carpeta)}" a ${ajustes.urlBase}`)
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
