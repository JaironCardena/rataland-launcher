#!/usr/bin/env node
// Genera el arte pixel de RataLand: logo, fondos, icono y texturas del mod.
// Uso: node tools/arte.js
const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

const RAIZ = path.join(__dirname, '..')

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]

class Lienzo {
  constructor (ancho, alto) {
    this.ancho = ancho
    this.alto = alto
    this.px = new Float32Array(ancho * alto * 4)
  }

  pintar (x, y, color, alfa = 1) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return
    const i = (y * this.ancho + x) * 4
    const [r, g, b] = hex(color)
    const a0 = this.px[i + 3]
    const a = alfa + a0 * (1 - alfa)
    if (a === 0) return
    this.px[i] = (r * alfa + this.px[i] * a0 * (1 - alfa)) / a
    this.px[i + 1] = (g * alfa + this.px[i + 1] * a0 * (1 - alfa)) / a
    this.px[i + 2] = (b * alfa + this.px[i + 2] * a0 * (1 - alfa)) / a
    this.px[i + 3] = a
  }

  opaco (x, y) {
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return false
    return this.px[(y * this.ancho + x) * 4 + 3] > 0
  }

  rect (x, y, w, h, color, alfa) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.pintar(x + i, y + j, color, alfa)
  }

  circulo (cx, cy, r, color, alfa) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if ((x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2 <= r * r) this.pintar(x, y, color, alfa)
      }
    }
  }

  sprite (x, y, filas, paleta) {
    filas.forEach((fila, j) => [...fila].forEach((c, i) => { if (paleta[c]) this.pintar(x + i, y + j, paleta[c]) }))
  }

  /** Recorta al contenido visible dejando `margen` píxeles. */
  recortar (margen = 0) {
    let x0 = this.ancho; let y0 = this.alto; let x1 = -1; let y1 = -1
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        if (this.opaco(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
      }
    }
    return this.region(x0 - margen, y0 - margen, x1 - x0 + 1 + 2 * margen, y1 - y0 + 1 + 2 * margen)
  }

  region (x, y, w, h) {
    const nuevo = new Lienzo(w, h)
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!this.opaco(x + i, y + j)) continue
        const o = ((y + j) * this.ancho + x + i) * 4
        nuevo.px.set(this.px.subarray(o, o + 4), (j * w + i) * 4)
      }
    }
    return nuevo
  }

  pegar (otro, x, y) {
    for (let j = 0; j < otro.alto; j++) {
      for (let i = 0; i < otro.ancho; i++) {
        const o = (j * otro.ancho + i) * 4
        const a = otro.px[o + 3]
        if (!a) continue
        const c = '#' + [0, 1, 2].map((k) => Math.round(otro.px[o + k]).toString(16).padStart(2, '0')).join('')
        this.pintar(x + i, y + j, c, a)
      }
    }
  }

  guardar (ruta, escala = 1) {
    const png = new PNG({ width: this.ancho * escala, height: this.alto * escala })
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const o = (Math.floor(y / escala) * this.ancho + Math.floor(x / escala)) * 4
        const d = (y * png.width + x) * 4
        png.data[d] = Math.round(this.px[o])
        png.data[d + 1] = Math.round(this.px[o + 1])
        png.data[d + 2] = Math.round(this.px[o + 2])
        png.data[d + 3] = Math.round(this.px[o + 3] * 255)
      }
    }
    fs.mkdirSync(path.dirname(ruta), { recursive: true })
    fs.writeFileSync(ruta, PNG.sync.write(png))
    console.log(path.relative(RAIZ, ruta), `${png.width}x${png.height}`)
  }
}

function aleatorio (semilla) {
  let s = semilla
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

/* ---------- Paleta ---------- */
const C = {
  contorno: '#1d1108',
  quesoLuz: '#fff0a8',
  queso: '#f6c445',
  quesoMedio: '#efad34',
  quesoSombra: '#d98a22',
  agujero: '#b8701a',
  lateral: '#8a4a14',
  lateralOscuro: '#5e300b',
  rata: '#a3a8b5',
  rataSombra: '#7b8090',
  rosa: '#e79aa6',
  negro: '#000000',
  blanco: '#ffffff'
}

/* ---------- Logo: letras de queso ---------- */
const LETRAS = {
  R: ['######.', '##...##', '##...##', '##...##', '######.', '##.##..', '##..##.', '##...##', '##...##'],
  A: ['.#####.', '##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '##...##'],
  T: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  L: ['##....', '##....', '##....', '##....', '##....', '##....', '##....', '######', '######'],
  N: ['##...##', '###..##', '###..##', '####.##', '##.####', '##..###', '##..###', '##...##', '##...##'],
  D: ['#####..', '##..##.', '##...##', '##...##', '##...##', '##...##', '##...##', '##..##.', '#####..']
}

// Rata pequeña sentada sobre la T
const RATA_PEQUENA = [
  '........dd....',
  '.......dpgd...',
  '...dddddgggdd.',
  '..dggggggkgggd',
  '.dgggggggggggp',
  '.dsggggggggdd.',
  '..dsssssssd...',
  '...dd...dd....'
]

function logo () {
  const texto = 'RATALAND'
  const lz = new Lienzo(120, 40)
  const ox = 8
  const oy = 14
  const mascara = new Set()
  let x = ox
  let xT = 0
  for (const letra of texto) {
    const g = LETRAS[letra]
    if (letra === 'T') xT = x
    g.forEach((fila, j) => [...fila].forEach((c, i) => { if (c === '#') mascara.add(`${x + i},${oy + j}`) }))
    x += g[0].length + 1
  }
  const en = (px, py) => mascara.has(`${px},${py}`)

  // Volumen hacia abajo-derecha y contorno alrededor de todo
  const cuerpo = new Set(mascara)
  for (const k of mascara) {
    const [px, py] = k.split(',').map(Number)
    for (let d = 1; d <= 2; d++) cuerpo.add(`${px + d},${py + d}`)
  }
  for (const k of cuerpo) {
    const [px, py] = k.split(',').map(Number)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (!cuerpo.has(`${px + dx},${py + dy}`)) lz.pintar(px + dx, py + dy, C.contorno)
    }
  }
  for (const k of cuerpo) {
    if (mascara.has(k)) continue
    const [px, py] = k.split(',').map(Number)
    lz.pintar(px, py, en(px - 1, py - 1) && en(px - 2, py - 2) ? C.lateralOscuro : C.lateral)
  }

  // Cara de las letras: degradado de queso, brillo arriba y agujeros
  const rnd = aleatorio(42)
  for (const k of mascara) {
    const [px, py] = k.split(',').map(Number)
    const fila = py - oy
    let color = fila < 2 ? C.queso : fila < 6 ? C.quesoMedio : C.quesoSombra
    if (!en(px, py - 1)) color = C.quesoLuz
    const grueso = en(px - 1, py) && en(px + 1, py) && en(px, py - 1) && en(px, py + 1)
    if (grueso && fila > 1 && rnd() < 0.22) color = C.agujero
    lz.pintar(px, py, color)
  }

  // Rata sentada sobre la T, con la cola colgando
  const rx = xT - 3
  const ry = oy - 9
  const cola = [[1, 5], [0, 6], [-1, 6], [-2, 5], [-3, 4], [-3, 3], [-2, 2]]
  for (const [cx, cy] of cola) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!lz.opaco(rx + cx + dx, ry + cy + dy)) lz.pintar(rx + cx + dx, ry + cy + dy, C.contorno)
  }
  for (const [cx, cy] of cola) lz.pintar(rx + cx, ry + cy, C.rosa)
  lz.sprite(rx, ry, RATA_PEQUENA, { d: C.contorno, g: C.rata, s: C.rataSombra, p: C.rosa, k: C.negro })

  return lz.recortar(1)
}

/* ---------- Icono: cabeza de rata ---------- */
function linea (lz, x0, y0, x1, y1, color) {
  const pasos = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= pasos; i++) lz.pintar(x0 + (x1 - x0) * i / pasos, y0 + (y1 - y0) * i / pasos, color)
}

function contornear (lz, color) {
  const borde = []
  for (let y = 0; y < lz.alto; y++) {
    for (let x = 0; x < lz.ancho; x++) {
      if (lz.opaco(x, y)) continue
      if (lz.opaco(x - 1, y) || lz.opaco(x + 1, y) || lz.opaco(x, y - 1) || lz.opaco(x, y + 1)) borde.push([x, y])
    }
  }
  for (const [x, y] of borde) lz.pintar(x, y, color)
}

function icono () {
  const lz = new Lienzo(32, 32)
  // Orejas grandes y redondas a los lados
  lz.circulo(7, 9, 6.5, C.rata)
  lz.circulo(25, 9, 6.5, C.rata)
  lz.circulo(7.5, 9.5, 4, C.rosa)
  lz.circulo(24.5, 9.5, 4, C.rosa)
  // Cabeza en forma de gota que acaba en un hocico puntiagudo
  for (let y = 9; y <= 28; y++) {
    const medio = y <= 15 ? 9 : 9 - (y - 15) * 0.62
    for (let x = Math.round(16 - medio); x < Math.round(16 + medio); x++) {
      lz.pintar(x, y, y >= 21 ? '#c4c8d2' : C.rata)
    }
  }
  contornear(lz, C.contorno)
  // Ojos, nariz y dientes
  for (const ex of [11, 19]) {
    lz.rect(ex, 15, 2, 3, C.negro)
    lz.pintar(ex, 15, C.blanco)
  }
  lz.rect(14, 26, 4, 2, C.rosa)
  lz.rect(15, 28, 2, 2, C.blanco)
  // Bigotes
  for (const [x0, y0, x1, y1] of [[11, 23, 2, 21], [11, 25, 2, 26], [21, 23, 30, 21], [21, 25, 30, 26]]) linea(lz, x0, y0, x1, y1, '#e6e9ef')
  return lz
}

/* ---------- Fondo: noche con luna de queso y una rata mirándola ---------- */
// Rata sentada mirando la luna, con un trozo de queso entre las patas (q)
const RATA_SILUETA = [
  '..............##..........',
  '.............####.........',
  '.............####.........',
  '............######........',
  '...........##########.....',
  '...........############...',
  '...........#############..',
  '............##########....',
  '............########......',
  '...........##########.....',
  '..........###########qq...',
  '.........###########qqqq..',
  '.........############qq...',
  '........###############...',
  '........################..',
  '........################..',
  '........###############...',
  '.........##############...',
  '..........############....',
  '...........###....####....'
]
const COLA = [[8, 17], [7, 18], [6, 19], [5, 19], [4, 19], [3, 19], [2, 19], [1, 18], [0, 17], [0, 16], [1, 15], [2, 15]]

function fondo ({ lunaX, lunaY, radio = 20, rataX, semilla = 7 }) {
  const W = 320
  const H = 180
  const lz = new Lienzo(W, H)
  const rnd = aleatorio(semilla)

  const cielo = ['#0c1222', '#0f172b', '#121c34', '#16223e', '#1b2948', '#213052', '#28385c', '#304066', '#3a466e', '#454c74']
  cielo.forEach((c, i) => lz.rect(0, i * 12, W, 13, c))
  lz.rect(0, cielo.length * 12, W, H, cielo.at(-1))

  for (let i = 0; i < 110; i++) lz.pintar(Math.floor(rnd() * W), Math.floor(rnd() * 95), '#e9efff', 0.3 + rnd() * 0.7)

  // Luna de queso con halo
  lz.circulo(lunaX, lunaY, radio + 12, C.queso, 0.04)
  lz.circulo(lunaX, lunaY, radio + 6, C.queso, 0.06)
  lz.circulo(lunaX, lunaY, radio, C.quesoMedio)
  lz.circulo(lunaX - 2, lunaY - 2, radio - 3, C.queso)
  lz.circulo(lunaX - 5, lunaY - 6, radio - 11, C.quesoLuz, 0.5)
  for (const [dx, dy, r] of [[-9, -4, 3.2], [6, -10, 2.4], [8, 5, 4.2], [-3, 9, 2.6], [-12, 7, 1.8], [12, -2, 1.6], [0, -1, 1.5]]) {
    lz.circulo(lunaX + dx, lunaY + dy, r, C.agujero)
    lz.circulo(lunaX + dx + 0.6, lunaY + dy + 0.6, r * 0.65, '#a35f14')
  }

  function relieve (min, max, paso, color, cambio, forzar) {
    const alturas = []
    let y = min + rnd() * (max - min)
    for (let x = 0; x < W; x += paso) {
      y = Math.max(min, Math.min(max, y + (rnd() - 0.5) * cambio))
      let yy = Math.round(y)
      if (forzar) yy = forzar(x, yy)
      lz.rect(x, yy, paso, H - yy, color)
      alturas.push(yy)
    }
    return (x) => alturas[Math.floor(x / paso)]
  }
  relieve(78, 112, 4, '#26335a', 14)

  // Colina en forma de cúpula escalonada donde se sienta la rata
  const cima = lunaY + radio - 1
  const alturaColina = relieve(110, 130, 4, '#1b2644', 10, (x, yy) => {
    const d = Math.abs(x + 2 - rataX)
    return Math.min(yy, cima + Math.floor((d * d) / 45))
  })
  for (let i = 0; i < 9; i++) {
    const tx = Math.floor(rnd() * 300)
    if (Math.abs(tx + 5 - rataX) < 34) continue
    const base = alturaColina(tx + 5) + 2
    lz.rect(tx + 4, base - 9, 2, 9, '#141c33')
    lz.rect(tx, base - 19, 10, 10, '#17213b')
    lz.rect(tx + 2, base - 22, 6, 3, '#17213b')
  }

  // Rata (silueta) con su cola y el queso iluminado por la luna
  const rx = rataX - 14
  const ry = cima - 19
  lz.sprite(rx, ry, RATA_SILUETA, { '#': '#0a0f1c', q: C.quesoMedio })
  for (const [cx, cy] of COLA) lz.pintar(rx + cx, ry + cy, '#0a0f1c')
  lz.pintar(rx + 20, ry + 5, C.quesoLuz)

  // Suelo cercano
  let y = 150
  for (let x = 0; x < W; x += 8) {
    y = Math.max(144, Math.min(156, y + Math.round((rnd() - 0.5) * 6)))
    lz.rect(x, y, 8, H - y, '#1b140f')
    lz.rect(x, y, 8, 3, '#2c4a2b')
    if (rnd() > 0.5) lz.rect(x + Math.floor(rnd() * 6), y + 3, 2, 1, '#2c4a2b')
    for (let k = 0; k < 3; k++) lz.pintar(x + Math.floor(rnd() * 8), y + 5 + Math.floor(rnd() * 20), '#2a1f17')
  }
  // Luciérnagas
  for (let i = 0; i < 14; i++) {
    const fx = Math.floor(rnd() * W)
    const fy = 120 + Math.floor(rnd() * 34)
    lz.pintar(fx, fy, C.queso, 0.25)
    lz.pintar(fx, fy, '#ffe9a0', 0.9)
  }
  return lz
}

/* ---------- Pantalla de carga: el juego dibuja la textura en dos mitades ---------- */
/* ---------- Más escenas: Las Cloacas y Amanecer de queso ---------- */

function cloacas () {
  const W = 320
  const H = 180
  const lz = new Lienzo(W, H)
  const rnd = aleatorio(31)
  for (let y = 0; y < H; y++) lz.rect(0, y, W, 1, y < 120 ? '#161c2b' : '#121826')
  // Ladrillos
  for (let y = 0; y < 132; y += 6) {
    for (let x = (y / 6) % 2 ? -6 : 0; x < W; x += 12) lz.rect(x, y, 11, 5, ['#1d2537', '#202a3e', '#1a2233'][Math.floor(rnd() * 3)])
  }
  // Arco del túnel con una luz al fondo
  const cx = 160
  const arriba = 34
  const r = 64
  for (let y = arriba; y < 132; y++) {
    const dy = Math.max(0, arriba + r - y)
    const mitad = y < arriba + r ? Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy))) : r
    lz.rect(cx - mitad - 4, y, mitad * 2 + 8, 1, '#2b3550')
    lz.rect(cx - mitad, y, mitad * 2, 1, '#05070d')
  }
  for (let i = 0; i < 6; i++) lz.circulo(cx, 120, 50 - i * 8, '#0b1020', 0.5)
  lz.circulo(cx, 112, 10, C.queso, 0.08)
  lz.circulo(cx, 112, 4, C.queso, 0.25)
  // Pasarela y canal de agua
  lz.rect(0, 128, W, 6, '#2c3448')
  lz.rect(0, 128, W, 1, '#3b4560')
  lz.rect(0, 134, W, 46, '#0e2a33')
  for (let i = 0; i < 60; i++) lz.rect(Math.floor(rnd() * W), 136 + Math.floor(rnd() * 42), 2 + Math.floor(rnd() * 6), 1, rnd() > 0.6 ? '#2b6a7a' : '#174552')
  // Tuberías
  lz.rect(24, 40, 6, 84, '#355b45'); lz.rect(24, 40, 30, 6, '#355b45'); lz.rect(25, 40, 1, 84, '#4d7f5f')
  lz.rect(282, 60, 6, 64, '#355b45'); lz.rect(262, 60, 26, 6, '#355b45')
  for (let i = 0; i < 4; i++) lz.rect(27, 126 + i * 3, 1, 2, '#5aa1b3', 0.7)
  // Faroles
  for (const fx of [72, 248]) {
    lz.circulo(fx, 70, 22, C.queso, 0.06)
    lz.circulo(fx, 70, 12, C.queso, 0.08)
    lz.rect(fx - 1, 56, 2, 8, '#0b0f1a'); lz.rect(fx - 3, 64, 6, 8, '#0b0f1a'); lz.rect(fx - 2, 65, 4, 6, '#ffd36b')
  }
  // Cajas con queso
  for (const [x, y] of [[40, 116], [52, 116], [46, 104]]) {
    lz.rect(x, y, 12, 12, '#6b4a2b'); lz.rect(x, y, 12, 1, '#8a6238'); lz.rect(x + 5, y, 2, 12, '#553a21')
  }
  lz.rect(48, 98, 8, 6, C.queso); lz.rect(48, 98, 8, 1, C.quesoLuz); lz.pintar(50, 101, C.agujero); lz.pintar(53, 100, C.agujero)
  // Ratas con ojos brillantes
  for (const [x, derecha] of [[232, true], [262, false]]) {
    const filas = RATA_PEQUENA.map((f) => derecha ? f : [...f].reverse().join(''))
    lz.sprite(x, 113, filas, { d: '#0a0f1c', g: '#0a0f1c', s: '#0a0f1c', p: '#0a0f1c', k: C.queso })
  }
  return lz
}

function amanecer () {
  const W = 320
  const H = 180
  const lz = new Lienzo(W, H)
  const rnd = aleatorio(7)
  const cielo = ['#1e1836', '#2c1e45', '#3f2550', '#5a2d58', '#7a3858', '#9c4a55', '#c0614e', '#de8248', '#ee9f45', '#f6bb4a']
  cielo.forEach((c, i) => lz.rect(0, i * 12, W, 13, c))
  lz.rect(0, 120, W, H, '#f6bb4a')
  for (let i = 0; i < 25; i++) lz.pintar(Math.floor(rnd() * W), Math.floor(rnd() * 40), '#fff3d6', 0.3 + rnd() * 0.5)
  // Sol de queso saliendo
  lz.circulo(196, 104, 40, C.quesoLuz, 0.12)
  lz.circulo(196, 104, 30, C.quesoLuz, 0.15)
  lz.circulo(196, 104, 24, C.queso)
  lz.circulo(193, 101, 20, '#ffd76a')
  for (const [dx, dy, r] of [[-9, -6, 3], [7, -12, 2.4], [8, 4, 4], [-14, 6, 2]]) lz.circulo(196 + dx, 104 + dy, r, C.quesoSombra)
  const relieve = (min, max, paso, color, cambio) => {
    let y = min + rnd() * (max - min)
    for (let x = 0; x < W; x += paso) {
      y = Math.max(min, Math.min(max, y + (rnd() - 0.5) * cambio))
      lz.rect(x, Math.round(y), paso, H, color)
    }
  }
  relieve(96, 118, 4, '#6a3355', 12)
  relieve(112, 130, 4, '#3e2142', 10)
  // Colina y rata mirando el amanecer
  const rataX = 150
  const cima = 112
  for (let x = 100; x < 210; x += 4) {
    const d = Math.abs(x + 2 - rataX)
    lz.rect(x, cima + Math.floor(d * d / 50), 4, H, '#2a1530')
  }
  lz.sprite(rataX - 14, cima - 19, RATA_SILUETA, { '#': '#170b1c', q: '#170b1c' })
  for (const [cx, cy] of COLA) lz.pintar(rataX - 14 + cx, cima - 19 + cy, '#170b1c')
  let y = 150
  for (let x = 0; x < W; x += 8) {
    y = Math.max(144, Math.min(156, y + Math.round((rnd() - 0.5) * 6)))
    lz.rect(x, y, 8, H - y, '#1e1012')
    lz.rect(x, y, 8, 3, '#4a5e2a')
  }
  return lz
}

/* ---------- Noche de pesca: escena animada ---------- */
// Lo que se mueve (estrellas, nubes, reflejos, la barca, el corcho, el farol, las luciérnagas) lo
// dibuja fondo-animado.js en el launcher y en el panel, y FondoAnimado.java en el juego.
// Las posiciones de aquí tienen que coincidir con las de esos archivos.
// La barca va a la izquierda del centro: a la derecha están el personaje del jugador
// (en el launcher y en el menú del juego) y las novedades del launcher.
const PESCA = { lunaX: 200, lunaY: 40, radio: 18, orilla: 104, muelleX: 266, cubierta: 124, barca: [136, 78] }

/** Altura de la orilla de cañas (abajo a la izquierda) en la columna x. */
const orillaPesca = (x) => x < 140 ? 146 + Math.floor((x / 140) ** 2 * 34) : 999

function pesca () {
  const W = 320
  const H = 180
  const { lunaX, lunaY, radio, orilla, muelleX, cubierta } = PESCA
  const lz = new Lienzo(W, H)
  const rnd = aleatorio(23)

  const cielo = ['#0c1222', '#0f172b', '#121c34', '#16223e', '#1b2948', '#213052', '#28385c', '#304066', '#3a466e', '#454c74']
  cielo.forEach((c, i) => lz.rect(0, i * 11, W, 12, c))
  for (let i = 0; i < 70; i++) lz.pintar(Math.floor(rnd() * W), Math.floor(rnd() * 88), '#e9efff', 0.15 + rnd() * 0.3)

  // Luna de queso
  lz.circulo(lunaX, lunaY, radio + 12, C.queso, 0.04)
  lz.circulo(lunaX, lunaY, radio + 6, C.queso, 0.06)
  lz.circulo(lunaX, lunaY, radio, C.quesoMedio)
  lz.circulo(lunaX - 2, lunaY - 2, radio - 3, C.queso)
  lz.circulo(lunaX - 5, lunaY - 6, radio - 10, C.quesoLuz, 0.5)
  for (const [dx, dy, r] of [[-8, -4, 3], [6, -9, 2.2], [7, 5, 3.8], [-3, 8, 2.4], [-11, 6, 1.6], [11, -2, 1.5]]) {
    lz.circulo(lunaX + dx, lunaY + dy, r, C.agujero)
    lz.circulo(lunaX + dx + 0.6, lunaY + dy + 0.6, r * 0.65, '#a35f14')
  }

  // Montes y bosque al otro lado del lago (y su reflejo en el agua)
  const relieve = (min, max, paso, color, cambio) => {
    let y = min + rnd() * (max - min)
    for (let x = 0; x < W; x += paso) {
      y = Math.max(min, Math.min(max, y + (rnd() - 0.5) * cambio))
      lz.rect(x, Math.round(y), paso, orilla - Math.round(y), color)
    }
  }
  relieve(72, 92, 4, '#26335a', 12)
  relieve(90, 100, 3, '#1b2644', 6)
  const pinos = []
  for (let x = 2; x < W; x += 5 + Math.floor(rnd() * 9)) pinos.push([x, 8 + Math.floor(rnd() * 10)])
  for (const [px, alto] of pinos) {
    for (let j = 0; j < alto; j++) {
      const mitad = Math.floor(j / 2.6)
      lz.rect(px - mitad, orilla - alto + j, mitad * 2 + 1, 1, '#141c33')
    }
  }

  // Lago
  const agua = ['#232f55', '#1d284a', '#182242', '#141d3a', '#111933', '#0f162d']
  for (let y = orilla; y < H; y++) lz.rect(0, y, W, 1, agua[Math.min(agua.length - 1, Math.floor((y - orilla) / 12))])
  lz.rect(0, orilla, W, 1, '#0f1629')
  for (const [px, alto] of pinos) {
    for (let j = 0; j < Math.floor(alto * 0.6); j++) {
      const mitad = Math.floor((alto - j) / 2.6 * 0.8)
      lz.rect(px - mitad, orilla + 1 + j, mitad * 2 + 1, 1, '#141c33', 0.45)
    }
  }

  // Muelle de madera a la derecha, con sus postes reflejados
  for (const px of [270, 294, 316]) {
    lz.rect(px, cubierta + 4, 2, 12, '#2e1f12')
    lz.rect(px, cubierta + 16, 2, 8, '#2e1f12', 0.35)
  }
  lz.rect(muelleX, cubierta, W - muelleX, 4, '#5a3d24')
  lz.rect(muelleX, cubierta, W - muelleX, 1, '#7a5534')
  for (let x = muelleX + 5; x < W; x += 7) lz.rect(x, cubierta + 1, 1, 3, '#3b2716')
  lz.rect(muelleX, cubierta + 4, W - muelleX, 1, '#24180d')

  // Orilla con cañas y nenúfares
  for (const [nx, ny, r] of [[132, 158, 4], [150, 168, 5], [118, 172, 3], [168, 176, 4]]) {
    for (let j = -1; j <= 1; j++) lz.rect(nx - r + Math.abs(j), ny + j, (r - Math.abs(j)) * 2, 1, '#21402e')
    lz.pintar(nx + r - 2, ny, '#0f162d')
  }
  for (let x = 0; x < 140; x++) {
    const y = orillaPesca(x)
    lz.rect(x, y, 1, H - y, '#1b140f')
    lz.rect(x, y, 1, 2, '#2c4a2b')
  }
  for (let i = 0; i < 12; i++) {
    const cx = 4 + Math.floor(rnd() * 104)
    const base = orillaPesca(cx) + 1
    const alto = 14 + Math.floor(rnd() * 18)
    const lado = rnd() > 0.5 ? 1 : -1
    lz.rect(cx, base - alto, 1, alto, '#1f3a26')
    lz.rect(cx, base - alto + 2, 2, 5, '#4a3020')
    lz.pintar(cx, base - alto - 1, '#1f3a26')
    linea(lz, cx, base - 3, cx + lado * 4, base - 9 - Math.floor(rnd() * 5), '#244a2e')
  }
  return lz
}

/**
 * La barca con la rata pescando (64×40, se pinta en PESCA.barca y se mece con el agua):
 * caña hacia la izquierda y un farol colgado de un palo en la popa.
 */
function barcaPesca () {
  const lz = new Lienzo(64, 40)
  const silueta = '#0a0f1c'
  // Rata mirando al corcho (a la izquierda), con la cola por fuera de la barca
  const espejo = RATA_SILUETA.map((f) => [...f].reverse().join(''))
  lz.sprite(20, 14, espejo, { '#': silueta, q: silueta })
  for (const [cx, cy] of COLA) lz.pintar(20 + 25 - cx, 14 + cy - 4, silueta)
  // Caña
  linea(lz, 23, 25, 4, 6, '#6b4a2b')
  lz.pintar(4, 6, '#a37a4f')
  // Palo y farol en la popa
  lz.rect(47, 16, 1, 16, '#2e1f12')
  lz.rect(44, 16, 4, 1, '#2e1f12')
  lz.rect(44, 17, 1, 1, '#0b0f1a')
  lz.rect(43, 18, 4, 6, '#0b0f1a')
  lz.rect(44, 19, 2, 4, '#ffd36b')
  // Casco: borde claro, madera y quilla oscura
  const filas = [[16, 50], [17, 49], [18, 48], [19, 47], [21, 45]]
  filas.forEach(([x0, x1], j) => lz.rect(x0, 31 + j, x1 - x0, 1, j === 0 ? '#7a5534' : j === 4 ? '#2e1f12' : '#4a3020'))
  lz.rect(17, 32, 32, 1, '#5a3d24')
  for (const x of [24, 33, 42]) lz.rect(x, 32, 1, 3, '#3b2716')
  return lz
}

/**
 * La animación de «Noche de pesca» como datos: qué se mueve, dónde, de qué color y a qué ritmo.
 * La leen fondo-animado.js (launcher y panel) y MotorFondo.java (juego).
 */
function escenaPesca (capas) {
  const { lunaX, lunaY, orilla, muelleX, cubierta, barca } = PESCA
  const [bx, by] = barca
  const aguaBarca = by + 36
  const corcho = [128, 109]
  // Los destellos del agua no salen sobre la orilla, el muelle, la barca, el corcho ni el reflejo de la luna
  const orillaRects = []
  for (let x = 0; x < 140; x += 20) {
    const y = orillaPesca(x) - 2
    orillaRects.push([x, y, 20, 180 - y])
  }
  return {
    clave: 'pesca',
    ancho: 320,
    alto: 180,
    escala: 2,
    capas: Object.fromEntries(Object.entries(capas).map(([nombre, lz]) => [nombre, { ancho: lz.ancho, alto: lz.alto }])),
    vaivenes: { barca: { velocidad: 1.3, umbral: 0.2 } },
    elementos: [
      { tipo: 'estrellas', n: 28, semilla: 91, zona: [0, 2, 320, 84], evitar: [lunaX, lunaY, 30], grandes: 0.25, color: '#e9efff' },
      { tipo: 'fugaz', cada: 13, desfase: 4, dura: 1.1, zona: [90, 4, 200, 30], recorrido: [-64, 30], estela: 10, color: '#fff3d6' },
      { tipo: 'capa', nombre: 'nubes', x: 0, y: 6, desliza: 2.5 },
      { tipo: 'reflejo', x: lunaX, desde: orilla + 2, hasta: 160, ancho: 7, color: '#f6c445', brillo: '#fff0a8' },
      {
        tipo: 'destellos',
        n: 26,
        semilla: 37,
        zona: [0, orilla + 3, 320, 180 - orilla - 4],
        evitar: [...orillaRects, [muelleX - 2, 0, 320, cubierta + 23], [bx + 12, 0, 43, aguaBarca + 11], [corcho[0] - 13, 0, 27, corcho[1] + 10], [lunaX - 13, 0, 27, 180]],
        color: '#5d6b9a'
      },
      { tipo: 'sombra', x: bx + 18, y: aguaBarca, ancho: 30, filas: 5, color: '#0a0f1c', mece: 'barca' },
      {
        tipo: 'corcho',
        x: corcho[0],
        y: corcho[1],
        agua: corcho[1] + 3,
        cada: 19,
        desfase: 9,
        pica: 0.9,
        colores: ['#e0533f', '#f2f2f2'],
        sedal: { desde: [bx + 4, by + 6], mece: 'barca', color: '#c7cfe0', alfa: 0.4 },
        ondas: { cada: 3, radio: 9, aplasta: 0.3, color: '#8fa0cc', alfa: 0.45 }
      },
      { tipo: 'capa', nombre: 'barca', x: bx, y: by, mece: 'barca' },
      { tipo: 'farol', x: bx + 44, y: by + 19, mece: 'barca', color: '#f6c445', llama: ['#ffd36b', '#fff0a8'], radios: [16, 8], reflejo: [aguaBarca + 6, aguaBarca + 22] },
      { tipo: 'luciernagas', n: 12, semilla: 53, zona: [8, 112, 150, 52], color: '#f6c445', brillo: '#fff0a8' }
    ]
  }
}

/** Nubes que cruzan el cielo (se repiten en horizontal sin costuras). */
function nubesPesca () {
  const W = 320
  const lz = new Lienzo(W, 48)
  const rnd = aleatorio(5)
  // Cada nube son óvalos aplastados; se pintan sobre una máscara para que el conjunto sea
  // un poco transparente (la luna se adivina detrás) sin que se noten los solapes.
  const forma = new Map()
  const ovalo = (x, y, rx, ry, color) => {
    for (const dx of [-W, 0, W]) {
      for (let py = Math.floor(y - ry); py <= y + ry; py++) {
        for (let px = Math.floor(x + dx - rx); px <= x + dx + rx; px++) {
          if (px < 0 || px >= W || py < 0 || py >= 48) continue
          if (((px - x - dx + 0.5) / rx) ** 2 + ((py - y + 0.5) / ry) ** 2 <= 1) forma.set(`${px},${py}`, color)
        }
      }
    }
  }
  for (const [x, y, ancho] of [[30, 28, 50], [140, 16, 36], [226, 30, 60]]) {
    const bolas = []
    for (let i = 0; i < 7; i++) bolas.push([x + rnd() * ancho, y + (rnd() - 0.5) * 5, 5 + rnd() * 6])
    for (const [bx, by, r] of bolas) ovalo(bx, by + 2, r * 1.5, r * 0.75, '#1c2544')
    for (const [bx, by, r] of bolas) ovalo(bx, by, r * 1.4, r * 0.7, '#283359')
    for (const [bx, by, r] of bolas) ovalo(bx - 1, by - 2, r * 0.9, r * 0.4, '#36426c')
  }
  for (const [k, color] of forma) {
    const [px, py] = k.split(',').map(Number)
    lz.pintar(px, py, color, 0.86)
  }
  return lz
}

/** La rata que corre por la barra de carga. */
function rataCarga () {
  const lz = new Lienzo(16, 10)
  lz.sprite(1, 1, RATA_PEQUENA, { d: C.contorno, g: C.rata, s: C.rataSombra, p: C.rosa, k: C.negro })
  return lz
}

/** Texturas de los botones del juego: tierra (16x16) y franja de hierba (16x6). */
function botonTierra () {
  const lz = new Lienzo(16, 16)
  const rnd = aleatorio(5)
  lz.rect(0, 0, 16, 16, '#7a5538')
  for (let i = 0; i < 14; i++) lz.pintar(Math.floor(rnd() * 16), Math.floor(rnd() * 16), ['#8f6a49', '#5f412b', '#6b4a30', '#9b7552'][Math.floor(rnd() * 4)])
  return lz
}

function botonHierba () {
  const lz = new Lienzo(16, 6)
  lz.rect(0, 0, 16, 3, '#5ea83a')
  lz.rect(0, 0, 16, 1, '#79c14c')
  for (const [x, h] of [[0, 2], [2, 1], [5, 3], [7, 1], [10, 2], [13, 3], [15, 1]]) lz.rect(x, 3, 1, h, '#5ea83a')
  lz.pintar(3, 1, '#4d9030'); lz.pintar(9, 2, '#8ad35a'); lz.pintar(12, 1, '#4d9030')
  return lz
}

function texturaCarga (lg) {
  // El logo de carga mide 4:1 y la textura guarda la mitad izquierda arriba y la derecha abajo.
  const ancho = Math.max(lg.ancho, lg.alto * 4)
  const lienzo = new Lienzo(ancho + (ancho % 2), Math.ceil((ancho + (ancho % 2)) / 4))
  lienzo.pegar(lg, Math.floor((lienzo.ancho - lg.ancho) / 2), Math.floor((lienzo.alto - lg.alto) / 2))
  const mitad = lienzo.ancho / 2
  const tex = new Lienzo(mitad, mitad)
  tex.pegar(lienzo.region(0, 0, mitad, lienzo.alto), 0, 0)
  tex.pegar(lienzo.region(mitad, 0, mitad, lienzo.alto), 0, mitad / 2)
  return tex
}

const lg = logo()
const renderer = path.join(RAIZ, 'src', 'renderer', 'assets')
const recursosMod = path.join(RAIZ, 'mod', 'common', 'src', 'main', 'resources', 'assets', 'rataland')
const texturas = path.join(recursosMod, 'textures', 'gui')

lg.guardar(path.join(renderer, 'logo.png'), 5)
fondo({ lunaX: 182, lunaY: 58, rataX: 168 }).guardar(path.join(renderer, 'fondo.png'), 4)
icono().guardar(path.join(RAIZ, 'build', 'icon.png'), 8)

lg.guardar(path.join(texturas, 'logo.png'), 1)
fondo({ lunaX: 258, lunaY: 52, rataX: 244, semilla: 11 }).guardar(path.join(texturas, 'fondo.png'), 2)
texturaCarga(lg).guardar(path.join(texturas, 'carga.png'), 12)
icono().guardar(path.join(recursosMod, 'icon.png'), 4)

// Iconos de la ventana del juego y de la ventana del launcher
for (const escala of [1, 2, 4, 8]) {
  icono().guardar(path.join(recursosMod, 'icons', `icono_${32 * escala}.png`), escala)
}
icono().guardar(path.join(renderer, 'icono.png'), 8)

// Escenas de fondo (se eligen en el panel): launcher, mod y miniaturas del panel
const escenas = { cloacas: cloacas(), amanecer: amanecer() }
for (const [nombre, lz] of Object.entries(escenas)) {
  lz.guardar(path.join(renderer, `fondo-${nombre}.png`), 4)
  lz.guardar(path.join(texturas, `fondo_${nombre}.png`), 2)
  lz.guardar(path.join(RAIZ, 'docs', 'img', `fondo-${nombre}.png`), 2)
}
fondo({ lunaX: 182, lunaY: 58, rataX: 168 }).guardar(path.join(RAIZ, 'docs', 'img', 'fondo-noche.png'), 2)

// Noche de pesca: fondo fijo y capa de nubes; lo demás se anima en vivo
const capasPesca = { 'fondo-pesca': pesca(), 'fondo-pesca-nubes': nubesPesca(), 'fondo-pesca-barca': barcaPesca() }
for (const [nombre, lz] of Object.entries(capasPesca)) {
  lz.guardar(path.join(renderer, `${nombre}.png`), 2)
  lz.guardar(path.join(texturas, `${nombre.replace(/-/g, '_')}.png`), 2)
  lz.guardar(path.join(RAIZ, 'docs', 'img', `${nombre}.png`), 2)
}
// Datos de las escenas animadas: para el launcher y el panel (fondo-escenas.js) y para el juego (escenas/*.json)
const escenasAnimadas = { pesca: escenaPesca({ nubes: capasPesca['fondo-pesca-nubes'], barca: capasPesca['fondo-pesca-barca'] }) }
const datosEscenas = `// Lo genera tools/arte.js a partir de las mismas posiciones que el dibujo: no lo cambies a mano.
window.ESCENAS_FONDO = ${JSON.stringify(escenasAnimadas, null, 2)}
`
fs.writeFileSync(path.join(RAIZ, 'src', 'renderer', 'fondo-escenas.js'), datosEscenas)
fs.writeFileSync(path.join(RAIZ, 'docs', 'js', 'fondo-escenas.js'), datosEscenas)
fs.mkdirSync(path.join(recursosMod, 'escenas'), { recursive: true })
for (const [clave, escena] of Object.entries(escenasAnimadas)) {
  fs.writeFileSync(path.join(recursosMod, 'escenas', `${clave}.json`), JSON.stringify(escena, null, 2) + '\n')
}
// El motor es el mismo en el launcher y en el panel
fs.copyFileSync(path.join(RAIZ, 'src', 'renderer', 'fondo-animado.js'), path.join(RAIZ, 'docs', 'js', 'fondo-animado.js'))

// Barra de carga y botones del juego
rataCarga().guardar(path.join(texturas, 'rata.png'), 1)
botonTierra().guardar(path.join(texturas, 'boton_tierra.png'), 1)
botonHierba().guardar(path.join(texturas, 'boton_hierba.png'), 1)
