'use strict'
// Motor de los fondos animados. Cada escena es una lista de elementos (estrellas, nubes, reflejos,
// corcho, farol, luciérnagas…) con sus posiciones, colores y velocidades: esos datos los genera
// tools/arte.js en fondo-escenas.js (launcher y panel) y en assets/rataland/escenas/*.json (juego).
//
// El juego dibuja lo mismo con MotorFondo.java. Para que no se separen, tools/comprobar-fondos.js
// guarda lo que dibuja este motor y la compilación del mod falla si el de Java dibuja otra cosa.
// Este archivo se copia a docs/js/ con tools/arte.js.
;(function () {
  const VUELTA = 6.283

  function aleatorio (semilla) {
    let s = semilla
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  }
  const azar = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }
  const dentro = (x, w, y, [rx, ry, rw, rh]) => x < rx + rw && x + w > rx && y >= ry && y < ry + rh

  /** Precalcula las posiciones fijas (mismas semillas y mismo orden que en Java). */
  function preparar (escena) {
    const elementos = escena.elementos.map((e) => {
      const rnd = aleatorio(e.semilla || 1)
      const [zx, zy, zw, zh] = e.zona || [0, 0, 0, 0]
      const datos = []
      if (e.tipo === 'estrellas') {
        for (let intento = 0; datos.length < e.n && intento < e.n * 50; intento++) {
          const x = zx + Math.floor(rnd() * zw)
          const y = zy + Math.floor(rnd() * zh)
          const v = 0.6 + rnd() * 1.4
          const f = rnd() * VUELTA
          const grande = rnd() < e.grandes
          if (e.evitar && (x - e.evitar[0]) * (x - e.evitar[0]) + (y - e.evitar[1]) * (y - e.evitar[1]) < e.evitar[2] * e.evitar[2]) continue
          datos.push({ x, y, v, f, grande })
        }
      } else if (e.tipo === 'destellos') {
        for (let intento = 0; datos.length < e.n && intento < e.n * 50; intento++) {
          const x = zx + Math.floor(rnd() * zw)
          const y = zy + Math.floor(rnd() * zh)
          const w = 2 + Math.floor(rnd() * 4)
          const v = 0.5 + rnd()
          const f = rnd() * VUELTA
          if ((e.evitar || []).some((r) => dentro(x, w, y, r))) continue
          datos.push({ x, y, w, v, f })
        }
      } else if (e.tipo === 'luciernagas') {
        for (let i = 0; i < e.n; i++) {
          const x = zx + rnd() * zw
          const y = zy + rnd() * zh
          const v = 0.7 + rnd() * 0.6
          const f = [rnd() * VUELTA, rnd() * VUELTA, rnd() * VUELTA, rnd() * VUELTA]
          datos.push({ x, y, v, f })
        }
      }
      return { e, datos }
    })
    return { escena, elementos }
  }

  /** Cuánto baja (0 o 1 píxel) lo que se mece con el agua. */
  function vaiven (motor, nombre, t) {
    const v = nombre && motor.escena.vaivenes && motor.escena.vaivenes[nombre]
    return v && Math.sin(t * v.velocidad) > v.umbral ? 1 : 0
  }

  function circulo (p, cx, cy, r, color, alfa) {
    for (let dy = -r; dy <= r; dy++) {
      const m = Math.floor(Math.sqrt(r * r - dy * dy))
      p.rect(cx - m, cy + dy, m * 2 + 1, 1, color, alfa)
    }
  }

  const DIBUJAR = {
    estrellas (p, t, e, datos) {
      for (const s of datos) {
        const k = 0.5 + 0.5 * Math.sin(t * s.v + s.f)
        p.rect(s.x, s.y, 1, 1, e.color, 0.15 + 0.85 * k * k)
        if (s.grande && k > 0.85) {
          const a = (k - 0.85) / 0.15 * 0.5
          p.rect(s.x - 1, s.y, 1, 1, e.color, a)
          p.rect(s.x + 1, s.y, 1, 1, e.color, a)
          p.rect(s.x, s.y - 1, 1, 1, e.color, a)
          p.rect(s.x, s.y + 1, 1, 1, e.color, a)
        }
      }
    },

    // Una estrella fugaz cada `cada` segundos, cada vez en un sitio
    fugaz (p, t, e) {
      const n = Math.floor((t + e.desfase) / e.cada)
      const u = ((t + e.desfase) - n * e.cada) / e.dura
      if (u >= 1) return
      const [zx, zy, zw, zh] = e.zona
      const [dx, dy] = e.recorrido
      const largo = Math.sqrt(dx * dx + dy * dy)
      const cx = zx + azar(n) * zw + u * dx
      const cy = zy + azar(n + 0.5) * zh + u * dy
      const brillo = Math.sin(Math.PI * u)
      for (let i = 0; i < e.estela; i++) {
        p.rect(Math.round(cx - dx / largo * i), Math.round(cy - dy / largo * i), 1, 1, e.color, brillo * (1 - i / e.estela))
      }
    },

    // Una capa de imagen: se desliza en horizontal (y se repite) o se mece con el agua
    capa (p, t, e, datos, motor) {
      const { ancho, alto } = motor.escena.capas[e.nombre]
      if (e.desliza) {
        const desp = Math.floor(t * e.desliza) % motor.escena.ancho
        p.capa(e.nombre, e.x - desp, e.y, ancho, alto)
        p.capa(e.nombre, e.x - desp + motor.escena.ancho, e.y, ancho, alto)
      } else {
        p.capa(e.nombre, e.x, e.y + vaiven(motor, e.mece, t), ancho, alto)
      }
    },

    // Reflejo de la luna, roto por las olas
    reflejo (p, t, e) {
      for (let y = e.desde; y < e.hasta; y += 2) {
        if (Math.sin(t * 1.9 + y * 1.7) > 0.8) continue
        const d = (y - e.desde) / (e.hasta - e.desde)
        const media = Math.max(1, Math.round(e.ancho - d * 4 + 1.6 * Math.sin(t * 1.6 + y * 0.8)))
        const cx = e.x + Math.round(1.5 * Math.sin(t * 1.1 + y * 0.45))
        const a = 0.5 * (1 - d * 0.75)
        p.rect(cx - media, y, media * 2, 1, e.color, a)
        if (media > 3) p.rect(cx - 1 + Math.round(Math.sin(t * 2.3 + y)), y, 2, 1, e.brillo, a)
      }
    },

    destellos (p, t, e, datos) {
      for (const g of datos) {
        const k = 0.5 + 0.5 * Math.sin(t * g.v + g.f)
        p.rect(g.x + Math.round(Math.sin(t * 0.6 + g.f) * 1.5), g.y, g.w, 1, e.color, 0.1 + 0.35 * k)
      }
    },

    // Reflejo oscuro de algo que flota, tembloroso
    sombra (p, t, e, datos, motor) {
      const baja = vaiven(motor, e.mece, t)
      for (let k = 0; k < e.filas; k++) {
        const x = e.x + k + Math.round(Math.sin(t * 1.5 + k * 1.3))
        p.rect(x, e.y + baja + k, e.ancho - k * 2, 1, e.color, 0.3 * (1 - k / e.filas))
      }
    },

    // El corcho flota con sus ondas; de vez en cuando pica un pez y se hunde
    corcho (p, t, e, datos, motor) {
      const pica = (t + e.desfase) % e.cada < e.pica
      const baja = pica ? 2 : Math.sin(t * 2.4) > 0.4 ? 1 : 0
      const o = e.ondas
      const vistos = new Set()
      for (const desfase of [0, o.cada / 2]) {
        const edad = ((t + desfase) % o.cada) / o.cada
        const r = 2 + edad * o.radio
        const pasos = Math.round(r * 5)
        for (let i = 0; i < pasos; i++) {
          const x = Math.round(e.x + 0.5 + r * Math.cos(i / pasos * VUELTA))
          const y = Math.round(e.agua + r * o.aplasta * Math.sin(i / pasos * VUELTA))
          const clave = desfase * 100000 + x * 1000 + y
          if (vistos.has(clave)) continue
          vistos.add(clave)
          p.rect(x, y, 1, 1, o.color, (1 - edad) * o.alfa)
        }
      }
      const s = e.sedal
      const px = s.desde[0]
      const py = s.desde[1] + vaiven(motor, s.mece, t)
      const fy = e.y + baja
      const tramos = Math.max(Math.abs(e.x - px), Math.abs(fy - py))
      for (let i = 1; i < tramos; i++) {
        p.rect(Math.round(px + (e.x - px) * i / tramos), Math.round(py + (fy - py) * i / tramos), 1, 1, s.color, s.alfa)
      }
      if (fy < e.agua) p.rect(e.x, fy, 2, 1, e.colores[0], 1)
      if (fy + 1 < e.agua) p.rect(e.x, fy + 1, 2, 1, e.colores[1], 1)
    },

    // Farol que parpadea, con su reflejo en el agua
    farol (p, t, e, datos, motor) {
      const baja = vaiven(motor, e.mece, t)
      const llama = 0.5 + 0.25 * Math.sin(t * 7.3) + 0.25 * Math.sin(t * 11.1 + 1)
      circulo(p, e.x + 1, e.y + 2 + baja, e.radios[0], e.color, 0.04 + 0.03 * llama)
      circulo(p, e.x + 1, e.y + 2 + baja, e.radios[1], e.color, 0.06 + 0.05 * llama)
      p.rect(e.x, e.y + baja, 2, 4, llama > 0.6 ? e.llama[1] : e.llama[0], 1)
      const [desde, hasta] = e.reflejo
      for (let y = desde; y < hasta; y += 2) {
        const ancho = Math.sin(t * 2 + y) > 0 ? 3 : 2
        p.rect(e.x + Math.round(Math.sin(t * 1.7 + y * 0.9)), y, ancho, 1, e.color, 0.3 * (1 - (y - desde) / (hasta - desde)) * (0.6 + 0.4 * llama))
      }
    },

    luciernagas (p, t, e, datos) {
      for (const l of datos) {
        const x = Math.round(l.x + 7 * Math.sin(t * 0.37 * l.v + l.f[0]) + 3 * Math.sin(t * 0.9 * l.v + l.f[1]))
        const y = Math.round(l.y + 4 * Math.sin(t * 0.53 * l.v + l.f[2]))
        const s = Math.max(0, Math.sin(t * 1.1 * l.v + l.f[3]))
        const b = s * s
        p.rect(x - 1, y - 1, 3, 3, e.color, 0.22 * b)
        p.rect(x, y, 1, 1, e.brillo, 0.12 + 0.88 * b)
      }
    }
  }

  /** Dibuja lo que se mueve en el instante `t` (segundos). `p` sabe pintar rectángulos y capas. */
  function dibujar (motor, p, t) {
    for (const { e, datos } of motor.elementos) DIBUJAR[e.tipo](p, t, e, datos, motor)
  }

  const cargar = (src) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

  /**
   * Anima la escena en `lienzo` hasta que se quite de la página o se llame a parar().
   * Las imágenes son `${ruta}fondo-${clave}.png` y `${ruta}fondo-${clave}-${capa}.png`.
   * Con "reducir movimiento" activado en el sistema, se queda quieta.
   */
  function animar (lienzo, { escena, ruta }) {
    const motor = preparar(escena)
    lienzo.width = escena.ancho
    lienzo.height = escena.alto
    const ctx = lienzo.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const quieto = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const inicio = performance.now()
    let parado = false
    let ultimo = -Infinity

    const nombres = Object.keys(escena.capas)
    Promise.all([cargar(`${ruta}fondo-${escena.clave}.png`), ...nombres.map((n) => cargar(`${ruta}fondo-${escena.clave}-${n}.png`))]).then(([base, ...imagenes]) => {
      const capas = Object.fromEntries(nombres.map((n, i) => [n, imagenes[i]]))
      const p = {
        rect (x, y, w, h, color, alfa) {
          if (alfa < 0.004) return
          ctx.globalAlpha = Math.min(1, alfa)
          ctx.fillStyle = color
          ctx.fillRect(x, y, w, h)
        },
        capa (nombre, x, y, w, h) {
          ctx.globalAlpha = 1
          ctx.drawImage(capas[nombre], x, y, w, h)
        }
      }
      const pintar = (t) => {
        ctx.globalAlpha = 1
        ctx.drawImage(base, 0, 0, escena.ancho, escena.alto)
        dibujar(motor, p, t)
      }
      const fotograma = (ahora) => {
        if (parado || !lienzo.isConnected) return
        if (quieto && quieto.matches) {
          pintar(6)
          return
        }
        // 24 fotogramas por segundo bastan para el pixel art
        if (ahora - ultimo >= 41) {
          ultimo = ahora
          pintar((ahora - inicio) / 1000)
        }
        requestAnimationFrame(fotograma)
      }
      if (quieto && quieto.addEventListener) quieto.addEventListener('change', () => requestAnimationFrame(fotograma))
      requestAnimationFrame(fotograma)
    }).catch(() => {})

    return { parar () { parado = true } }
  }

  const api = { preparar, dibujar, animar }
  if (typeof window !== 'undefined') window.FondoAnimado = api
  if (typeof module === 'object' && module.exports) module.exports = api
})()
