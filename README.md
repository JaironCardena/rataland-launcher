# Launcher de RataLand

Launcher propio (Electron) para la serie RataLand:

- Descarga **Minecraft**, **Fabric** o **NeoForge** y **Java** (el oficial de Mojang: el jugador no necesita instalar nada).
- Mantiene los **mods ocultos y sincronizados** en `%APPDATA%\.rataland` (carpeta oculta). Cada vez que se pulsa *Jugar* se descargan los mods nuevos, se restauran los que el jugador haya modificado y se borran los que sobran (mods viejos o puestos a mano).
- Inicio de sesión con **Microsoft** (premium) y **sin premium**, con tu skin en 3D (se gira arrastrando con el ratón).
- Muestra si el servidor está encendido, cuántos jugadores hay y las **novedades** que publiques.
- Si el servidor tiene **encendido automático** (arranca cuando alguien intenta entrar), al pulsar *Jugar* el launcher ya hace ese intento, así va arrancando mientras se actualiza y se abre el juego. Lo que contesta el servidor queda en `%APPDATA%\.rataland\.launcher\servidor.log`.
- Incluye el **mod de RataLand** (`mod/`, para Fabric y NeoForge), que dentro del juego:
  - cambia la pantalla de carga de Mojang por el paisaje y el logo de RataLand, con una barra de queso,
  - sustituye el menú principal por una portada: el logo y la cuenta atrás del próximo episodio arriba, el paisaje en medio, y abajo el estado del servidor (y quién está dentro), **Jugar** (entra al servidor), **Opciones**, **Discord** y **Salir**; tu personaje está de pie en el paisaje y tu cuenta arriba a la derecha,
  - sustituye el menú de pausa (Esc): **Volver al juego**, **Progresos**, **Estadísticas**, **Opciones**, **Discord** y **Volver a RataLand**, con los jugadores conectados, tu ping y la cuenta atrás,
  - muestra «Entrando en RataLand» con los pasos al conectar; si el servidor está dormido y el hosting aún no deja pasar, espera en «Despertando RataLand» y vuelve a intentarlo solo cada 10 s (hasta 10 minutos); y si no se puede entrar o te echan, explica en español qué pasó (sin internet, lleno, baneado…) con **Reintentar**,
  - avisa cuando falta poco para el episodio, cuando entra alguien y cuando se pone tu skin, y los avisos de Minecraft (recetas nuevas, avisos del sistema y consejos) salen con ese mismo estilo,
  - todos los avisos son tarjetas compactas (24 de alto, tan anchas como su texto) apiladas arriba en el centro, debajo de las barras de jefe y del Tab, en vez de arriba a la derecha (donde tapaban el minimapa); los logros de todos (los tuyos y los de los demás) salen así, con el tipo en su color, quién lo consiguió, el nombre y el objeto del logro, en vez de en el chat,
  - cambia la pantalla de muerte (con la puntuación y dónde has muerto) y la lista de jugadores del Tab (cara, nombre, corazones, muertes y ping) por unas al estilo de la serie; el contador de muertes se ve solo al abrir Tab (sin el marcador lateral en el HUD), y la vida y las muertes se configuran una vez en el servidor como se explica más abajo,
  - cuando muere un jugador sale un cartel en el centro durante unos segundos («X ha muerto», cómo ha sido y su número de muerte, con los bordes de la pantalla en rojo) en vez de la línea del chat,
  - con World Reset en el servidor, al regenerarse el mundo la pantalla de carga muestra ese cartel y luego «Regenerando el mundo» (los pasos, la barra, el número de mundo y cuánto duró el mundo más largo); su cuenta atrás (`/worldreset timer`) sale como un aviso y sus mensajes en inglés no llegan al chat,
  - da a los botones, deslizadores y listas de Opciones (y de Paquetes de recursos) el estilo del launcher y usa el paisaje de RataLand como fondo (algunos se mueven),
  - pone Progresos (ventana, pestañas y el recuadro de cada logro) y Estadísticas (lista, filas y pestañas) con el estilo de la serie,
  - pone "RataLand" como título de la ventana.

## Instalarlo (jugadores)

Descarga `RataLand-Setup-X.Y.Z.exe` de la página de [Releases](https://github.com/JaironCardena/rataland-launcher/releases/latest) y ábrelo. Se instala solo y crea un acceso directo en el escritorio.

Actualizaciones del launcher: al abrirlo, si hay una versión nueva aparece la pantalla "Actualizando el launcher", se instala sola y el launcher se vuelve a abrir con el aviso "Launcher actualizado a la versión X". Si sale una versión mientras está abierto, abajo aparece "Actualizar ahora". Si Windows bloquea la instalación, el launcher lo explica y ofrece descargarla a mano. Todo queda anotado en `%APPDATA%\.rataland\.launcher\actualizador.log`.

**El launcher no está firmado digitalmente.** Por eso:

- SmartScreen avisa la primera vez ("Más información" → "Ejecutar de todas formas").
- En los PC con **Control inteligente de aplicaciones** activado (Windows 11), Windows bloquea el instalador y las actualizaciones, sin opción de saltarlo.

La solución de verdad es firmar el instalador con un certificado de firma de código.

## Probarlo desde el código

```bash
npm install
```

```bash
npm.cmd start
```

(En PowerShell usa `npm.cmd` en lugar de `npm`.)

Para probar mods sin subirlos, cambia `"manifiesto"` en `launcher.config.json` por `"modpack"`: el launcher los copiará directamente desde esa carpeta. Acuérdate de volver a poner la URL antes de crear el instalador.

## Configuración (`launcher.config.json`)

| Campo | Para qué sirve |
| --- | --- |
| `nombre` | Nombre de la serie (ventana del launcher y del juego). |
| `carpeta` | Carpeta dentro de `%APPDATA%` donde se instala todo. |
| `manifiesto` | URL del `manifest.json` publicado, o una carpeta local para pruebas. |
| `minecraft`, `loader`, `servidor` | Valores por defecto. El `manifest.json` publicado manda sobre ellos, así que puedes cambiarlos sin reinstalar el launcher. |
| `servidor.entrarDirecto` | `false`: el jugador ve el menú de RataLand y entra con su botón Jugar. `true`: el juego se conecta solo al abrirse. |
| `cuentas.microsoft` / `cuentas.noPremium` | Qué formas de entrar se ofrecen. |
| `ramPredeterminada` | RAM inicial en MB (el jugador la puede cambiar en Ajustes). |
| `apariencia.logo`, `apariencia.fondo` | Imágenes de `src/renderer/assets/`. |
| `enlaces` | `discord`, `web`, `youtube`, `twitch`, `tiktok`, `x`… Los que tengan URL aparecen abajo. |

## Panel del modpack (la forma fácil)

**https://jaironcardena.github.io/rataland-launcher/**

Desde el navegador (también en el móvil) puedes:

- Añadir **mods, packs de texturas y shaders** buscándolos en Modrinth (solo salen los compatibles con Fabric y tu versión de Minecraft) o subiendo tus archivos. Las dependencias se añaden solas, y un mod de Forge/NeoForge o para otra versión se rechaza o se avisa.
- Quitar cosas, **buscar actualizaciones** y actualizarlas con un clic.
- Marcar packs de texturas como **"Activado para todos"**: el launcher los activa solo en el juego de cada jugador.
- Cambiar **servidor**, **versión de Minecraft y Fabric** (te dice qué mods tienen versión para la nueva), **noticias**, **cuenta atrás** y **enlaces**.
- **Publicar**: sube todo y genera el manifiesto en un solo paso. Los jugadores lo reciben al pulsar Jugar.

La primera vez pulsa **Conectar con GitHub** y sigue los pasos para crear una llave que solo sirve para este repositorio (Contents: Read and write). Se guarda en tu navegador. Sin llave, el panel solo deja mirar. La llave caduca como mucho al año; entonces crea otra igual.

Si después usas la consola en tu PC, ejecuta antes `git pull` para traer lo que publicaste desde el panel.

## Añadir, quitar o actualizar mods desde la consola

Los mods se sirven desde la carpeta `modpack/` de este repositorio de GitHub (y los añadidos desde Modrinth en el panel, desde Modrinth). Para cambiarlos sin el panel:

1. Cambia los archivos de `modpack/mods/`. Configuraciones, paquetes de recursos, etc. van en `modpack/config/`, `modpack/resourcepacks/`… con la misma estructura que en `.minecraft`. Las noticias y el servidor se cambian en `modpack/modpack.json`.
2. Genera el manifiesto:

   ```bash
   npm.cmd run publicar
   ```

3. Súbelo a GitHub:

   ```bash
   git add modpack
   ```

   ```bash
   git commit -m "Actualizar mods"
   ```

   ```bash
   git push
   ```

La próxima vez que cada jugador pulse *Jugar*, el launcher deja sus mods igual que tu carpeta. No hace falta repartir un launcher nuevo. GitHub puede tardar unos minutos en servir los cambios y no acepta archivos de más de 100 MB.

### Undead Nights en español

`modpack/resourcepacks/UndeadNights-Espanol-RataLand.zip` traduce los avisos de noches y hordas, criaturas, objetos, efectos y opciones de Undead Nights **2.2.6** para Minecraft **26.3** (formato de recursos 97). Incluye las variantes de español de España, Ecuador, México, Argentina, Chile, Uruguay y Venezuela. Está incluido en `packsActivos` para que el launcher lo active cuando se publique el modpack.

Para instalarlo manualmente, copia el ZIP a la carpeta `resourcepacks` de tu instalación y actívalo en **Opciones → Paquetes de recursos**, por encima de los demás. El juego debe estar en español. Si Minecraft ya estaba abierto, vuelve a entrar a esa pantalla para que detecte el archivo nuevo.

La traducción editable está en `resourcepacks/undeadnights-es/assets/undeadnights/lang/es_es.json`. Para reconstruir el ZIP:

```bash
node tools/crear-pack-undeadnights.js
npm run publicar
```

El primer comando acepta opcionalmente la ruta del JAR original para comprobar sus 124 claves y los parámetros de los mensajes antes de empaquetar. El pack añade también las ocho etiquetas y ayudas que faltan en el idioma original para cuatro opciones actuales del mod.

El aviso al intentar dormir durante una noche de los no muertos y algunas respuestas de los comandos de estado y dificultad están escritos directamente en el código de Undead Nights. Un paquete de recursos no puede traducir esos textos. Los nombres de los niveles de dificultad dependen de `difficultyName` en `config/undeadnights_difficulty_config.json` del servidor.

### Noticias, Discord y cuenta atrás (`modpack/modpack.json`)

Se publican igual que los mods (`npm.cmd run publicar` y subir):

```json
"noticias": [
  { "fecha": "2026-10-06", "titulo": "Bienvenidos a RataLand", "texto": "..." }
],
"enlaces": {
  "discord": "https://discord.gg/tu-invitacion"
},
"evento": {
  "titulo": "Episodio 2",
  "fecha": "2026-10-10T20:00:00-05:00",
  "duracionHoras": 3
}
```

- `enlaces.discord` añade el botón Discord abajo en el launcher y en el menú de pausa del juego. También valen `youtube`, `twitch`, `tiktok`, `x` y `web`.
- `evento` muestra en el launcher una cuenta atrás ("Episodio 2 empieza en 3d 04h 12m"). Al llegar la hora pone "¡Ya empezó!" durante `duracionHoras` y luego desaparece. Escribe la fecha con la zona horaria al final (`-05:00` es la hora de Ecuador) para que cada jugador la vea en su hora. Con `"fecha": ""` no se muestra nada.

## Publicar una versión nueva del launcher

Cuando cambies el código o el diseño del launcher:

```bash
npm.cmd version patch
```

```bash
npm.cmd run release
```

El primero sube la versión (1.0.0 → 1.0.1). El segundo crea el instalador, **comprueba que el launcher empaquetado arranca** (si no, no publica nada) y lo publica en GitHub Releases; los launchers instalados lo descargan solos. Necesita `gh` con tu sesión de GitHub iniciada.

## El arte

`tools/arte.js` genera todo el pixel-art (logo, fondos, icono y texturas del mod). Para cambiar colores o dibujos, edítalo y ejecuta:

```bash
node tools/arte.js
```

También genera los datos de los fondos animados (qué se mueve, dónde y a qué ritmo) para el launcher, el panel y el mod. Si cambias un fondo animado o su motor (`src/renderer/fondo-animado.js` o `MotorFondo.java`), guarda lo que dibuja el de JavaScript y compila el mod: su prueba falla si el de Java dibuja otra cosa.

```bash
node tools/comprobar-fondos.js --guardar
```

Si cambias las texturas o los fondos del mod, vuelve a compilarlo (siguiente apartado).

## El mod de RataLand (`mod/`)

El launcher escribe `config/rataland.json` con la IP del servidor antes de abrir el juego, así que si cambias de servidor no hace falta recompilar el mod.

El mod está hecho con Architectury: `mod/common` tiene todo (menús, fondos, mixins) y `mod/fabric` y `mod/neoforge` solo el punto de entrada de cada cargador. Es para Minecraft **26.3** (desde la 2.0.0; la 1.9.x era para 1.21.1 y sigue en el historial de git). Desde 26.1 Minecraft viene sin ofuscar, así que se compila sin mappings ni remapeo (`dev.architectury.loom-no-remap`). Para compilarlo tras cambiar el código o las texturas necesitas un JDK 25, el mismo Java que usa Minecraft 26.3:

```bash
cd mod && ./gradlew build
```

Luego coloca los jars y regenera el manifiesto:

```bash
node tools/publicar-mod.js
```

```bash
npm run publicar
```

`publicar-mod.js` guarda un jar por cargador en `mod/builds/` (con `versiones.json`) y pone en `modpack/mods/` el del cargador que usa el modpack. Al cambiar de Fabric a NeoForge en el panel, este cambia el mod de RataLand por el del otro cargador. El mod toca el código del juego, así que cada versión de Minecraft necesita su propia compilación: si el panel no encuentra una para la versión nueva, lo quita (y salen los menús normales) hasta que se adapte.

## Sobre el servidor

- El mod de RataLand solo va en el cliente; el servidor no lo necesita.
- Si activas `noPremium`, el servidor tiene que estar en `online-mode=false` (en Aternos: modo "cracked"), y entonces cualquiera puede entrar con cualquier nombre: usa un plugin o mod de registro con contraseña. Si solo usas cuentas de Microsoft, deja `online-mode=true`.
- Aternos apaga el servidor cuando no hay nadie; el launcher lo muestra como apagado.

### Vida y muertes en Tab

En la consola del servidor (vanilla, Paper u otro compatible con los marcadores de Minecraft), configura una vez la vida para verla también cuando un jugador está lejos:

```text
scoreboard objectives add vida health "Vida"
scoreboard objectives setdisplay list vida
```

Para activar las muertes, crea y muestra este objetivo con el nombre exacto `rataland_muertes`:

```text
scoreboard objectives add rataland_muertes deathCount "Muertes"
scoreboard objectives setdisplay sidebar rataland_muertes
```

El mod de RataLand lee ese marcador y muestra las muertes junto a la vida y el ping, solo en Tab. Oculta únicamente el sidebar de `rataland_muertes`; los demás marcadores laterales siguen visibles. La vida conserva su espacio `list`. Los jugadores sin el mod verán el sidebar normal de Minecraft.

El servidor solo puede mostrar un objetivo en ese espacio `sidebar`: el segundo comando reemplaza el que estuviera activo. Si ya lo usas para otro marcador, conserva esa configuración y evalúa primero cómo adaptar el marcador o su plugin; no lo sobrescribas sin revisar lo que perderías. Puedes dejar las muertes sin configurar mientras tanto: Tab mostrará `-` cuando no reciba datos.

El contador empieza al crear el objetivo. Un jugador sin muertes registradas tendrá `0`; las muertes anteriores no se recuperan automáticamente. Para conservar ese historial hay que importar las estadísticas guardadas por el servidor al marcador.

## Qué hay en cada archivo

- `src/main/index.js`: ventana y orden de pasos al pulsar *Jugar*.
- `src/main/minecraft.js`: instala Minecraft, Java y el loader.
- `src/main/sincronizar.js`: descarga, verifica y borra mods según el manifiesto.
- `src/main/juego.js`: arranca el juego.
- `src/main/cuentas.js`: inicio de sesión (el token de Microsoft se guarda cifrado).
- `src/main/servidor.js`: consulta si el servidor está encendido y cuántos jugadores hay.
- `src/renderer/`: la interfaz. `demo.js` permite abrir `index.html` en un navegador para ver el diseño sin Electron.
- `tools/publicar.js`: genera `manifest.json`.
- `tools/arte.js`: genera el pixel-art y los datos de los fondos animados.
- `tools/comprobar-fondos.js`: guarda lo que dibuja el motor de fondos de JavaScript para comprobar el de Java.
- `tools/publicar-mod.js`: coloca los jars del mod de RataLand (`mod/builds/` y `modpack/mods/`).
- `docs/`: el panel del modpack (GitHub Pages).
- `mod/`: código del mod de RataLand para Fabric y NeoForge (menús, pantalla de carga, fondos, título de la ventana).
