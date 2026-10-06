#!/usr/bin/env node
// Publica una versión nueva del launcher en GitHub Releases.
// Los launchers ya instalados la descargan solos y piden reiniciar.
//
// Uso:
//   npm version patch     (sube la versión, p. ej. 1.0.0 -> 1.0.1)
//   npm run release
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const raiz = path.join(__dirname, '..')
const { version } = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'))
const ejecutar = (cmd, args, opciones = {}) => execFileSync(cmd, args, { cwd: raiz, stdio: 'inherit', ...opciones })

// npx es un .cmd en Windows y necesita shell (sus argumentos no llevan espacios).
ejecutar('npx', ['electron-builder', '--win', '--publish', 'never'], { shell: process.platform === 'win32' })

const dist = path.join(raiz, 'dist')
const archivos = [`RataLand-Setup-${version}.exe`, `RataLand-Setup-${version}.exe.blockmap`, 'latest.yml']
  .map((f) => path.join(dist, f))
for (const f of archivos) {
  if (!fs.existsSync(f)) throw new Error(`No se generó ${f}`)
}

ejecutar('git', ['push', 'origin', 'HEAD', '--follow-tags'])
ejecutar('gh', ['release', 'create', `v${version}`, ...archivos,
  '--title', `RataLand ${version}`,
  '--notes', `Launcher de RataLand ${version}. Para instalarlo, descarga RataLand-Setup-${version}.exe.`])

console.log(`\nPublicada la versión ${version}. Los launchers instalados se actualizarán solos.`)
