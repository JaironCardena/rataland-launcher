const path = require('path')
const crypto = require('crypto')
const { safeStorage } = require('electron')
const { Auth } = require('msmc')
const { leerJson, escribirJson } = require('./util')
const fsp = require('fs').promises

// Mismo identificador y permisos que usa msmc (el del launcher oficial), así la sesión se renueva igual.
const CLIENTE_MICROSOFT = '00000000402b5328'
const PERMISOS_MICROSOFT = 'XboxLive.signin offline_access'

const ERRORES_MSMC = {
  'error.gui.closed': null, // el jugador cerró la ventana: no es un error
  'error.auth.xsts.userNotFound': 'Esa cuenta de Microsoft no tiene perfil de Xbox. Entra una vez en xbox.com y vuelve a intentarlo.',
  'error.auth.xsts.child': 'Es una cuenta infantil: un adulto tiene que añadirla a una familia de Microsoft.',
  'error.auth.xsts.child.SK': 'Es una cuenta infantil: un adulto tiene que añadirla a una familia de Microsoft.',
  'error.auth.xsts.bannedCountry': 'Xbox Live no está disponible en tu país.',
  'error.auth.minecraft.profile': 'Esa cuenta no tiene Minecraft: Java Edition.',
  'error.auth.minecraft.entitlements': 'Esa cuenta no tiene Minecraft: Java Edition.'
}

function traducirError (e) {
  const codigo = typeof e === 'string' ? e : e?.message || e?.ts || String(e)
  if (codigo in ERRORES_MSMC) return ERRORES_MSMC[codigo]
  if (/network|fetch|ENOTFOUND|ECONN/i.test(codigo)) return 'No hay conexión con Microsoft. Revisa tu internet.'
  return `No se pudo iniciar sesión (${codigo}).`
}

/** UUID que Minecraft da a los jugadores sin cuenta premium (igual que el servidor en offline-mode). */
function uuidSinPremium (nombre) {
  const h = crypto.createHash('md5').update(`OfflinePlayer:${nombre}`).digest()
  h[6] = (h[6] & 0x0f) | 0x30
  h[8] = (h[8] & 0x3f) | 0x80
  return h.toString('hex')
}

async function pedirMicrosoft (url, campos) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos),
    signal: AbortSignal.timeout(20000)
  })
  return { ok: res.ok, json: await res.json().catch(() => ({})) }
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function crearCuentas (dirDatos) {
  const archivo = path.join(dirDatos, 'cuenta.json')
  const registro = path.join(dirDatos, 'cuenta.log')
  // Solo códigos de error, nunca tokens: para saber por qué falló un inicio de sesión
  const anotar = (texto) => fsp.appendFile(registro, `${new Date().toISOString()} ${texto}\n`).catch(() => {})
  let sesion = null // { tipo, nombre, uuid, token, xuid, caduca }
  let loginEnCurso = null // { cancelado }

  /** De la cuenta de Microsoft a Minecraft (Xbox Live, XSTS y perfil), y se guarda. */
  async function terminarLogin (xbox) {
    const mc = await xbox.getMinecraft()
    if (!mc.profile || mc.isDemo()) throw new Error('error.auth.minecraft.profile')
    await guardarMicrosoft(xbox, mc)
    return { ok: true, cuenta: { tipo: 'microsoft', nombre: sesion.nombre, uuid: sesion.uuid } }
  }

  const cifrar = (texto) => safeStorage.isEncryptionAvailable()
    ? { cifrado: true, valor: safeStorage.encryptString(texto).toString('base64') }
    : { cifrado: false, valor: texto }
  const descifrar = ({ cifrado, valor }) => cifrado
    ? safeStorage.decryptString(Buffer.from(valor, 'base64'))
    : valor

  async function guardarMicrosoft (xbox, mc) {
    sesion = {
      tipo: 'microsoft',
      nombre: mc.profile.name,
      uuid: mc.profile.id,
      token: mc.mcToken,
      xuid: mc.xuid,
      caduca: mc.exp
    }
    await escribirJson(archivo, {
      tipo: 'microsoft',
      nombre: sesion.nombre,
      uuid: sesion.uuid,
      refresco: cifrar(xbox.save())
    })
  }

  return {
    /** Cuenta guardada (sin tokens), para mostrarla en la interfaz. */
    async actual () {
      const c = await leerJson(archivo, null)
      return c ? { tipo: c.tipo, nombre: c.nombre, uuid: c.uuid } : null
    },

    async loginMicrosoft (ventanaPadre) {
      try {
        const auth = new Auth('select_account')
        const xbox = await auth.launch('electron', {
          width: 520,
          height: 680,
          parent: ventanaPadre,
          modal: true,
          autoHideMenuBar: true,
          title: 'Iniciar sesión con Microsoft',
          backgroundColor: '#ffffff'
        })
        return await terminarLogin(xbox)
      } catch (e) {
        anotar(`ventana: ${e?.message || e?.ts || e}`)
        const mensaje = traducirError(e)
        return mensaje ? { ok: false, error: mensaje } : { ok: false, cancelado: true }
      }
    },

    /**
     * Inicio de sesión en el navegador del jugador (ahí sí funcionan las llaves de acceso, Windows
     * Hello y las sesiones ya abiertas). Microsoft da un código; el jugador lo confirma en
     * microsoft.com/link y aquí se espera hasta que lo haga.
     */
    async loginNavegador (alCodigo) {
      if (loginEnCurso) loginEnCurso.cancelado = true
      const intento = { cancelado: false }
      loginEnCurso = intento
      try {
        const pedido = await pedirMicrosoft('https://login.live.com/oauth20_connect.srf', {
          client_id: CLIENTE_MICROSOFT, scope: PERMISOS_MICROSOFT, response_type: 'device_code'
        })
        if (!pedido.ok || !pedido.json.device_code) throw new Error(`código: ${pedido.json.error || 'sin respuesta'}`)
        const { device_code: dispositivo, user_code: codigo, verification_uri: pagina } = pedido.json
        let intervalo = (Number(pedido.json.interval) || 5) * 1000
        const caduca = Date.now() + (Number(pedido.json.expires_in) || 900) * 1000
        alCodigo({ codigo, pagina, enlace: `${pagina}?otc=${encodeURIComponent(codigo)}`, caduca })

        while (true) {
          await esperar(intervalo)
          if (intento.cancelado) return { ok: false, cancelado: true }
          if (Date.now() > caduca) return { ok: false, error: 'El código caducó. Vuelve a pulsar "Iniciar sesión con Microsoft".' }
          const r = await pedirMicrosoft('https://login.live.com/oauth20_token.srf', {
            client_id: CLIENTE_MICROSOFT, grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: dispositivo
          }).catch(() => ({ ok: false, json: { error: 'authorization_pending' } })) // un fallo de red suelto: se sigue esperando
          if (intento.cancelado) return { ok: false, cancelado: true }
          if (r.ok && r.json.refresh_token) {
            // msmc hace el resto (Xbox Live y Minecraft) a partir de la sesión de Microsoft
            const xbox = await new Auth('none').refresh(r.json.refresh_token)
            return await terminarLogin(xbox)
          }
          const error = r.json.error
          if (error === 'authorization_pending') continue
          if (error === 'slow_down') { intervalo += 5000; continue }
          if (error === 'expired_token') return { ok: false, error: 'El código caducó. Vuelve a pulsar "Iniciar sesión con Microsoft".' }
          if (error === 'access_denied' || error === 'authorization_declined') return { ok: false, error: 'Se canceló el inicio de sesión en el navegador.' }
          throw new Error(`token: ${error || 'respuesta inesperada'}`)
        }
      } catch (e) {
        anotar(`navegador: ${e?.message || e?.ts || e}`)
        const mensaje = traducirError(e)
        return mensaje ? { ok: false, error: mensaje } : { ok: false, cancelado: true }
      } finally {
        if (loginEnCurso === intento) loginEnCurso = null
      }
    },

    cancelarLogin () {
      if (loginEnCurso) loginEnCurso.cancelado = true
    },

    async loginSinPremium (nombre) {
      nombre = String(nombre || '').trim()
      if (!/^[A-Za-z0-9_]{3,16}$/.test(nombre)) {
        return { ok: false, error: 'El nombre debe tener entre 3 y 16 letras, números o guiones bajos.' }
      }
      const cuenta = { tipo: 'sinPremium', nombre, uuid: uuidSinPremium(nombre) }
      await escribirJson(archivo, cuenta)
      sesion = null
      return { ok: true, cuenta }
    },

    async cerrarSesion () {
      sesion = null
      await fsp.rm(archivo, { force: true })
    },

    /** Devuelve una sesión lista para jugar, renovando el token de Microsoft si hace falta. */
    async sesionParaJugar () {
      const c = await leerJson(archivo, null)
      if (!c) throw new Error('Inicia sesión para jugar.')

      if (c.tipo === 'sinPremium') {
        return { tipo: 'sinPremium', nombre: c.nombre, uuid: c.uuid, token: '0', xuid: '0' }
      }

      if (sesion?.tipo === 'microsoft' && sesion.uuid === c.uuid && sesion.caduca - Date.now() > 10 * 60 * 1000) {
        return sesion
      }
      try {
        const auth = new Auth('none')
        const xbox = await auth.refresh(descifrar(c.refresco))
        const mc = await xbox.getMinecraft()
        if (!mc.profile) throw new Error('error.auth.minecraft.profile')
        await guardarMicrosoft(xbox, mc)
        return sesion
      } catch (e) {
        const mensaje = traducirError(e)
        throw new Error(`Tu sesión de Microsoft caducó. Cierra sesión y vuelve a entrar. ${mensaje || ''}`.trim())
      }
    }
  }
}

module.exports = { crearCuentas, uuidSinPremium }
