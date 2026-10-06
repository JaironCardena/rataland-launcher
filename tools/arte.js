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
const texturas = path.join(RAIZ, 'mod', 'src', 'main', 'resources', 'assets', 'rataland', 'textures', 'gui')

lg.guardar(path.join(renderer, 'logo.png'), 5)
fondo({ lunaX: 182, lunaY: 58, rataX: 168 }).guardar(path.join(renderer, 'fondo.png'), 4)
icono().guardar(path.join(RAIZ, 'build', 'icon.png'), 8)

lg.guardar(path.join(texturas, 'logo.png'), 1)
fondo({ lunaX: 258, lunaY: 52, rataX: 244, semilla: 11 }).guardar(path.join(texturas, 'fondo.png'), 2)
texturaCarga(lg).guardar(path.join(texturas, 'carga.png'), 12)
icono().guardar(path.join(RAIZ, 'mod', 'src', 'main', 'resources', 'assets', 'rataland', 'icon.png'), 4)

// Iconos de la ventana del juego y de la ventana del launcher
for (const escala of [1, 2, 4, 8]) {
  icono().guardar(path.join(RAIZ, 'mod', 'src', 'main', 'resources', 'assets', 'rataland', 'icons', `icono_${32 * escala}.png`), escala)
}
icono().guardar(path.join(renderer, 'icono.png'), 8)
