#!/usr/bin/env node
// Los fondos animados se dibujan con dos motores: fondo-animado.js (launcher y panel) y
// MotorFondo.java (juego). Este script guarda lo que dibuja el de JavaScript en varios instantes;
// la prueba MotorFondoTest del mod comprueba que el de Java dibuja exactamente lo mismo.
//
// Uso:
//   node tools/comprobar-fondos.js            comprueba que el motor de JavaScript no ha cambiado
//   node tools/comprobar-fondos.js --guardar  lo guarda de nuevo (tras cambiar un motor o una escena;
//                                             después, "gradlew build" en mod/ prueba el de Java)
const fs = require('fs')
const path = require('path')
const motor = require('../src/renderer/fondo-animado.js')

const RAIZ = path.join(__dirname, '..')
const ESCENAS = path.join(RAIZ, 'mod', 'common', 'src', 'main', 'resources', 'assets', 'rataland', 'escenas')
const ESPERADO = path.join(RAIZ, 'mod', 'common', 'src', 'test', 'resources', 'fondos-esperado.json')
// Instantes variados: el principio, una estrella fugaz, un pez que pica, mucho rato después…
const TIEMPOS = [0, 0.37, 2.9, 5.2, 9.05, 9.5, 10.02, 12.3, 28.6, 30.7, 61.4, 123.456, 1000.25]
const TRAMOS = [[0, 30], [9.9, 10.1], [28, 29.5], [100, 200]]

function grabar (escena) {
  const m = motor.preparar(escena)
  const fotogramas = TIEMPOS.map((t) => {
    const ops = []
    motor.dibujar(m, {
      rect: (x, y, w, h, color, alfa) => ops.push([x, y, w, h, color.toLowerCase(), alfa]),
      capa: (nombre, x, y, w, h) => ops.push([nombre, x, y, w, h])
    }, t)
    return ops
  })
  const eventos = TRAMOS.map(([t0, t1]) => [t0, t1, motor.eventos(m, t0, t1)])
  return { tiempos: TIEMPOS, fotogramas, eventos }
}

const resultado = {}
for (const archivo of fs.readdirSync(ESCENAS).filter((f) => f.endsWith('.json')).sort()) {
  const escena = JSON.parse(fs.readFileSync(path.join(ESCENAS, archivo), 'utf8'))
  resultado[escena.clave] = grabar(escena)
}
const texto = JSON.stringify(resultado) + '\n'

if (process.argv.includes('--guardar')) {
  fs.mkdirSync(path.dirname(ESPERADO), { recursive: true })
  fs.writeFileSync(ESPERADO, texto)
  const ops = Object.values(resultado).reduce((n, r) => n + r.fotogramas.reduce((a, f) => a + f.length, 0), 0)
  console.log(`Guardado ${path.relative(RAIZ, ESPERADO)}: ${Object.keys(resultado).join(', ')} (${ops} trazos). Ahora compila el mod para probar el motor de Java.`)
} else {
  const antes = fs.existsSync(ESPERADO) ? fs.readFileSync(ESPERADO, 'utf8') : ''
  if (antes !== texto) {
    console.error('El motor de fondos de JavaScript o una escena han cambiado y el mod no lo sabe.')
    console.error('Ejecuta "node tools/comprobar-fondos.js --guardar" y compila el mod: su prueba dirá si el motor de Java dibuja lo mismo.')
    process.exit(1)
  }
  console.log('Fondos animados: el motor de JavaScript dibuja lo mismo que espera la prueba del mod.')
}
