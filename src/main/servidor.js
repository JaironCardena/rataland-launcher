const net = require('net')
const dns = require('dns').promises

// Server List Ping de Minecraft: lo mismo que hace la lista de servidores del juego.

function varint (n) {
  const bytes = []
  n >>>= 0
  do {
    let b = n & 0x7f
    n >>>= 7
    if (n) b |= 0x80
    bytes.push(b)
  } while (n)
  return Buffer.from(bytes)
}

function leerVarint (buf, offset) {
  let valor = 0
  let i = 0
  let b
  do {
    if (offset >= buf.length) return null
    b = buf[offset++]
    valor |= (b & 0x7f) << (7 * i++)
    if (i > 5) throw new Error('varint demasiado largo')
  } while (b & 0x80)
  return [valor, offset]
}

const cadena = (s) => {
  const b = Buffer.from(s, 'utf8')
  return Buffer.concat([varint(b.length), b])
}

const paquete = (id, ...partes) => {
  const cuerpo = Buffer.concat([varint(id), ...partes])
  return Buffer.concat([varint(cuerpo.length), cuerpo])
}

async function resolverDestino (ip, puerto) {
  // Igual que el juego: el registro SRV solo se consulta si no se indicó puerto.
  if (net.isIP(ip) || puerto !== 25565) return { host: ip, puerto }
  try {
    const [srv] = await dns.resolveSrv(`_minecraft._tcp.${ip}`)
    if (srv) return { host: srv.name, puerto: srv.port }
  } catch { /* sin SRV */ }
  return { host: ip, puerto }
}

async function consultarServidor (ip, puerto = 25565, espera = 5000) {
  const destino = await resolverDestino(ip, puerto)
  return new Promise((resolve) => {
    const inicio = Date.now()
    let datos = Buffer.alloc(0)
    const socket = net.createConnection({ host: destino.host, port: destino.puerto })
    const terminar = (r) => {
      socket.destroy()
      resolve(r)
    }
    socket.setTimeout(espera, () => terminar({ enLinea: false }))
    socket.on('error', () => terminar({ enLinea: false }))
    socket.on('connect', () => {
      const p = Buffer.alloc(2)
      p.writeUInt16BE(destino.puerto)
      // Saludo y petición de estado en un solo envío: algunos proxies (Aternos) no contestan si llegan separados.
      socket.write(Buffer.concat([paquete(0x00, varint(-1), cadena(ip), p, varint(1)), paquete(0x00)]))
    })
    socket.on('data', (trozo) => {
      datos = Buffer.concat([datos, trozo])
      try {
        const cabecera = leerVarint(datos, 0)
        if (!cabecera) return
        const [largo, o1] = cabecera
        if (datos.length < o1 + largo) return
        const [, o2] = leerVarint(datos, o1)
        const [largoJson, o3] = leerVarint(datos, o2)
        const json = JSON.parse(datos.subarray(o3, o3 + largoJson).toString('utf8'))
        // Hosts como Aternos contestan aunque el servidor esté apagado, con protocolo -1 o "Offline".
        const apagado = json.version?.protocol < 0 || /offline|apagado/i.test(json.version?.name || '')
        if (apagado) return terminar({ enLinea: false, apagado: true })
        terminar({
          enLinea: true,
          jugadores: json.players?.online ?? 0,
          maximo: json.players?.max ?? 0,
          version: json.version?.name ?? '',
          latencia: Date.now() - inicio
        })
      } catch {
        terminar({ enLinea: false })
      }
    })
  })
}

module.exports = { consultarServidor }
