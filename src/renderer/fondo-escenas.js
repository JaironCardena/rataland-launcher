// Lo genera tools/arte.js a partir de las mismas posiciones que el dibujo: no lo cambies a mano.
window.ESCENAS_FONDO = {
  "pesca": {
    "clave": "pesca",
    "ancho": 320,
    "alto": 180,
    "escala": 2,
    "sonido": "pesca",
    "capas": {
      "nubes": {
        "ancho": 320,
        "alto": 48
      },
      "barca": {
        "ancho": 64,
        "alto": 40
      }
    },
    "vaivenes": {
      "barca": {
        "velocidad": 1.3,
        "umbral": 0.2
      }
    },
    "elementos": [
      {
        "tipo": "estrellas",
        "n": 28,
        "semilla": 91,
        "zona": [
          0,
          2,
          320,
          84
        ],
        "evitar": [
          200,
          40,
          30
        ],
        "grandes": 0.25,
        "color": "#e9efff"
      },
      {
        "tipo": "fugaz",
        "cada": 13,
        "desfase": 4,
        "dura": 1.1,
        "zona": [
          90,
          4,
          200,
          30
        ],
        "recorrido": [
          -64,
          30
        ],
        "estela": 10,
        "color": "#fff3d6"
      },
      {
        "tipo": "capa",
        "nombre": "nubes",
        "x": 0,
        "y": 6,
        "desliza": 2.5
      },
      {
        "tipo": "reflejo",
        "x": 200,
        "desde": 106,
        "hasta": 160,
        "ancho": 7,
        "color": "#f6c445",
        "brillo": "#fff0a8"
      },
      {
        "tipo": "destellos",
        "n": 26,
        "semilla": 37,
        "zona": [
          0,
          107,
          320,
          72
        ],
        "evitar": [
          [
            0,
            144,
            20,
            36
          ],
          [
            20,
            144,
            20,
            36
          ],
          [
            40,
            146,
            20,
            34
          ],
          [
            60,
            150,
            20,
            30
          ],
          [
            80,
            155,
            20,
            25
          ],
          [
            100,
            161,
            20,
            19
          ],
          [
            120,
            168,
            20,
            12
          ],
          [
            264,
            0,
            320,
            147
          ],
          [
            148,
            0,
            43,
            125
          ],
          [
            115,
            0,
            27,
            119
          ],
          [
            187,
            0,
            27,
            180
          ]
        ],
        "color": "#5d6b9a"
      },
      {
        "tipo": "sombra",
        "x": 154,
        "y": 114,
        "ancho": 30,
        "filas": 5,
        "color": "#0a0f1c",
        "mece": "barca"
      },
      {
        "tipo": "corcho",
        "x": 128,
        "y": 109,
        "agua": 112,
        "cada": 19,
        "desfase": 9,
        "pica": 0.9,
        "evento": "plop",
        "colores": [
          "#e0533f",
          "#f2f2f2"
        ],
        "sedal": {
          "desde": [
            140,
            84
          ],
          "mece": "barca",
          "color": "#c7cfe0",
          "alfa": 0.4
        },
        "ondas": {
          "cada": 3,
          "radio": 9,
          "aplasta": 0.3,
          "color": "#8fa0cc",
          "alfa": 0.45
        }
      },
      {
        "tipo": "capa",
        "nombre": "barca",
        "x": 136,
        "y": 78,
        "mece": "barca"
      },
      {
        "tipo": "farol",
        "x": 180,
        "y": 97,
        "mece": "barca",
        "color": "#f6c445",
        "llama": [
          "#ffd36b",
          "#fff0a8"
        ],
        "radios": [
          16,
          8
        ],
        "reflejo": [
          120,
          136
        ]
      },
      {
        "tipo": "luciernagas",
        "n": 12,
        "semilla": 53,
        "zona": [
          8,
          112,
          150,
          52
        ],
        "color": "#f6c445",
        "brillo": "#fff0a8"
      }
    ]
  }
}
