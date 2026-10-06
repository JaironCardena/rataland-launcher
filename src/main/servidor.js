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

async function consultarUnaVez (ip, puerto, espera) {
  const destino = await resolverDestino(ip, puerto)
  return new Promise((resolve) => {
    const inicio = Date.now()
    let datos = Buffer.alloc(0)
    let terminado = false
    const socket = net.createConnection({ host: destino.host, port: destino.puerto })
    const terminar = (r) => {
      if (terminado) return
      terminado = true
      socket.destroy()
      resolve(r)
    }
    socket.setTimeout(espera, () => terminar({ enLinea: false, motivo: 'sin respuesta' }))
    socket.on('error', (e) => terminar({ enLinea: false, motivo: e.code || e.message }))
    socket.on('close', () => terminar({ enLinea: false, motivo: 'conexión cerrada sin respuesta' }))
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
          // Nombres de algunos jugadores conectados (para mostrar sus cabezas)
          lista: (json.players?.sample || [])
            .filter((p) => /^[A-Za-z0-9_]{3,16}$/.test(p.name || ''))
            .map((p) => ({ nombre: p.name, id: p.id })),
          version: json.version?.name ?? '',
          latencia: Date.now() - inicio
        })
      } catch {
        terminar({ enLinea: false, motivo: 'respuesta no válida' })
      }
    })
  })
}

/**
 * Pregunta al servidor si está encendido. Un fallo suelto (la primera conexión tras abrir
 * el launcher, un momento de lentitud del host) no basta para darlo por apagado: se reintenta.
 */
async function consultarServidor (ip, puerto = 25565, { intentos = 3, espera = 6000 } = {}) {
  let r
  for (let i = 1; i <= intentos; i++) {
    r = await consultarUnaVez(ip, puerto, espera).catch((e) => ({ enLinea: false, motivo: e.code || e.message }))
    if (r.enLinea || r.apagado) return r
    if (i < intentos) await new Promise((res) => setTimeout(res, 1500))
  }
  // Hosts como Aternos cambian el puerto "dinámico" al reiniciar; la dirección sin puerto (SRV) es la fija.
  if (puerto !== 25565) {
    const fija = await consultarUnaVez(ip, 25565, espera).catch((e) => ({ enLinea: false, motivo: e.code || e.message }))
    if (fija.enLinea || fija.apagado) return { ...fija, puertoCorrecto: 25565 }
  }
  return r
}

module.exports = { consultarServidor }
