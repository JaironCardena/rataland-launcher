#!/usr/bin/env node
// Genera los sonidos ambiente de los fondos. No son grabaciones: se sintetizan aquí, así que no hay
// derechos de nadie de por medio.
//
// Cada ambiente tiene dos partes, como en los juegos:
//   - una base continua de 60 s (agua, viento, corriente…) sin nada que llame la atención, que se
//     repite en bucle exacto: los ruidos se filtran de forma circular, así que el final empalma con
//     el principio muestra a muestra;
//   - sonidos sueltos (grillos, gotas, pájaros…) con varias versiones cada uno, que el launcher, el
//     panel y el juego tocan a ratos al azar, con volumen y tono variables: nunca suena igual.
// Qué suelto suena en cada fondo y cada cuánto está en AMBIENTES (abajo); se guarda junto a los sonidos.
//
// Uso: node tools/sonidos.js   (escribe los .ogg y los datos para el mod, el launcher y el panel)
const fs = require('fs')
const path = require('path')
const { createOggEncoder } = require('wasm-media-encoders')

const RAIZ = path.join(__dirname, '..')
const SR = 22050
const TAU = Math.PI * 2
const BASE = 60 // segundos de cada base

/** Qué suena en cada fondo: la base y los sueltos (cada cuánto, a qué volumen y con qué tono, al azar entre dos valores). */
const AMBIENTES = {
  pesca: {
    base: 'pesca',
    sueltos: [
      { grupo: 'grillo', cada: [0.7, 2.6], volumen: [0.25, 0.55], tono: [0.95, 1.05] },
      { grupo: 'chapoteo', cada: [5, 14], volumen: [0.3, 0.6], tono: [0.85, 1.15] }
    ]
  },
  noche: {
    base: 'noche',
    sueltos: [
      { grupo: 'grillo', cada: [1.4, 3.8], volumen: [0.2, 0.45], tono: [0.95, 1.05] },
      { grupo: 'hojas', cada: [9, 22], volumen: [0.2, 0.4], tono: [0.9, 1.1] },
      { grupo: 'buho', cada: [25, 55], volumen: [0.35, 0.55], tono: [0.95, 1.05] }
    ]
  },
  cloacas: {
    base: 'cloacas',
    sueltos: [
      { grupo: 'gota', cada: [0.6, 2.4], volumen: [0.35, 0.8], tono: [0.9, 1.12] },
      { grupo: 'rata', cada: [16, 38], volumen: [0.25, 0.45], tono: [0.9, 1.15] }
    ]
  },
  amanecer: {
    base: 'amanecer',
    sueltos: [
      { grupo: 'pajaro', cada: [1.3, 4.5], volumen: [0.3, 0.65], tono: [0.92, 1.08] }
    ]
  }
}

function aleatorio (semilla) {
  let s = semilla
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  // Con semillas pequeñas los primeros números salen casi 0: se tiran
  for (let i = 0; i < 4; i++) rnd()
  return rnd
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

/* ---------- Filtros (circulares para las bases: dos pasadas, la segunda empieza con el estado del final) ---------- */

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

/** Reverberación sencilla (retardos con realimentación). En las bases da la vuelta; en los sueltos añade la cola. */
function eco (x, retardos, { circular = true, cola = 0, brillo = 2500 } = {}) {
  const n = x.length + (circular ? 0 : Math.round(cola * SR))
  const entrada = new Float32Array(n)
  entrada.set(x)
  const y = new Float32Array(n)
  for (const [seg, g] of retardos) {
    const d = Math.round(seg * SR)
    const c = Float32Array.from(entrada)
    for (let pasada = 0; pasada < (circular ? 4 : 1); pasada++) {
      for (let i = 0; i < n; i++) {
        const j = i - d
        if (circular) c[i] = entrada[i] + g * c[(j + n) % n]
        else if (j >= 0) c[i] = entrada[i] + g * c[j]
      }
    }
    for (let i = 0; i < n; i++) y[i] += (c[i] - entrada[i]) / retardos.length
  }
  return biquad(y, 'bajos', brillo, 0.707, circular)
}

const SALA_CLOACA = [[0.083, 0.62], [0.121, 0.58], [0.173, 0.55], [0.229, 0.5]]
const AIRE_LIBRE = [[0.031, 0.3], [0.047, 0.25], [0.071, 0.2]]

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

/** Tono con frecuencia variable (sigue la fase para que no haya saltos). */
function tono (segundos, frecuencia, envolvente, armonico = 0) {
  let fase = 0
  return corto(segundos, (t) => {
    fase += TAU * frecuencia(t) / SR
    return (Math.sin(fase) + armonico * Math.sin(2 * fase)) * envolvente(t)
  })
}

/** Suma `b` dentro de `a` a partir del segundo t0 (sin dar la vuelta). */
function poner (a, t0, b, g = 1) {
  const i0 = Math.round(t0 * SR)
  for (let i = 0; i < b.length && i0 + i < a.length; i++) a[i0 + i] += b[i] * g
  return a
}

/** Entrada y salida suaves, para que un suelto no haga clic al empezar ni al acabar. */
function suavizar (x, entrada = 0.006, salida = 0.05) {
  const ne = Math.round(entrada * SR)
  const ns = Math.round(salida * SR)
  for (let i = 0; i < ne && i < x.length; i++) x[i] *= i / ne
  for (let i = 0; i < ns && i < x.length; i++) x[x.length - 1 - i] *= i / ns
  return x
}

function repartir (pista, rnd, min, max) {
  const tiempos = []
  for (let t = rnd() * min; t < pista.n / SR; t += min + rnd() * (max - min)) tiempos.push(t)
  return tiempos
}

/* ---------- Ingredientes ---------- */

/** Un chirrido de grillo: unos pocos pulsos agudos muy seguidos. */
function chirrido (f, pulsos, rnd) {
  const pulso = 0.014 + rnd() * 0.004
  const hueco = 0.010 + rnd() * 0.004
  return corto(pulsos * (pulso + hueco), (t) => {
    const p = Math.floor(t / (pulso + hueco))
    const tau = t - p * (pulso + hueco)
    if (tau > pulso) return 0
    const env = Math.sin(Math.PI * tau / pulso) ** 2 * (1 - 0.12 * p / pulsos)
    const fp = f * (1.012 - 0.024 * tau / pulso)
    return (Math.sin(TAU * fp * t) + 0.22 * Math.sin(TAU * 2 * fp * t)) * env
  })
}

/** Coro de grillos lejanos para las bases: muchos chirridos flojitos, apagados por la distancia. */
function coroGrillos (pista, rnd, { porSegundo, volumen }) {
  const capa = new Pista(pista.n / SR)
  const total = Math.round(porSegundo * pista.n / SR)
  for (let i = 0; i < total; i++) {
    capa.sumar(rnd() * pista.n / SR, chirrido(3800 + rnd() * 1600, 3 + Math.floor(rnd() * 2), rnd), 0.1 + rnd() * 0.3)
  }
  pista.mezclar(biquad(biquad(capa.d, 'bajos', 3400), 'bajos', 3400), volumen)
}

/** Agua que lame la orilla: olas a ritmo irregular, cada una con su fuerza. */
function oleaje (pista, rnd, volumen) {
  const olas = new Pista(pista.n / SR)
  const ola = corto(3, (t) => t < 0.6 ? (1 - Math.cos(Math.PI * t / 0.6)) / 2 : Math.exp(-(t - 0.6) * 1.4))
  for (const t of repartir(olas, rnd, 2.4, 4.4)) olas.sumar(t, ola, 0.5 + rnd() * 0.5)
  let pico = 0
  for (const v of olas.d) pico = Math.max(pico, v)
  const fondo = biquad(biquad(ruido(pista.n, rnd), 'bajos', 380), 'bajos', 380)
  const roce = biquad(biquad(ruido(pista.n, rnd), 'banda', 1100, 0.7), 'bajos', 2200)
  const grave = biquad(ruido(pista.n, rnd), 'bajos', 110)
  for (let i = 0; i < pista.n; i++) {
    const e = olas.d[i] / pico
    pista.d[i] += (fondo[i] * (0.45 + 0.55 * e) * 2.2 + roce[i] * e * e * 0.35 + grave[i] * 1.2) * volumen
  }
}

/** Viento suave que sube y baja despacio (periodos que dividen la duración, para que empalme). */
function viento (pista, rnd, volumen, frecuencia = 450) {
  const s = pista.n / SR
  const base = biquad(biquad(ruido(pista.n, rnd), 'banda', frecuencia, 0.5), 'bajos', 1100)
  const grave = biquad(ruido(pista.n, rnd), 'bajos', 220)
  const f1 = rnd() * TAU
  const f2 = rnd() * TAU
  const mod = (t) => 0.5 + 0.28 * Math.sin(TAU * t * 3 / s + f1) + 0.22 * Math.sin(TAU * t * 7 / s + f2)
  pista.mezclar(modular(base, mod), volumen).mezclar(modular(grave, mod), volumen * 1.4)
}

/* ---------- Bases (60 s, en bucle) ---------- */

function basePesca () {
  const rnd = aleatorio(11)
  const p = new Pista(BASE)
  oleaje(p, rnd, 0.5)
  viento(p, rnd, 0.06)
  coroGrillos(p, rnd, { porSegundo: 7, volumen: 0.035 })
  return p.d
}

function baseNoche () {
  const rnd = aleatorio(23)
  const p = new Pista(BASE)
  viento(p, rnd, 0.32)
  coroGrillos(p, rnd, { porSegundo: 4, volumen: 0.03 })
  return p.d
}

function baseCloacas () {
  const rnd = aleatorio(37)
  const p = new Pista(BASE)
  const corriente = biquad(biquad(ruido(p.n, rnd), 'bajos', 320), 'bajos', 320)
  const gorgoteo = biquad(ruido(p.n, rnd), 'banda', 800, 0.8)
  const retumbo = biquad(biquad(ruido(p.n, rnd), 'bajos', 80), 'bajos', 80)
  p.mezclar(modular(corriente, (t) => 0.85 + 0.15 * Math.sin(TAU * t * 5 / BASE)), 1.1)
  p.mezclar(modular(gorgoteo, (t) => 0.4 + 0.6 * Math.sin(TAU * t * 11 / BASE + 2) ** 2), 0.1)
  p.mezclar(retumbo, 1.6)
  // Goteo lejano, tan lavado por el eco que no se distingue ninguna gota
  const lejos = new Pista(BASE)
  for (const t of repartir(lejos, rnd, 0.3, 1.2)) lejos.sumar(t, gota(500 + rnd() * 700, rnd), 0.3 + rnd() * 0.4)
  p.mezclar(biquad(eco(lejos.d, SALA_CLOACA), 'bajos', 1400), 0.25)
  return p.d
}

function baseAmanecer () {
  const rnd = aleatorio(41)
  const p = new Pista(BASE)
  viento(p, rnd, 0.2, 600)
  // Pajarillos a lo lejos: piaditos cortos y flojos
  const lejos = new Pista(BASE)
  for (let i = 0; i < BASE * 1.6; i++) {
    const f = 3000 + rnd() * 2000
    lejos.sumar(rnd() * BASE, tono(0.04 + rnd() * 0.03, (t) => f + 900 * t / 0.05, (t) => Math.sin(Math.PI * t / 0.07) ** 2), 0.2 + rnd() * 0.5)
  }
  p.mezclar(biquad(lejos.d, 'bajos', 4200), 0.06)
  return p.d
}

/* ---------- Sueltos (varias versiones de cada uno) ---------- */

/** Un grillo cerca: chirría a su ritmo unos segundos y se calla. */
function grillo (f, semilla) {
  const rnd = aleatorio(semilla)
  const dur = 2.6 + rnd() * 1.2
  const x = new Float32Array(Math.round(dur * SR))
  const cadencia = 0.36 + rnd() * 0.2
  for (let t = 0.05 + rnd() * 0.1; t < dur - 0.25; t += cadencia * (0.9 + rnd() * 0.2)) {
    poner(x, t, chirrido(f, 3 + Math.floor(rnd() * 3), rnd), 0.7 + rnd() * 0.3)
  }
  // Entra y se va poco a poco, para mezclarse con el resto
  return modular(biquad(x, 'bajos', 7000, 0.707, false), (t) => Math.min(1, t / 0.4, (dur - t) / 0.6))
}

function chapoteo (tipo, semilla) {
  const rnd = aleatorio(semilla)
  if (tipo === 0) {
    // Ola pequeña que choca con una piedra
    const golpe = biquad(corto(0.5, () => rnd() * 2 - 1), 'banda', 900, 0.9, false)
    const sordo = biquad(corto(0.5, () => rnd() * 2 - 1), 'bajos', 300, 0.707, false)
    return modular(golpe, (t) => Math.min(1, t / 0.008) * Math.exp(-t / 0.09)).map((v, i) => v + sordo[i] * Math.exp(-i / SR / 0.06) * 0.8)
  }
  // Gotitas que caen al agua
  const x = new Float32Array(Math.round(0.6 * SR))
  for (const [t, f] of [[0, 1200], [0.09 + rnd() * 0.05, 1600], [0.22 + rnd() * 0.08, 1350]]) {
    poner(x, t, tono(0.12, (u) => f * (1 + 0.8 * (1 - Math.exp(-u / 0.012))), (u) => Math.min(1, u / 0.002) * Math.exp(-u / 0.035)), 0.6 + rnd() * 0.4)
  }
  return x
}

/** Una gota en la cloaca: «plinc» que sube de tono. */
function gota (f0, rnd) {
  const sube = 0.7 + rnd() * 0.4
  return tono(0.16, (t) => f0 * (1 + sube * (1 - Math.exp(-t / 0.012))), (t) => Math.min(1, t / 0.002) * Math.exp(-t / 0.045))
}

function gotaConEco (f0, semilla) {
  const rnd = aleatorio(semilla)
  const seca = gota(f0, rnd)
  const mojada = eco(seca, SALA_CLOACA, { circular: false, cola: 1.6, brillo: 2200 })
  for (let i = 0; i < seca.length; i++) mojada[i] += seca[i]
  return mojada
}

/** Una rata a lo lejos en las cloacas: dos o tres chillidos con eco. */
function rata (semilla) {
  const rnd = aleatorio(semilla)
  const x = new Float32Array(Math.round(0.8 * SR))
  const veces = 2 + Math.floor(rnd() * 2)
  for (let k = 0; k < veces; k++) {
    const d = 0.05 + rnd() * 0.04
    const f = 3600 + rnd() * 900
    poner(x, k * (0.13 + rnd() * 0.06), tono(d, (t) => f + 1500 * Math.sin(Math.PI * t / d) + 180 * Math.sin(TAU * 45 * t), (t) => Math.sin(Math.PI * t / d) ** 2, 0.15), 0.8 + rnd() * 0.2)
  }
  const mojada = eco(biquad(x, 'bajos', 6500, 0.707, false), SALA_CLOACA, { circular: false, cola: 1.4, brillo: 3000 })
  for (let i = 0; i < x.length; i++) mojada[i] += x[i] * 0.7
  return mojada
}

/** Búho lejano: «uuh… uuh» o «u-uh, uuuh». */
function buho (tipo) {
  const notas = tipo === 0 ? [[0, 0.42, 360], [0.62, 0.42, 335]] : [[0, 0.18, 350], [0.22, 0.3, 370], [0.75, 0.6, 330]]
  const x = corto(1.6, (t) => {
    let v = 0
    for (const [t0, d, f] of notas) {
      const tau = t - t0
      if (tau < 0 || tau > d) continue
      const env = Math.min(1, tau / 0.05) * Math.min(1, (d - tau) / 0.16)
      v += (Math.sin(TAU * (f - 25 * tau) * tau + 0.12 * Math.sin(TAU * 5 * tau)) + 0.12 * Math.sin(2 * TAU * f * tau)) * env
    }
    return v
  })
  const suave = biquad(x, 'bajos', 900, 0.707, false)
  const lejos = eco(suave, AIRE_LIBRE, { circular: false, cola: 0.8, brillo: 1200 })
  for (let i = 0; i < suave.length; i++) lejos[i] += suave[i]
  return lejos
}

/** Hojas que se mueven con una ráfaga. */
function hojas (semilla) {
  const rnd = aleatorio(semilla)
  const dur = 0.9 + rnd() * 0.6
  const granos = new Float32Array(Math.round(dur * SR))
  for (let i = 0; i < dur * 140; i++) {
    const t = rnd() * dur
    const d = 0.004 + rnd() * 0.012
    poner(granos, t, corto(d, (u) => (rnd() * 2 - 1) * Math.sin(Math.PI * u / d)), 0.3 + rnd() * 0.7)
  }
  const filtrado = biquad(biquad(granos, 'banda', 2600, 0.6, false), 'bajos', 5000, 0.707, false)
  return modular(filtrado, (t) => Math.sin(Math.PI * t / dur) ** 1.5)
}

/** Pájaros: cuatro cantos distintos. */
function pajaro (tipo, semilla) {
  const rnd = aleatorio(semilla)
  const x = new Float32Array(Math.round(1.6 * SR))
  if (tipo === 0) {
    // «tuit, tuit, tuit» que sube
    const f = 2500 + rnd() * 400
    for (let k = 0; k < 3; k++) poner(x, k * 0.15, tono(0.085, (t) => f + 1300 * t / 0.085, (t) => Math.sin(Math.PI * t / 0.085) ** 2, 0.1), 1 - k * 0.15)
  } else if (tipo === 1) {
    // Trino rápido
    const f = 3200 + rnd() * 300
    const nota = 0.026
    poner(x, 0, corto(14 * nota, (t) => {
      const k = Math.floor(t / nota)
      const tau = t - k * nota
      return Math.sin(TAU * (k % 2 ? f * 1.12 : f) * t) * Math.sin(Math.PI * Math.min(1, tau / (nota * 0.75))) ** 2 * (1 - 0.45 * k / 14)
    }))
  } else if (tipo === 2) {
    // Gorjeo que sube y baja con vibrato
    const d = 0.65
    poner(x, 0, tono(d, (t) => 2900 + 700 * Math.sin(Math.PI * t / d) + 260 * Math.sin(TAU * 17 * t), (t) => Math.sin(Math.PI * t / d) ** 1.5 * (0.7 + 0.3 * Math.sin(TAU * 9 * t))))
  } else {
    // «chip-chip, tiuu»
    poner(x, 0, tono(0.03, () => 4200, (t) => Math.sin(Math.PI * t / 0.03) ** 2))
    poner(x, 0.1, tono(0.03, () => 4400, (t) => Math.sin(Math.PI * t / 0.03) ** 2))
    poner(x, 0.24, tono(0.16, (t) => 4000 - 1300 * t / 0.16, (t) => Math.sin(Math.PI * t / 0.16) ** 2))
  }
  const mojada = eco(x, AIRE_LIBRE, { circular: false, cola: 0.3, brillo: 5000 })
  for (let i = 0; i < x.length; i++) mojada[i] += x[i]
  return mojada
}

/** «Plop» cuando pica el pez en «Noche de pesca» (lo dispara la animación del corcho). */
function plop () {
  const rnd = aleatorio(53)
  const x = new Float32Array(Math.round(0.7 * SR))
  poner(x, 0, tono(0.3, (t) => 140 + 260 * Math.exp(-t / 0.025), (t) => Math.min(1, t / 0.002) * Math.exp(-t / 0.06)), 0.8)
  const salpica = biquad(corto(0.25, () => rnd() * 2 - 1), 'banda', 1800, 1, false)
  poner(x, 0.004, modular(salpica, (t) => Math.exp(-t / 0.05)), 0.45)
  for (const [t, f] of [[0.12, 700], [0.2, 900], [0.31, 760]]) {
    poner(x, t, tono(0.05, (u) => f + 600 * u / 0.03, (u) => Math.exp(-u / 0.02)), 0.15)
  }
  return x
}

/* ---------- Guardar ---------- */

function medir (d) {
  let suma = 0
  let pico = 0
  for (const v of d) { suma += v * v; pico = Math.max(pico, Math.abs(v)) }
  return { rms: Math.sqrt(suma / d.length), pico }
}

/** Las bases, a un volumen parecido (RMS); los sueltos, con el pico a la misma altura. */
const nivelarBase = (d, rms) => { const m = medir(d); const g = Math.min(rms / m.rms, 0.9 / m.pico); return d.map((v) => v * g) }
const nivelarSuelto = (d, pico = 0.8) => { const g = pico / medir(d).pico; return suavizar(d.map((v) => v * g)) }

async function codificar (d, calidad) {
  const encoder = await createOggEncoder()
  encoder.configure({ channels: 1, sampleRate: SR, vbrQuality: calidad })
  const trozos = [encoder.encode([d]).slice(), encoder.finalize().slice()]
  return Buffer.concat(trozos.map((t) => Buffer.from(t)))
}

async function main () {
  const bases = {
    pesca: nivelarBase(basePesca(), 0.07),
    noche: nivelarBase(baseNoche(), 0.055),
    cloacas: nivelarBase(baseCloacas(), 0.07),
    amanecer: nivelarBase(baseAmanecer(), 0.06)
  }
  const grupos = {
    grillo: [grillo(4300, 3), grillo(4750, 5), grillo(5150, 7)],
    chapoteo: [chapoteo(0, 9), chapoteo(1, 13)],
    hojas: [hojas(17), hojas(19)],
    buho: [buho(0), buho(1)],
    gota: [650, 780, 900, 1050, 1250].map((f, i) => gotaConEco(f, 29 + i)),
    rata: [rata(43), rata(47)],
    pajaro: [0, 1, 2, 3].map((tipo) => pajaro(tipo, 59 + tipo))
  }

  const mod = path.join(RAIZ, 'mod', 'common', 'src', 'main', 'resources', 'assets', 'rataland')
  const destinos = [path.join(mod, 'sounds', 'fondo'), path.join(RAIZ, 'src', 'renderer', 'assets', 'sonidos'), path.join(RAIZ, 'docs', 'sonidos')]
  for (const dir of destinos) {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
  }
  const archivos = []
  const guardar = async (nombre, d, calidad) => {
    const ogg = await codificar(d, calidad)
    for (const dir of destinos) fs.writeFileSync(path.join(dir, `${nombre}.ogg`), ogg)
    archivos.push(`${nombre}.ogg ${(d.length / SR).toFixed(1)} s ${(ogg.length / 1024).toFixed(0)} KB`)
  }

  // Sonidos del juego: la base y cada grupo de sueltos (el juego elige una versión al azar).
  // Todo se carga entero en memoria: así la base se repite sin el pequeño corte de los sonidos leídos poco a poco.
  const lista = {}
  for (const [escena, d] of Object.entries(bases)) {
    await guardar(escena, d, 1)
    lista[`fondo.${escena}`] = { sounds: [{ name: `rataland:fondo/${escena}` }] }
  }
  for (const [grupo, versiones] of Object.entries(grupos)) {
    lista[`fondo.${grupo}`] = { sounds: [] }
    for (let i = 0; i < versiones.length; i++) {
      await guardar(`${grupo}-${i + 1}`, nivelarSuelto(versiones[i]), 2)
      lista[`fondo.${grupo}`].sounds.push({ name: `rataland:fondo/${grupo}-${i + 1}` })
    }
  }
  await guardar('plop', nivelarSuelto(plop(), 0.85), 2)
  lista['fondo.plop'] = { sounds: [{ name: 'rataland:fondo/plop' }] }
  fs.writeFileSync(path.join(mod, 'sounds.json'), JSON.stringify(lista, null, 2) + '\n')

  // Qué suena en cada fondo: para el juego (JSON) y para el launcher y el panel (JS)
  const datos = { grupos: Object.fromEntries(Object.entries(grupos).map(([g, v]) => [g, v.length])), escenas: AMBIENTES }
  fs.writeFileSync(path.join(mod, 'ambientes.json'), JSON.stringify(datos, null, 2) + '\n')
  const js = `// Lo genera tools/sonidos.js: no lo cambies a mano.\nwindow.AMBIENTES = ${JSON.stringify(datos, null, 2)}\n`
  fs.writeFileSync(path.join(RAIZ, 'src', 'renderer', 'fondo-ambientes.js'), js)
  fs.writeFileSync(path.join(RAIZ, 'docs', 'js', 'fondo-ambientes.js'), js)
  // El reproductor es el mismo en el launcher y en el panel
  fs.copyFileSync(path.join(RAIZ, 'src', 'renderer', 'ambiente.js'), path.join(RAIZ, 'docs', 'js', 'ambiente.js'))

  console.log(archivos.join('\n'))
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
module.exports = { basePesca, baseNoche, baseCloacas, baseAmanecer, grillo, chapoteo, gotaConEco, rata, buho, hojas, pajaro, plop, biquad, medir, SR }
