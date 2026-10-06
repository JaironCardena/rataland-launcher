#!/usr/bin/env node
// Genera los sonidos ambiente de los fondos (no son grabaciones: se sintetizan aquí, así que no hay
// derechos de nadie de por medio). Cada ambiente es un bucle sin cortes: los ruidos se filtran de forma
// circular y los sonidos sueltos que pasan del final siguen por el principio.
//
// Uso: node tools/sonidos.js   (escribe los .ogg del mod, del launcher y del panel)
const fs = require('fs')
const path = require('path')
const { createOggEncoder } = require('wasm-media-encoders')

const RAIZ = path.join(__dirname, '..')
const SR = 32000
const TAU = Math.PI * 2

function aleatorio (semilla) {
  let s = semilla
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

/** Una pista de `segundos`; lo que se suma pasado el final da la vuelta (para que el bucle no se note). */
class Pista {
  constructor (segundos) {
    this.n = Math.round(segundos * SR)
    this.d = new Float32Array(this.n)
  }

  sumar (t0, muestras, ganancia = 1) {
    const i0 = Math.round(t0 * SR)
    for (let i = 0; i < muestras.length; i++) this.d[(i0 + i) % this.n] += muestras[i] * ganancia
    return this
  }

  mezclar (otra, ganancia = 1) {
    for (let i = 0; i < this.n; i++) this.d[i] += otra[i] * ganancia
    return this
  }
}

/* ---------- Filtros circulares (dos pasadas: la segunda empieza con el estado del final) ---------- */

function ruido (n, rnd) {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = rnd() * 2 - 1
  return x
}

function biquad (x, tipo, f, q = 0.707, circular = true) {
  const w = TAU * f / SR
  const alfa = Math.sin(w) / (2 * q)
  const c = Math.cos(w)
  let b0, b1, b2
  if (tipo === 'bajos') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2 } else if (tipo === 'altos') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2 } else { b0 = alfa; b1 = 0; b2 = -alfa }
  const a0 = 1 + alfa
  const a1 = -2 * c
  const a2 = 1 - alfa
  const y = new Float32Array(x.length)
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  for (let pasada = circular ? 0 : 1; pasada < 2; pasada++) {
    for (let i = 0; i < x.length; i++) {
      const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v
      if (pasada === 1) y[i] = v
    }
  }
  return y
}

/** Eco de túnel: tres retardos con realimentación, también circulares. */
function eco (x, retardos) {
  const y = new Float32Array(x.length)
  for (const [seg, g] of retardos) {
    const d = Math.round(seg * SR)
    const c = Float32Array.from(x)
    for (let pasada = 0; pasada < 4; pasada++) {
      for (let i = 0; i < c.length; i++) c[i] = x[i] + g * c[(i - d + c.length) % c.length]
    }
    for (let i = 0; i < y.length; i++) y[i] += (c[i] - x[i]) / retardos.length
  }
  return biquad(y, 'bajos', 2500)
}

/** Multiplica por una envolvente que depende del tiempo (en segundos). */
function modular (x, fn) {
  const y = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) y[i] = x[i] * fn(i / SR)
  return y
}

/** Un sonido corto: fn(t) da la muestra en el instante t (segundos). */
function corto (segundos, fn) {
  const m = new Float32Array(Math.round(segundos * SR))
  for (let i = 0; i < m.length; i++) m[i] = fn(i / SR)
  return m
}

/** Tonos con frecuencia variable: sigue la fase para que no haya saltos. */
function tono (segundos, frecuencia, envolvente, armonico = 0) {
  let fase = 0
  return corto(segundos, (t) => {
    fase += TAU * frecuencia(t) / SR
    return (Math.sin(fase) + armonico * Math.sin(2 * fase)) * envolvente(t)
  })
}

/** Reparte sucesos a lo largo de la pista con un hueco aleatorio entre `min` y `max` segundos. */
function repartir (pista, rnd, min, max, desde = 0) {
  const tiempos = []
  for (let t = desde + rnd() * min; t < pista.n / SR; t += min + rnd() * (max - min)) tiempos.push(t)
  return tiempos
}

/* ---------- Ingredientes ---------- */

/** Un grillo: trenes de pulsos agudos cada `periodo` segundos (a veces se calla un momento). */
function grillo (pista, rnd, { f, pulsos, periodo, volumen, lejos = false }) {
  const pulso = 0.016
  const hueco = 0.012
  const chirrido = corto(pulsos * (pulso + hueco), (t) => {
    const p = Math.floor(t / (pulso + hueco))
    const tau = t - p * (pulso + hueco)
    if (tau > pulso) return 0
    const env = Math.sin(Math.PI * tau / pulso) ** 2 * (1 - 0.15 * p / pulsos)
    return (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t)) * env
  })
  const segundos = pista.n / SR
  const veces = Math.round(segundos / periodo)
  const capa = new Pista(segundos)
  const fase = rnd() * periodo
  for (let k = 0; k < veces; k++) {
    if (rnd() < 0.12) continue
    capa.sumar(fase + k * segundos / veces + rnd() * 0.03, chirrido, 0.85 + rnd() * 0.3)
  }
  pista.mezclar(lejos ? biquad(capa.d, 'bajos', 3200) : capa.d, volumen)
}

/** Agua que lame la orilla: olas a ritmo irregular, cada una con su fuerza y su chapoteo. */
function oleaje (pista, rnd, { min, max, volumen }) {
  const segundos = pista.n / SR
  // Envolvente de las olas: sube rápido y se retira despacio
  const olas = new Pista(segundos)
  const ola = corto(2.6, (t) => t < 0.45 ? t / 0.45 : Math.exp(-(t - 0.45) * 1.7))
  for (const t of repartir(olas, rnd, min, max)) olas.sumar(t, ola, 0.55 + rnd() * 0.45)
  let pico = 0
  for (const v of olas.d) pico = Math.max(pico, v)
  const env = olas.d.map((v) => v / pico)
  const fondo = biquad(biquad(ruido(pista.n, rnd), 'bajos', 420), 'bajos', 420)
  const chapoteo = biquad(biquad(ruido(pista.n, rnd), 'banda', 1300, 0.8), 'bajos', 2800)
  for (let i = 0; i < pista.n; i++) {
    pista.d[i] += fondo[i] * (0.5 + 0.5 * env[i]) * volumen * 2.2 + chapoteo[i] * env[i] ** 3 * volumen * 0.5
  }
}

/** Viento suave que sube y baja (periodos que dividen la duración). */
function viento (pista, rnd, { volumen, frecuencia = 500 }) {
  const segundos = pista.n / SR
  // Sin agudos: el viento tiene que sonar a aire, no a siseo
  const base = biquad(biquad(ruido(pista.n, rnd), 'banda', frecuencia, 0.5), 'bajos', 1200)
  const grave = biquad(ruido(pista.n, rnd), 'bajos', 260)
  const mod = (t) => 0.5 + 0.3 * Math.sin(TAU * t * 2 / segundos) + 0.2 * Math.sin(TAU * t * 5 / segundos + 1)
  pista.mezclar(modular(base, mod), volumen).mezclar(modular(grave, mod), volumen * 1.5)
}

/** Una gota que cae en agua: «plinc» que sube de tono y se apaga. */
function gota (f0, rnd) {
  const sube = 0.7 + rnd() * 0.4
  return tono(0.16, (t) => f0 * (1 + sube * (1 - Math.exp(-t / 0.012))), (t) => Math.min(1, t / 0.002) * Math.exp(-t / 0.045))
}

/** Pájaros: «tuit» que sube, trino rápido y «chip» corto. */
const tuit = (f) => tono(0.09, (t) => f + 1400 * t / 0.09, (t) => Math.sin(Math.PI * t / 0.09) ** 2)
const chip = (f) => tono(0.03, () => f, (t) => Math.sin(Math.PI * t / 0.03) ** 2)
function trino (f, notas) {
  const nota = 0.026
  return corto(notas * nota, (t) => {
    const k = Math.floor(t / nota)
    const tau = t - k * nota
    const fk = k % 2 ? f * 1.12 : f
    return Math.sin(TAU * fk * t) * Math.sin(Math.PI * Math.min(1, tau / (nota * 0.75))) ** 2 * (1 - 0.4 * k / notas)
  })
}

/** Búho lejano: dos «uuh» graves. */
function buho () {
  const uuh = (t, t0, f) => {
    const tau = t - t0
    if (tau < 0 || tau > 0.42) return 0
    const env = Math.min(1, tau / 0.05) * Math.min(1, (0.42 - tau) / 0.18)
    return Math.sin(TAU * (f - 30 * tau) * tau + 0.15 * Math.sin(TAU * 5 * tau)) * env
  }
  return biquad(corto(1.1, (t) => uuh(t, 0, 360) + 0.9 * uuh(t, 0.6, 330)), 'bajos', 900, 0.707, false)
}

/* ---------- Escenas ---------- */

function pesca () {
  const rnd = aleatorio(11)
  const pista = new Pista(24)
  oleaje(pista, rnd, { min: 2.2, max: 3.8, volumen: 0.5 })
  grillo(pista, rnd, { f: 4600, pulsos: 4, periodo: 0.62, volumen: 0.11 })
  grillo(pista, rnd, { f: 4150, pulsos: 3, periodo: 0.86, volumen: 0.07, lejos: true })
  grillo(pista, rnd, { f: 5100, pulsos: 5, periodo: 1.2, volumen: 0.04, lejos: true })
  return pista
}

function noche () {
  const rnd = aleatorio(23)
  const pista = new Pista(20)
  viento(pista, rnd, { volumen: 0.35 })
  grillo(pista, rnd, { f: 4400, pulsos: 3, periodo: 0.75, volumen: 0.09 })
  grillo(pista, rnd, { f: 4900, pulsos: 4, periodo: 1.05, volumen: 0.08, lejos: true })
  pista.sumar(6, buho(), 0.13)
  return pista
}

function cloacas () {
  const rnd = aleatorio(37)
  const pista = new Pista(24)
  // Corriente de agua al fondo del túnel
  const corriente = biquad(biquad(ruido(pista.n, rnd), 'bajos', 330), 'bajos', 330)
  const gorgoteo = biquad(ruido(pista.n, rnd), 'banda', 850, 0.7)
  pista.mezclar(modular(corriente, (t) => 0.8 + 0.2 * Math.sin(TAU * t * 4 / 24)), 1.1)
  pista.mezclar(modular(gorgoteo, (t) => 0.5 + 0.5 * Math.sin(TAU * t * 7 / 24 + 2) ** 2), 0.12)
  // Gotas desde tres tuberías, con eco de túnel
  const gotas = new Pista(24)
  for (const [f0, min, max, vol] of [[820, 1.1, 2.3, 0.5], [1080, 2.4, 4.0, 0.38], [640, 4.0, 7.0, 0.45]]) {
    for (const t of repartir(gotas, rnd, min, max)) gotas.sumar(t, gota(f0 * (0.97 + rnd() * 0.06), rnd), vol * (0.8 + rnd() * 0.4))
  }
  pista.mezclar(gotas.d, 1).mezclar(eco(gotas.d, [[0.083, 0.55], [0.121, 0.5], [0.173, 0.45]]), 0.9)
  return pista
}

function amanecer () {
  const rnd = aleatorio(41)
  const pista = new Pista(24)
  viento(pista, rnd, { volumen: 0.22, frecuencia: 650 })
  for (const t of repartir(pista, rnd, 2.6, 4.4)) {
    const f = 2500 + rnd() * 500
    const veces = 2 + Math.floor(rnd() * 2)
    for (let k = 0; k < veces; k++) pista.sumar(t + k * 0.14, tuit(f), 0.12)
  }
  for (const t of [4.8, 15.3]) pista.sumar(t, trino(3300 + rnd() * 300, 12), 0.09)
  for (const t of repartir(pista, rnd, 1.6, 3.4, 0.7)) {
    pista.sumar(t, chip(4100 + rnd() * 400), 0.07)
    if (rnd() < 0.5) pista.sumar(t + 0.11, chip(4300 + rnd() * 300), 0.06)
  }
  return pista
}

/** «Plop» cuando pica el pez en «Noche de pesca» (suena una vez, no en bucle). */
function plop () {
  const rnd = aleatorio(53)
  const pista = new Pista(0.7)
  pista.sumar(0, tono(0.3, (t) => 140 + 260 * Math.exp(-t / 0.025), (t) => Math.min(1, t / 0.002) * Math.exp(-t / 0.06)), 0.8)
  const salpica = biquad(corto(0.25, () => rnd() * 2 - 1), 'banda', 1800, 1, false)
  pista.sumar(0.004, modular(salpica, (t) => Math.exp(-t / 0.05)), 0.45)
  for (const [t, f] of [[0.12, 700], [0.2, 900], [0.31, 760]]) {
    pista.sumar(t, tono(0.05, (u) => f + 600 * u / 0.03, (u) => Math.exp(-u / 0.02)), 0.15)
  }
  // No es un bucle: que no vuelva al principio lo que suena al final
  pista.d.fill(0, Math.round(0.66 * SR))
  return pista
}

/* ---------- Guardar ---------- */

/** Iguala el volumen percibido (RMS) de los ambientes y evita que sature. */
function nivelar (d, rmsObjetivo) {
  let suma = 0
  let pico = 0
  for (const v of d) { suma += v * v; pico = Math.max(pico, Math.abs(v)) }
  const rms = Math.sqrt(suma / d.length)
  const g = Math.min(rmsObjetivo / rms, 0.9 / pico)
  return d.map((v) => v * g)
}

async function codificar (d) {
  const encoder = await createOggEncoder()
  encoder.configure({ channels: 1, sampleRate: SR, vbrQuality: 3 })
  const trozos = [encoder.encode([d]).slice(), encoder.finalize().slice()]
  return Buffer.concat(trozos.map((t) => Buffer.from(t)))
}

async function main () {
  const sonidos = {
    pesca: nivelar(pesca().d, 0.08),
    noche: nivelar(noche().d, 0.06),
    cloacas: nivelar(cloacas().d, 0.08),
    amanecer: nivelar(amanecer().d, 0.07),
    plop: nivelar(plop().d, 0.12)
  }
  const mod = path.join(RAIZ, 'mod', 'common', 'src', 'main', 'resources', 'assets', 'rataland')
  const destinos = [path.join(mod, 'sounds', 'fondo'), path.join(RAIZ, 'src', 'renderer', 'assets', 'sonidos'), path.join(RAIZ, 'docs', 'sonidos')]
  for (const dir of destinos) fs.mkdirSync(dir, { recursive: true })
  const lista = {}
  for (const [nombre, d] of Object.entries(sonidos)) {
    const ogg = await codificar(d)
    for (const dir of destinos) fs.writeFileSync(path.join(dir, `${nombre}.ogg`), ogg)
    // Los bucles largos se leen poco a poco (stream); el «plop» se carga entero
    lista[`fondo.${nombre}`] = { sounds: [{ name: `rataland:fondo/${nombre}`, stream: nombre !== 'plop' }] }
    console.log(`${nombre}.ogg  ${(d.length / SR).toFixed(1)} s  ${(ogg.length / 1024).toFixed(0)} KB`)
  }
  fs.writeFileSync(path.join(mod, 'sounds.json'), JSON.stringify(lista, null, 2) + '\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
