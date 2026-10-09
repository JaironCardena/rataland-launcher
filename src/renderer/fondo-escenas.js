// Lo genera tools/arte.js a partir de las mismas posiciones que el dibujo: no lo cambies a mano.
window.ESCENAS_FONDO = {
  "pesca": {
    "clave": "pesca",
    "ancho": 320,
    "alto": 180,
    "escala": 2,
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
  },
  "mina": {
    "clave": "mina",
    "ancho": 320,
    "alto": 180,
    "escala": 2,
    "capas": {
      "vagoneta": {
        "ancho": 34,
        "alto": 20
      },
      "cristales": {
        "ancho": 36,
        "alto": 30
      },
      "minero1": {
        "ancho": 34,
        "alto": 30
      },
      "minero2": {
        "ancho": 34,
        "alto": 30
      }
    },
    "elementos": [
      {
        "tipo": "brillos",
        "puntos": [
          [
            23,
            45
          ],
          [
            81,
            29
          ],
          [
            107,
            59
          ],
          [
            173,
            27
          ],
          [
            237,
            49
          ],
          [
            267,
            25
          ],
          [
            305,
            57
          ],
          [
            59,
            85
          ],
          [
            223,
            81
          ],
          [
            13,
            93
          ]
        ],
        "semilla": 0,
        "color": "#fff0a8"
      },
      {
        "tipo": "destellos",
        "n": 22,
        "semilla": 71,
        "zona": [
          0,
          156,
          320,
          23
        ],
        "evitar": [],
        "color": "#2a4d59"
      },
      {
        "tipo": "reflejo",
        "x": 138,
        "desde": 156,
        "hasta": 176,
        "ancho": 6,
        "color": "#f6c445",
        "brillo": "#fff0a8"
      },
      {
        "tipo": "gotas",
        "puntos": [
          [
            98,
            14,
            111
          ],
          [
            228,
            29,
            111
          ],
          [
            262,
            20,
            111
          ]
        ],
        "cada": 4.3,
        "forma": 1.6,
        "gravedad": 260,
        "salpica": 0.45,
        "color": "#7fb0c2",
        "onda": "#5f8fa0"
      },
      {
        "tipo": "farol",
        "x": 39,
        "y": 70,
        "color": "#f2a541",
        "llama": [
          "#ff9a3c",
          "#ffd36b"
        ],
        "radios": [
          18,
          9
        ],
        "reflejo": [
          158,
          174
        ]
      },
      {
        "tipo": "farol",
        "x": 191,
        "y": 70,
        "color": "#f2a541",
        "llama": [
          "#ff9a3c",
          "#ffd36b"
        ],
        "radios": [
          18,
          9
        ],
        "reflejo": [
          158,
          174
        ]
      },
      {
        "tipo": "farol",
        "x": 287,
        "y": 70,
        "color": "#f2a541",
        "llama": [
          "#ff9a3c",
          "#ffd36b"
        ],
        "radios": [
          18,
          9
        ],
        "reflejo": [
          158,
          174
        ]
      },
      {
        "tipo": "pasa",
        "nombre": "vagoneta",
        "y": 87,
        "desde": -40,
        "hasta": 330,
        "cada": 17,
        "dura": 7.5,
        "desfase": 3,
        "junta": 9
      },
      {
        "tipo": "capa",
        "nombre": "cristales",
        "x": 120,
        "y": 88
      },
      {
        "tipo": "brillos",
        "puntos": [
          [
            125,
            106
          ],
          [
            130,
            98
          ],
          [
            137,
            103
          ],
          [
            142,
            108
          ],
          [
            148,
            104
          ],
          [
            133,
            108
          ],
          [
            144,
            110
          ]
        ],
        "semilla": 50,
        "color": "#fff0a8"
      },
      {
        "tipo": "golpes",
        "capas": [
          "minero1",
          "minero2"
        ],
        "x": 150,
        "y": 86,
        "cada": 1.4,
        "golpe": 0.3,
        "desfase": 0,
        "chispas": {
          "x": 151,
          "y": 104,
          "n": 7,
          "vida": 0.45,
          "velocidad": 34,
          "gravedad": 150,
          "lado": -1,
          "color": "#f6c445",
          "brillo": "#fff0a8"
        }
      },
      {
        "tipo": "luciernagas",
        "n": 14,
        "semilla": 61,
        "zona": [
          140,
          52,
          170,
          44
        ],
        "color": "#c98b4a",
        "brillo": "#ffe0a6"
      }
    ]
  }
}
