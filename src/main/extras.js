const fsp = require('fs').promises
const path = require('path')
const { existe } = require('./util')

// servers.dat es NBT sin comprimir. Solo necesitamos escribir una lista con un servidor.
function nbtCadena (s) {
  const b = Buffer.from(s, 'utf8')
  const largo = Buffer.alloc(2)
  largo.writeUInt16BE(b.length)
  return Buffer.concat([largo, b])
}

const etiqueta = (tipo, nombre, carga) => Buffer.concat([Buffer.from([tipo]), nbtCadena(nombre), carga])

function serversDat (nombre, direccion) {
  const servidor = Buffer.concat([
    etiqueta(0x08, 'name', nbtCadena(nombre)),
    etiqueta(0x08, 'ip', nbtCadena(direccion)),
    etiqueta(0x01, 'acceptTextures', Buffer.from([1])), // acepta el paquete de recursos del servidor
    Buffer.from([0x00])
  ])
  const cabeceraLista = Buffer.alloc(5)
  cabeceraLista.writeUInt8(0x0a, 0) // elementos: compound
  cabeceraLista.writeInt32BE(1, 1)
  return Buffer.concat([
    etiqueta(0x0a, '', Buffer.concat([
      etiqueta(0x09, 'servers', Buffer.concat([cabeceraLista, servidor])),
      Buffer.from([0x00])
    ]))
  ])
}

/**
 * Primer arranque: deja el servidor en la lista de Multijugador, el juego en español
 * y sin la pantalla de accesibilidad inicial (que taparía la entrada directa al servidor).
 * Si el jugador ya tiene estos archivos, no se tocan.
 */
async function prepararPrimerArranque (dirJuego, { nombre, ip, puerto }) {
  await fsp.mkdir(dirJuego, { recursive: true })

  const servers = path.join(dirJuego, 'servers.dat')
  if (ip && !await existe(servers)) {
    const direccion = puerto && Number(puerto) !== 25565 ? `${ip}:${puerto}` : ip
    await fsp.writeFile(servers, serversDat(nombre, direccion))
  }

  const opciones = path.join(dirJuego, 'options.txt')
  if (!await existe(opciones)) {
    await fsp.writeFile(opciones, ['lang:es_es', 'onboardAccessibility:false', 'skipMultiplayerWarning:true', ''].join('\n'))
  }
}

const ESCENAS = ['noche', 'cloacas', 'amanecer', 'pesca']

/** Servidor, Discord, fondo, temporada y frases para los menús del mod de la serie (config/rataland.json). */
async function escribirConfigMenu (dirJuego, { nombre, ip, puerto, destino, discord, escena, temporada, frases, evento, skinModelo }) {
  const ruta = path.join(dirJuego, 'config', 'rataland.json')
  await fsp.mkdir(path.dirname(ruta), { recursive: true })
  const enlaceDiscord = /^https?:\/\//.test(discord || '') ? discord : ''
  const config = {
    nombre,
    ip,
    puerto: Number(puerto) || 25565,
    // Dirección real al abrir el juego (host:puerto del registro SRV); el mod la vuelve a buscar al pulsar Jugar
    destino: typeof destino === 'string' ? destino : '',
    discord: enlaceDiscord,
    escena: ESCENAS.includes(escena) ? escena : 'noche',
    temporada: typeof temporada === 'string' ? temporada.trim() : ''
  }
  config.skinModelo = skinModelo === 'slim' ? 'slim' : 'classic'
  // Cuenta atrás del próximo episodio: el mod solo compara con la hora actual
  const inicio = evento?.fecha ? Date.parse(evento.fecha) : NaN
  if (!Number.isNaN(inicio)) {
    config.evento = {
      titulo: typeof evento.titulo === 'string' ? evento.titulo : '',
      inicio,
      fin: inicio + (Number(evento.duracionHoras) || 3) * 3600 * 1000
    }
  }
  // Sin frases propias, el mod usa las suyas
  const lista = (Array.isArray(frases) ? frases : []).filter((f) => typeof f === 'string' && f.trim()).map((f) => f.trim())
  if (lista.length) config.frases = lista
  await fsp.writeFile(ruta, JSON.stringify(config, null, 2))
}

/**
 * Activa en options.txt los packs de texturas marcados como "Activado para todos" en el panel.
 * Se añaden al final (encima de los demás) y no se quitan los que el jugador ya tenga activos.
 */
async function activarPacks (dirJuego, rutas = []) {
  const packs = rutas
    .filter((r) => r.startsWith('resourcepacks/'))
    .map((r) => `file/${r.slice('resourcepacks/'.length)}`)
  if (!packs.length) return

  const archivo = path.join(dirJuego, 'options.txt')
  const lineas = (await fsp.readFile(archivo, 'utf8').catch(() => '')).split(/\r?\n/)
  const i = lineas.findIndex((l) => l.startsWith('resourcePacks:'))
  let activos = ['vanilla', 'fabric']
  if (i >= 0) {
    try { activos = JSON.parse(lineas[i].slice('resourcePacks:'.length)) } catch { /* línea rota: se rehace */ }
  }
  const faltan = packs.filter((p) => !activos.includes(p))
  if (!faltan.length) return

  const linea = `resourcePacks:${JSON.stringify([...activos, ...faltan])}`
  if (i >= 0) lineas[i] = linea
  else lineas.splice(lineas.at(-1) === '' ? lineas.length - 1 : lineas.length, 0, linea)
  await fsp.writeFile(archivo, lineas.join('\n'))
}

module.exports = { prepararPrimerArranque, escribirConfigMenu, activarPacks, serversDat }
