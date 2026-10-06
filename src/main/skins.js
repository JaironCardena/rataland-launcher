// Skin de las cuentas premium, con la API oficial de Minecraft (la misma que usa minecraft.net).
// Sin premium la pone el servidor con SkinRestorer: el launcher sube la imagen a MineSkin y deja
// el comando "/skin set web ..." para que el mod de RataLand lo mande al entrar al servidor.
const path = require('path')
const crypto = require('crypto')
const fsp = require('fs').promises
const { leerJson, escribirJson } = require('./util')

const PERFIL = 'https://api.minecraftservices.com/minecraft/profile'
const MINESKIN = 'https://api.mineskin.org/v2/generate'

/** Ancho y alto de un PNG (cabecera IHDR), o null si no es un PNG. */
function medidasPng (datos) {
  const b = Buffer.from(datos)
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) }
}

function errorDeMinecraft (res, accion) {
  if (res.status === 401) return new Error('Tu sesión de Microsoft caducó. Cierra sesión y vuelve a entrar.')
  if (res.status === 429) return new Error('Has hecho muchos cambios seguidos. Espera un minuto y vuelve a probar.')
  if (res.status === 400) return new Error('Minecraft no aceptó esa imagen. Tiene que ser una skin PNG de 64×64 (o 64×32).')
  return new Error(`No se pudo ${accion} (Minecraft respondió ${res.status}). Prueba otra vez en un momento.`)
}

/**
 * Sube la skin a MineSkin, el mismo servicio que usa SkinRestorer: devuelve su dirección
 * permanente en textures.minecraft.net. No hace falta cuenta (máximo 10 por minuto).
 */
async function subirAMineSkin (datos, variante, agente) {
  const formulario = new FormData()
  formulario.append('file', new Blob([Buffer.from(datos)], { type: 'image/png' }), 'skin.png')
  formulario.append('variant', variante)
  formulario.append('visibility', 'unlisted')
  const res = await fetch(MINESKIN, { method: 'POST', headers: { 'user-agent': agente }, body: formulario, signal: AbortSignal.timeout(60000) })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw new Error('Se han subido muchas skins seguidas. Espera un minuto y vuelve a probar.')
  const url = json.skin?.texture?.url?.skin
  if (!res.ok || !json.success || !url) throw new Error(`No se pudo preparar la skin (${json.errors?.[0]?.message || `MineSkin respondió ${res.status}`}).`)
  return url
}

function validarPng (datos) {
  const medidas = medidasPng(datos)
  if (!medidas) throw new Error('Ese archivo no es una imagen PNG.')
  if (medidas.ancho !== 64 || (medidas.alto !== 64 && medidas.alto !== 32)) {
    throw new Error(`La skin tiene que medir 64×64 píxeles (o 64×32); esta mide ${medidas.ancho}×${medidas.alto}.`)
  }
}

/** Skin de una cuenta sin premium: copia local para enseñarla y comando pendiente para el servidor. */
function crearSkinsSinPremium ({ raiz, dirDatos, agente }) {
  const local = path.join(dirDatos, 'skin.json')
  const pendiente = path.join(raiz, 'config', 'rataland-skin.json')

  async function estado () {
    const p = await leerJson(pendiente, null)
    if (!p?.id) return null
    return p.aplicada === p.id ? 'puesta' : 'pendiente'
  }
  // Un id nuevo en cada cambio: el mod manda el comando una sola vez por id
  const dejarComando = (comando) => escribirJson(pendiente, { id: crypto.randomUUID(), comando })

  return {
    async actual () {
      const s = await leerJson(local, null)
      return { ok: true, sinPremium: true, imagen: s?.imagen || null, modelo: s?.modelo || 'classic', estado: await estado() }
    },
    async cambiar ({ datos, modelo }) {
      const variante = modelo === 'slim' ? 'slim' : 'classic'
      const s = await leerJson(local, null)
      let url = s?.url
      let imagen = s?.imagen
      if (datos) {
        validarPng(datos)
        url = await subirAMineSkin(datos, variante, agente)
        imagen = `data:image/png;base64,${Buffer.from(datos).toString('base64')}`
      } else if (!url) {
        throw new Error('Primero elige una imagen para tu skin.')
      }
      await escribirJson(local, { imagen, modelo: variante, url })
      await dejarComando(`skin set web ${variante} "${url}"`)
      return { ok: true, sinPremium: true, imagen, modelo: variante, estado: 'pendiente' }
    },
    async quitar () {
      await fsp.rm(local, { force: true })
      await dejarComando('skin clear')
      return { ok: true, sinPremium: true, imagen: null, modelo: 'classic', estado: 'pendiente' }
    }
  }
}

function crearSkins (cuentas, opciones) {
  const sinPremium = crearSkinsSinPremium(opciones)
  const esSinPremium = async () => (await cuentas.actual())?.tipo === 'sinPremium'

  async function token () {
    const sesion = await cuentas.sesionParaJugar()
    if (sesion.tipo !== 'microsoft') throw new Error('La skin solo se puede cambiar con una cuenta de Microsoft.')
    return sesion.token
  }

  async function perfil (t) {
    const res = await fetch(PERFIL, { headers: { authorization: `Bearer ${t}` }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw errorDeMinecraft(res, 'leer tu perfil')
    return res.json()
  }

  /** La skin puesta ahora: la imagen (como data URL, para dibujarla sin salir a internet) y el modelo. */
  async function actual (t) {
    const p = await perfil(t || await token())
    const activa = (p.skins || []).find((s) => s.state === 'ACTIVE')
    if (!activa?.url) return { imagen: null, modelo: 'classic' }
    const res = await fetch(activa.url.replace(/^http:/, 'https:'), { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error('No se pudo descargar tu skin actual.')
    const datos = Buffer.from(await res.arrayBuffer())
    return { imagen: `data:image/png;base64,${datos.toString('base64')}`, modelo: activa.variant === 'SLIM' ? 'slim' : 'classic', url: activa.url }
  }

  return {
    async actual () {
      try {
        if (await esSinPremium()) return await sinPremium.actual()
        return { ok: true, ...await actual() }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    },

    /** Sube una skin nueva (datos del PNG) o, sin datos, cambia solo el modelo de la que hay. */
    async cambiar ({ datos, modelo }) {
      try {
        if (await esSinPremium()) return await sinPremium.cambiar({ datos, modelo })
        const variante = modelo === 'slim' ? 'slim' : 'classic'
        const t = await token()
        let res
        if (datos) {
          validarPng(datos)
          const formulario = new FormData()
          formulario.append('variant', variante)
          formulario.append('file', new Blob([Buffer.from(datos)], { type: 'image/png' }), 'skin.png')
          res = await fetch(`${PERFIL}/skins`, { method: 'POST', headers: { authorization: `Bearer ${t}` }, body: formulario, signal: AbortSignal.timeout(30000) })
        } else {
          // Mismo dibujo, otro modelo: Minecraft lo cambia a partir de la dirección de la skin actual
          const { url } = await actual(t)
          if (!url) throw new Error('Primero elige una imagen para tu skin.')
          res = await fetch(`${PERFIL}/skins`, {
            method: 'POST',
            headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
            body: JSON.stringify({ variant: variante, url }),
            signal: AbortSignal.timeout(30000)
          })
        }
        if (!res.ok) throw errorDeMinecraft(res, 'cambiar la skin')
        return { ok: true, ...await actual(t) }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    },

    /** Quita la skin: vuelve la de Steve o Alex que Minecraft da por defecto. */
    async quitar () {
      try {
        if (await esSinPremium()) return await sinPremium.quitar()
        const t = await token()
        const res = await fetch(`${PERFIL}/skins/active`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` }, signal: AbortSignal.timeout(15000) })
        if (!res.ok) throw errorDeMinecraft(res, 'quitar la skin')
        return { ok: true, ...await actual(t) }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    }
  }
}

module.exports = { crearSkins, medidasPng }
