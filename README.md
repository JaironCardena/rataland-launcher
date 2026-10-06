# Launcher de RataLand

Launcher propio (Electron) para la serie RataLand:

- Descarga **Minecraft 1.21.1**, **Fabric** y **Java** (el oficial de Mojang: el jugador no necesita instalar nada).
- Mantiene los **mods ocultos y sincronizados** en `%APPDATA%\.rataland` (carpeta oculta). Cada vez que se pulsa *Jugar* se descargan los mods nuevos, se restauran los que el jugador haya modificado y se borran los que sobran (mods viejos o puestos a mano).
- Inicio de sesión con **Microsoft** (premium) y **sin premium**.
- Muestra si el servidor está encendido, cuántos jugadores hay y las **novedades** que publiques.
- Incluye el **mod de RataLand** (`mod/`), que dentro del juego:
  - cambia la pantalla de carga de Mojang por el logo de RataLand,
  - sustituye el menú principal por el de la serie: **Jugar** (entra al servidor), **Opciones** y **Salir**,
  - usa el paisaje de RataLand como fondo en Opciones, al conectar, etc.,
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

## Añadir, quitar o actualizar mods

Los mods se sirven desde la carpeta `modpack/` de este repositorio de GitHub. Para cambiarlos:

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

## Publicar una versión nueva del launcher

Cuando cambies el código o el diseño del launcher:

```bash
npm.cmd version patch
```

```bash
npm.cmd run release
```

El primero sube la versión (1.0.0 → 1.0.1). El segundo crea el instalador y lo publica en GitHub Releases; los launchers instalados lo descargan solos. Necesita `gh` con tu sesión de GitHub iniciada.

## El arte

`tools/arte.js` genera todo el pixel-art (logo, fondos, icono y texturas del mod). Para cambiar colores o dibujos, edítalo y ejecuta:

```bash
node tools/arte.js
```

Si cambias las texturas del mod, vuelve a compilarlo (siguiente apartado).

## El mod de RataLand (`mod/`)

El launcher escribe `config/rataland.json` con la IP del servidor antes de abrir el juego, así que si cambias de servidor no hace falta recompilar el mod. Para compilarlo tras cambiar el código o las texturas necesitas un JDK 25 (Gradle lo usa para compilar; el mod resultante funciona con el Java 21 de Minecraft):

```bash
cd mod && ./gradlew build
```

Copia `mod/build/libs/rataland-menu-1.0.0.jar` a `modpack/mods/` y ejecuta `npm run publicar`.

## Sobre el servidor

- El mod de RataLand solo va en el cliente; el servidor no lo necesita.
- Si activas `noPremium`, el servidor tiene que estar en `online-mode=false` (en Aternos: modo "cracked"), y entonces cualquiera puede entrar con cualquier nombre: usa un plugin o mod de registro con contraseña. Si solo usas cuentas de Microsoft, deja `online-mode=true`.
- Aternos apaga el servidor cuando no hay nadie; el launcher lo muestra como apagado.

## Qué hay en cada archivo

- `src/main/index.js`: ventana y orden de pasos al pulsar *Jugar*.
- `src/main/minecraft.js`: instala Minecraft, Java y el loader.
- `src/main/sincronizar.js`: descarga, verifica y borra mods según el manifiesto.
- `src/main/juego.js`: arranca el juego.
- `src/main/cuentas.js`: inicio de sesión (el token de Microsoft se guarda cifrado).
- `src/main/servidor.js`: consulta si el servidor está encendido y cuántos jugadores hay.
- `src/renderer/`: la interfaz. `demo.js` permite abrir `index.html` en un navegador para ver el diseño sin Electron.
- `tools/publicar.js`: genera `manifest.json`.
- `tools/arte.js`: genera el pixel-art.
- `mod/`: código del mod de Fabric (menú, pantalla de carga, título de la ventana).
