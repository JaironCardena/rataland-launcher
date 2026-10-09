'use strict'
// Tu skin en 3D, con CSS: cada parte del cuerpo es una caja de seis caras recortadas de la skin
// (cabeza, cuerpo, brazos y piernas) y encima otra un poco más grande con la capa exterior (gorro,
// chaqueta, mangas y pantalón). Se gira arrastrando con el ratón y, quieta, se mueve un poco sola.
;(function () {
  // Dónde está cada parte en la skin de 64×64: base y capa exterior. En las skins antiguas (64×32)
  // no hay brazo ni pierna izquierdos (se usan los derechos reflejados) ni más capa que el gorro.
  const PARTES = [
    { nombre: 'cabeza', uv: [0, 0], capa: [32, 0], caja: [8, 8, 8], giro: [0, 8], centro: [0, -4], crece: 1 },
    { nombre: 'cuerpo', uv: [16, 16], capa: [16, 32], caja: [8, 12, 4], giro: [0, 8], centro: [0, 6], crece: 0.5 },
    { nombre: 'brazoDer', uv: [40, 16], capa: [40, 32], caja: [4, 12, 4], giro: [-6, 10], centro: [0, 4], crece: 0.5, brazo: true },
    { nombre: 'brazoIzq', uv: [32, 48], capa: [48, 48], caja: [4, 12, 4], giro: [6, 10], centro: [0, 4], crece: 0.5, brazo: true, antigua: 'brazoDer' },
    { nombre: 'piernaDer', uv: [0, 16], capa: [0, 32], caja: [4, 12, 4], giro: [-2, 20], centro: [0, 6], crece: 0.5 },
    { nombre: 'piernaIzq', uv: [16, 48], capa: [0, 48], caja: [4, 12, 4], giro: [2, 20], centro: [0, 6], crece: 0.5, antigua: 'piernaDer' }
  ]
  // Luz fija, como en el inventario de Minecraft: de frente y desde arriba
  const LUZ = { delante: 1, detras: 0.72, der: 0.84, izq: 0.84, arriba: 1.12, abajo: 0.6 }

  /** Rectángulos [u, v, ancho, alto] de las seis caras de una caja que empieza en (u, v). */
  function caras ([u, v], [w, h, d]) {
    return {
      arriba: [u + d, v, w, d],
      abajo: [u + d + w, v, w, d],
      der: [u, v + d, d, h],
      delante: [u + d, v + d, w, h],
      izq: [u + d + w, v + d, d, h],
      detras: [u + d + w + d, v + d, w, h]
    }
  }

  /** Cómo se coloca cada cara alrededor del centro de la caja (en píxeles de skin). */
  function colocar (cara, [w, h, d]) {
    switch (cara) {
      case 'delante': return `translateZ(${d / 2}px)`
      case 'detras': return `rotateY(180deg) translateZ(${d / 2}px)`
      case 'der': return `rotateY(-90deg) translateZ(${w / 2}px)`
      case 'izq': return `rotateY(90deg) translateZ(${w / 2}px)`
      case 'arriba': return `rotateX(90deg) translateZ(${h / 2}px)`
      default: return `rotateX(-90deg) translateZ(${h / 2}px)`
    }
  }

  const div = (clase) => {
    const d = document.createElement('div')
    d.className = clase
    return d
  }

  /**
   * Monta el muñeco en `contenedor` (con `escala` píxeles de pantalla por píxel de skin), girado `angulo` grados.
   * Devuelve { poner(img, delgado, sinGorro) } para cambiar la skin.
   */
  function montar (contenedor, { escala = 6, angulo: anguloInicial = -24 } = {}) {
    const s = escala
    contenedor.classList.add('skin3d')
    const modelo = div('skin3d__modelo')
    contenedor.replaceChildren(modelo)
    const piezas = {}
    for (const parte of PARTES) {
      const pieza = div('skin3d__parte')
      modelo.append(pieza)
      piezas[parte.nombre] = { parte, pieza }
    }

    let skin = null
    function construir () {
      const { src, alto, delgado, sinGorro } = skin
      const antigua = alto === 32
      for (const { parte, pieza } of Object.values(piezas)) {
        const ancho = parte.brazo && delgado ? 3 : parte.caja[0]
        const caja = [ancho, parte.caja[1], parte.caja[2]]
        // En las skins antiguas los miembros izquierdos son los derechos reflejados
        const reflejo = antigua && parte.antigua
        const origen = reflejo ? PARTES.find((p) => p.nombre === parte.antigua) : parte
        // Los brazos finos quedan pegados al cuerpo
        const x = parte.brazo && delgado ? parte.giro[0] + Math.sign(parte.giro[0]) * -0.5 : parte.giro[0]
        pieza.style.transform = `translate3d(${x * s}px, ${(parte.giro[1] - 16) * s}px, 0)`
        const cajas = [[origen.uv, 1]]
        const conCapa = antigua ? parte.nombre === 'cabeza' && !sinGorro : true
        if (conCapa) cajas.push([origen.capa, (Math.max(...caja) + parte.crece) / Math.max(...caja)])
        const hijos = cajas.map(([uv, crecer], i) => {
          const grupo = div('skin3d__caja')
          const [cx, cy] = parte.centro
          const crecimiento = i ? `scale3d(${(caja[0] + parte.crece) / caja[0]}, ${(caja[1] + parte.crece) / caja[1]}, ${(caja[2] + parte.crece) / caja[2]})` : ''
          grupo.style.transform = `translate3d(${cx * s}px, ${cy * s}px, 0) ${crecimiento}`
          const rects = caras(uv, caja)
          for (const nombre of Object.keys(rects)) {
            // Al reflejar, la cara de un lado usa la del otro
            const fuente = reflejo && (nombre === 'der' || nombre === 'izq') ? rects[nombre === 'der' ? 'izq' : 'der'] : rects[nombre]
            const [u, v, w, h] = fuente
            const cara = div('skin3d__cara')
            cara.style.width = `${w * s}px`
            cara.style.height = `${h * s}px`
            cara.style.left = `${-w * s / 2}px`
            cara.style.top = `${-h * s / 2}px`
            cara.style.backgroundImage = `url("${src}")`
            cara.style.backgroundSize = `${64 * s}px ${alto * s}px`
            cara.style.backgroundPosition = `${-u * s}px ${-v * s}px`
            cara.style.transform = colocar(nombre, caja.map((n) => n * s)) + (reflejo ? ' scaleX(-1)' : '')
            if (!i) cara.style.filter = `brightness(${LUZ[nombre]})`
            grupo.append(cara)
          }
          return grupo
        })
        pieza.replaceChildren(...hijos)
      }
    }

    // Postura: el ángulo lo cambia el ratón; quieto, respira un poco
    let angulo = anguloInicial
    let arrastre = null
    const quieto = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    contenedor.addEventListener('pointerdown', (e) => {
      arrastre = { x: e.clientX, angulo }
      contenedor.setPointerCapture(e.pointerId)
      contenedor.classList.add('skin3d--girando')
    })
    contenedor.addEventListener('pointermove', (e) => {
      if (arrastre) angulo = arrastre.angulo + (e.clientX - arrastre.x) * 0.8
    })
    const soltar = () => {
      arrastre = null
      contenedor.classList.remove('skin3d--girando')
    }
    contenedor.addEventListener('pointerup', soltar)
    contenedor.addEventListener('pointercancel', soltar)

    const inicio = performance.now()
    let ultimo = -Infinity
    function postura (ahora) {
      if (!contenedor.isConnected) return
      requestAnimationFrame(postura)
      // 30 fotogramas por segundo y solo si se ve
      if (ahora - ultimo < 33 || !skin || contenedor.offsetParent === null) return
      ultimo = ahora
      const t = quieto && quieto.matches ? 0 : (ahora - inicio) / 1000
      const balanceo = arrastre ? 0 : Math.sin(t * 0.5) * 8
      modelo.style.transform = `rotateX(-10deg) rotateY(${angulo + balanceo}deg)`
      const brazo = Math.sin(t * 1.3) * 4
      const abre = 3 + Math.cos(t * 0.9) * 2
      piezas.brazoDer.pieza.style.transform = piezas.brazoDer.pieza.style.transform.replace(/ rotate.*$/, '') + ` rotateX(${brazo}deg) rotateZ(${abre}deg)`
      piezas.brazoIzq.pieza.style.transform = piezas.brazoIzq.pieza.style.transform.replace(/ rotate.*$/, '') + ` rotateX(${-brazo}deg) rotateZ(${-abre}deg)`
      piezas.cabeza.pieza.style.transform = piezas.cabeza.pieza.style.transform.replace(/ rotate.*$/, '') + ` rotateY(${Math.sin(t * 0.35) * 10}deg) rotateX(${Math.sin(t * 0.6) * 3}deg)`
    }
    requestAnimationFrame(postura)

    return {
      poner (img, delgado, sinGorro) {
        if (!img) {
          skin = null
          modelo.hidden = true
          return
        }
        skin = { src: img.src, alto: img.height === 32 ? 32 : 64, delgado, sinGorro }
        construir()
        modelo.hidden = false
        ultimo = -Infinity
      }
    }
  }

  window.Skin3D = { montar }
})()
