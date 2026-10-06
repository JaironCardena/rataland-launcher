// Skin de las cuentas premium, con la API oficial de Minecraft (la misma que usa minecraft.net).
const PERFIL = 'https://api.minecraftservices.com/minecraft/profile'

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

function crearSkins (cuentas) {
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
        return { ok: true, ...await actual() }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    },

    /** Sube una skin nueva (datos del PNG) o, sin datos, cambia solo el modelo de la que hay. */
    async cambiar ({ datos, modelo }) {
      try {
        const variante = modelo === 'slim' ? 'slim' : 'classic'
        const t = await token()
        let res
        if (datos) {
          const medidas = medidasPng(datos)
          if (!medidas) throw new Error('Ese archivo no es una imagen PNG.')
          if (medidas.ancho !== 64 || (medidas.alto !== 64 && medidas.alto !== 32)) {
            throw new Error(`La skin tiene que medir 64×64 píxeles (o 64×32); esta mide ${medidas.ancho}×${medidas.alto}.`)
          }
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
