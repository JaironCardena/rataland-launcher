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

// DNS públicos por HTTPS, para cuando el DNS del equipo o del router rechaza las consultas SRV.
const DNS_HTTPS = [
  (nombre) => `https://dns.google/resolve?name=${encodeURIComponent(nombre)}&type=SRV`,
  (nombre) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nombre)}&type=SRV`
]

const conLimite = (promesa, ms) => Promise.race([
  promesa,
  new Promise((_resolve, reject) => setTimeout(() => reject(Object.assign(new Error('tiempo agotado'), { code: 'ETIMEOUT' })), ms))
])

/**
 * Registro SRV de Minecraft (_minecraft._tcp.<host>): dice dónde está de verdad el servidor.
 * Aternos lo usa para su puerto "dinámico", que cambia al reiniciar. Hay routers que rechazan
 * estas consultas, así que si el DNS del equipo falla se pregunta a un DNS público por HTTPS.
 * Devuelve { host, puerto } o null si el servidor no tiene registro SRV.
 */
async function buscarSrv (host) {
  if (!host || net.isIP(host)) return null
  const nombre = `_minecraft._tcp.${host}`
  try {
    const [srv] = await conLimite(dns.resolveSrv(nombre), 3000)
    if (srv) return { host: srv.name.replace(/\.$/, '').toLowerCase(), puerto: srv.port }
  } catch { /* se prueba por HTTPS */ }
  for (const url of DNS_HTTPS) {
    try {
      const res = await fetch(url(nombre), { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(4000) })
      if (!res.ok) continue
      const json = await res.json()
      if (json.Status !== 0) return null
      const registro = (json.Answer || []).find((a) => a.type === 33)
      if (!registro) return null
      const [, , puerto, destino] = String(registro.data).trim().split(/\s+/)
      if (!Number(puerto) || !destino) return null
      return { host: destino.replace(/\.$/, '').toLowerCase(), puerto: Number(puerto) }
    } catch { /* siguiente */ }
  }
  return null
}

/** Dónde preguntar: primero donde diga el SRV (el puerto de ahora), luego la dirección configurada. */
async function destinosDe (ip, puerto) {
  const srv = await buscarSrv(ip)
  const lista = srv ? [srv] : []
  if (!srv || srv.puerto !== puerto) lista.push({ host: ip, puerto })
  return lista
}

/**
 * Dirección con la que debe conectarse el juego: la del SRV si lo hay (así el puerto de Aternos
 * siempre es el actual), o la configurada.
 */
async function direccionDeJuego (ip, puerto = 25565) {
  const srv = await buscarSrv(ip)
  if (srv) return { ip: srv.host, puerto: srv.puerto }
  return { ip, puerto }
}

// Se presenta como Minecraft 1.21.1: el aviso de Aternos no contesta a quien manda -1.
const PROTOCOLO = 767

/**
 * Mientras el servidor no está listo, Aternos contesta con un aviso en su lugar: "● Offline",
 * "◌ Starting...", "◌ Waiting in queue"... Devuelve 'apagado', 'encendiendo' o null si es el servidor.
 */
function avisoDelHost (nombre, protocolo) {
  const texto = String(nombre || '').replace(/§./g, '')
  if (protocolo < 0 || /offline|apagado|stopping|saving/i.test(texto)) return 'apagado'
  if (/[●◌]|starting|loading|preparing|queue|waiting|restarting/i.test(texto)) return 'encendiendo'
  return null
}

async function consultarUnaVez (ip, destino, espera) {
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
      socket.write(Buffer.concat([paquete(0x00, varint(PROTOCOLO), cadena(ip), p, varint(1)), paquete(0x00)]))
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
        const aviso = avisoDelHost(json.version?.name, json.version?.protocol)
        if (aviso) return terminar({ enLinea: false, apagado: aviso === 'apagado', encendiendo: aviso === 'encendiendo' })
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
    for (const destino of await destinosDe(ip, puerto)) {
      r = await consultarUnaVez(ip, destino, espera).catch((e) => ({ enLinea: false, motivo: e.code || e.message }))
      if (r.enLinea || r.apagado || r.encendiendo) return { ...r, puertoReal: destino.puerto }
    }
    if (i < intentos) await new Promise((res) => setTimeout(res, 1500))
  }
  return r
}

/**
 * Intenta entrar como lo hace el juego (saludo para entrar y "Login Start" con tu nombre) y corta en
 * cuanto el servidor contesta: no llega a meterte en el mundo. Devuelve qué contestó, para el registro.
 */
function intentarEntrar (ip, destino, { nombre, uuid }) {
  return new Promise((resolve) => {
    let datos = Buffer.alloc(0)
    let terminado = false
    const socket = net.createConnection({ host: destino.host, port: destino.puerto })
    const terminar = (r) => {
      if (terminado) return
      terminado = true
      socket.destroy()
      resolve(r)
    }
    socket.setTimeout(8000, () => terminar('sin respuesta'))
    socket.on('error', (e) => terminar(e.code || e.message))
    socket.on('close', () => terminar('conexión cerrada'))
    socket.on('connect', () => {
      const p = Buffer.alloc(2)
      p.writeUInt16BE(destino.puerto)
      const id = Buffer.from(String(uuid || '').replace(/-/g, '').padStart(32, '0').slice(0, 32), 'hex')
      socket.write(Buffer.concat([paquete(0x00, varint(PROTOCOLO), cadena(ip), p, varint(2)), paquete(0x00, cadena(nombre), id)]))
    })
    socket.on('data', (trozo) => {
      datos = Buffer.concat([datos, trozo])
      try {
        const cabecera = leerVarint(datos, 0)
        if (!cabecera) return
        const [largo, o1] = cabecera
        if (datos.length < o1 + largo) return
        const [idPaquete, o2] = leerVarint(datos, o1)
        // 0x00 al entrar: el host te echa con un mensaje (lo normal mientras arranca: "espera")
        if (idPaquete === 0x00) {
          const [largoTexto, o3] = leerVarint(datos, o2)
          return terminar(`contestó: ${datos.subarray(o3, o3 + largoTexto).toString('utf8').slice(0, 300)}`)
        }
        terminar(`el servidor ya estaba listo (paquete ${idPaquete})`)
      } catch {
        terminar('respuesta no válida')
      }
    })
  })
}

/**
 * Hosts con encendido automático: el servidor arranca cuando alguien intenta entrar. El launcher
 * hace ese intento al pulsar Jugar, así el servidor va arrancando mientras se actualiza y se abre
 * el juego. Si hay alguien jugando ya está encendido y no se toca. Devuelve qué pasó (o null).
 */
async function despertarServidor (ip, puerto = 25565, jugador = {}) {
  if (!ip || !jugador.nombre) return null
  const estado = await consultarServidor(ip, puerto, { intentos: 1, espera: 5000 })
  if (estado?.enLinea && estado.jugadores > 0) return null
  const [destino] = await destinosDe(ip, puerto)
  return intentarEntrar(ip, destino, jugador)
}

module.exports = { consultarServidor, direccionDeJuego, buscarSrv, despertarServidor }
