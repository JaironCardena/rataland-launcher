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

/** Nombre e IP del servidor para el botón Jugar del menú del mod de la serie (config/rataland.json). */
async function escribirConfigMenu (dirJuego, { nombre, ip, puerto }) {
  const ruta = path.join(dirJuego, 'config', 'rataland.json')
  await fsp.mkdir(path.dirname(ruta), { recursive: true })
  await fsp.writeFile(ruta, JSON.stringify({ nombre, ip, puerto: Number(puerto) || 25565 }, null, 2))
}

module.exports = { prepararPrimerArranque, escribirConfigMenu, serversDat }
