'use strict'
// Animación del fondo «Noche de pesca»: estrellas que titilan, alguna estrella fugaz, nubes,
// el reflejo de la luna en el lago, la barca que se mece, el corcho con sus ondas, el farol y las luciérnagas.
// Se dibuja a 320×180 en un <canvas> que el CSS agranda sin suavizar.
// El juego dibuja lo mismo en FondoAnimado.java (mod) y el panel usa una copia de este archivo
// (docs/js/fondo-animado.js, la pone tools/arte.js): si cambias algo, cámbialo en los dos.
;(function () {
  const W = 320
  const H = 180
  const ORILLA = 104
  const LUNA_X = 200
  const BARCA = [136, 78] // la capa de la barca mide 64×40
  const AGUA_BARCA = 114
  const CORCHO = [128, 109]
  const AGUA_CORCHO = 112
  const PUNTA = [140, 84] // punta de la caña (se mece con la barca)
  const FAROL = [180, 97] // luz del farol (se mece con la barca)
  const VUELTA = 6.283

  function aleatorio (semilla) {
    let s = semilla
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  }
  const azar = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }
  const orilla = (x) => x < 140 ? 146 + Math.floor((x / 140) ** 2 * 34) : 999

  // Posiciones fijas: mismas semillas y mismo orden que en el juego
  const rnd = aleatorio(91)
  const estrellas = []
  while (estrellas.length < 28) {
    const x = Math.floor(rnd() * W)
    const y = 2 + Math.floor(rnd() * 84)
    const v = 0.6 + rnd() * 1.4
    const f = rnd() * VUELTA
    const grande = rnd() > 0.75
    if ((x - LUNA_X) ** 2 + (y - 40) ** 2 < 900) continue
    estrellas.push({ x, y, v, f, grande })
  }
  const destellos = []
  while (destellos.length < 26) {
    const x = Math.floor(rnd() * W)
    const y = ORILLA + 3 + Math.floor(rnd() * (H - ORILLA - 4))
    const w = 2 + Math.floor(rnd() * 4)
    const v = 0.5 + rnd()
    const f = rnd() * VUELTA
    if (y >= orilla(x) - 2 || y >= orilla(x + w) - 2) continue // la orilla
    if (x + w >= 264 && y <= 146) continue // el muelle y sus postes
    if (x + w >= 148 && x <= 190 && y <= 124) continue // la barca y su reflejo
    if (Math.abs(x - CORCHO[0]) < 14 && y <= 118) continue // las ondas del corcho
    if (Math.abs(x - LUNA_X) < 14) continue // ahí va el reflejo de la luna
    destellos.push({ x, y, w, v, f })
  }
  const luciernagas = []
  for (let i = 0; i < 12; i++) {
    const x = 8 + rnd() * 150
    const y = 112 + rnd() * 52
    const v = 0.7 + rnd() * 0.6
    const f = [rnd() * VUELTA, rnd() * VUELTA, rnd() * VUELTA, rnd() * VUELTA]
    luciernagas.push({ x, y, v, f })
  }

  function circulo (p, cx, cy, r, color, alfa) {
    for (let dy = -r; dy <= r; dy++) {
      const m = Math.floor(Math.sqrt(r * r - dy * dy))
      p.rect(cx - m, cy + dy, m * 2 + 1, 1, color, alfa)
    }
  }

  /** Lo que se mueve, encima del fondo fijo. `p` sabe pintar rectángulos y las capas (nubes y barca). */
  function dibujar (p, t) {
    // Estrellas que titilan
    for (const e of estrellas) {
      const k = 0.5 + 0.5 * Math.sin(t * e.v + e.f)
      p.rect(e.x, e.y, 1, 1, '#e9efff', 0.15 + 0.85 * k * k)
      if (e.grande && k > 0.85) {
        const a = (k - 0.85) / 0.15 * 0.5
        p.rect(e.x - 1, e.y, 1, 1, '#e9efff', a)
        p.rect(e.x + 1, e.y, 1, 1, '#e9efff', a)
        p.rect(e.x, e.y - 1, 1, 1, '#e9efff', a)
        p.rect(e.x, e.y + 1, 1, 1, '#e9efff', a)
      }
    }

    // Una estrella fugaz cada 13 segundos, cada vez en un sitio
    const n = Math.floor((t + 4) / 13)
    const u = ((t + 4) - n * 13) / 1.1
    if (u < 1) {
      const cx = 90 + azar(n) * 200 - u * 64
      const cy = 4 + azar(n + 0.5) * 30 + u * 30
      const brillo = Math.sin(Math.PI * u)
      for (let i = 0; i < 10; i++) p.rect(Math.round(cx + i * 0.905), Math.round(cy - i * 0.424), 1, 1, '#fff3d6', brillo * (1 - i / 10))
    }

    // Nubes que cruzan despacio (la capa se repite sin costuras)
    const desp = Math.floor(t * 2.5) % W
    p.capa('nubes', -desp, 6, W, 48)
    p.capa('nubes', W - desp, 6, W, 48)

    // Reflejo de la luna, roto por las olas
    for (let y = ORILLA + 2; y < 160; y += 2) {
      if (Math.sin(t * 1.9 + y * 1.7) > 0.8) continue
      const d = (y - ORILLA) / 56
      const media = Math.max(1, Math.round(7 - d * 4 + 1.6 * Math.sin(t * 1.6 + y * 0.8)))
      const cx = LUNA_X + Math.round(1.5 * Math.sin(t * 1.1 + y * 0.45))
      const a = 0.5 * (1 - d * 0.75)
      p.rect(cx - media, y, media * 2, 1, '#f6c445', a)
      if (media > 3) p.rect(cx - 1 + Math.round(Math.sin(t * 2.3 + y)), y, 2, 1, '#fff0a8', a)
    }

    // Destellos en el agua
    for (const g of destellos) {
      const k = 0.5 + 0.5 * Math.sin(t * g.v + g.f)
      p.rect(g.x + Math.round(Math.sin(t * 0.6 + g.f) * 1.5), g.y, g.w, 1, '#5d6b9a', 0.1 + 0.35 * k)
    }

    // La barca se mece: su reflejo, tembloroso
    const mece = Math.sin(t * 1.3) > 0.2 ? 1 : 0
    for (let k = 0; k < 5; k++) {
      const x = 154 + k + Math.round(Math.sin(t * 1.5 + k * 1.3))
      p.rect(x, AGUA_BARCA + mece + k, 30 - k * 2, 1, '#0a0f1c', 0.3 * (1 - k / 5))
    }

    // El corcho flota; de vez en cuando pica un pez y se hunde
    const pica = (t + 9) % 19 < 0.9
    const baja = pica ? 2 : Math.sin(t * 2.4) > 0.4 ? 1 : 0
    const vistos = new Set()
    for (const desfase of [0, 1.5]) {
      const edad = ((t + desfase) % 3) / 3
      const r = 2 + edad * 9
      const pasos = Math.round(r * 5)
      for (let i = 0; i < pasos; i++) {
        const x = Math.round(CORCHO[0] + 0.5 + r * Math.cos(i / pasos * VUELTA))
        const y = Math.round(AGUA_CORCHO + r * 0.3 * Math.sin(i / pasos * VUELTA))
        const clave = desfase * 100000 + x * 1000 + y
        if (vistos.has(clave)) continue
        vistos.add(clave)
        p.rect(x, y, 1, 1, '#8fa0cc', (1 - edad) * 0.45)
      }
    }
    const punta = [PUNTA[0], PUNTA[1] + mece]
    const fin = [CORCHO[0], CORCHO[1] + baja]
    const tramos = Math.max(Math.abs(fin[0] - punta[0]), Math.abs(fin[1] - punta[1]))
    for (let i = 1; i < tramos; i++) {
      p.rect(Math.round(punta[0] + (fin[0] - punta[0]) * i / tramos), Math.round(punta[1] + (fin[1] - punta[1]) * i / tramos), 1, 1, '#c7cfe0', 0.4)
    }
    if (fin[1] < AGUA_CORCHO) p.rect(fin[0], fin[1], 2, 1, '#e0533f', 1)
    if (fin[1] + 1 < AGUA_CORCHO) p.rect(fin[0], fin[1] + 1, 2, 1, '#f2f2f2', 1)

    p.capa('barca', BARCA[0], BARCA[1] + mece, 64, 40)

    // Farol que parpadea, con su reflejo en el agua
    const llama = 0.5 + 0.25 * Math.sin(t * 7.3) + 0.25 * Math.sin(t * 11.1 + 1)
    circulo(p, FAROL[0] + 1, FAROL[1] + 2 + mece, 16, '#f6c445', 0.04 + 0.03 * llama)
    circulo(p, FAROL[0] + 1, FAROL[1] + 2 + mece, 8, '#f6c445', 0.06 + 0.05 * llama)
    p.rect(FAROL[0], FAROL[1] + mece, 2, 4, llama > 0.6 ? '#fff0a8' : '#ffd36b', 1)
    for (let y = AGUA_BARCA + 6; y < AGUA_BARCA + 22; y += 2) {
      const ancho = Math.sin(t * 2 + y) > 0 ? 3 : 2
      p.rect(FAROL[0] + Math.round(Math.sin(t * 1.7 + y * 0.9)), y, ancho, 1, '#f6c445', 0.3 * (1 - (y - AGUA_BARCA - 6) / 16) * (0.6 + 0.4 * llama))
    }

    // Luciérnagas
    for (const l of luciernagas) {
      const x = Math.round(l.x + 7 * Math.sin(t * 0.37 * l.v + l.f[0]) + 3 * Math.sin(t * 0.9 * l.v + l.f[1]))
      const y = Math.round(l.y + 4 * Math.sin(t * 0.53 * l.v + l.f[2]))
      const b = Math.max(0, Math.sin(t * 1.1 * l.v + l.f[3])) ** 2
      p.rect(x - 1, y - 1, 3, 3, '#f6c445', 0.22 * b)
      p.rect(x, y, 1, 1, '#fff0a8', 0.12 + 0.88 * b)
    }
  }

  const cargar = (src) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

  /**
   * Anima la escena en `lienzo` hasta que se quite de la página o se llame a parar().
   * Con "reducir movimiento" activado en el sistema, se queda quieta.
   */
  function animar (lienzo, { base, nubes, barca }) {
    lienzo.width = W
    lienzo.height = H
    const ctx = lienzo.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const quieto = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const inicio = performance.now()
    let parado = false
    let ultimo = -Infinity

    Promise.all([cargar(base), cargar(nubes), cargar(barca)]).then(([imgBase, imgNubes, imgBarca]) => {
      const capas = { nubes: imgNubes, barca: imgBarca }
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
        ctx.drawImage(imgBase, 0, 0, W, H)
        dibujar(p, t)
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

  window.FondoAnimado = { animar, ANCHO: W, ALTO: H }
})()
