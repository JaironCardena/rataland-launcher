package com.rataland.menu;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.util.Mth;
import net.minecraft.util.Util;
import net.minecraft.world.level.Level;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.PlayerScoreEntry;
import net.minecraft.world.scores.Scoreboard;
import org.jetbrains.annotations.Nullable;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * El mundo que se reinicia con el mod de servidor World Reset. Cuando el servidor regenera el mundo
 * (lo hace de golpe: te manda a su sala y enseguida al mundo nuevo), la pantalla de carga muestra
 * primero el cartel de la muerte y luego «Regenerando el mundo» con sus pasos, el número de mundo y el
 * récord. Su cuenta atrás (si se usa /worldreset timer) sale como un aviso de RataLand, y sus textos en
 * inglés no llegan al chat.
 */
public final class Reinicio {
	private Reinicio() {}

	/** La sala de espera de World Reset. */
	private static final Identifier SALA = Identifier.fromNamespaceAndPath("worldreset", "lobby");
	private static final Pattern RELOJ = Pattern.compile("^(\\d{2,}):(\\d{2})$");
	private static final Pattern CARGA = Pattern.compile("(\\d+)\\D+(\\d+)");
	/** Lo que se ve el cartel de la muerte antes de «Regenerando el mundo». */
	private static final long FASE_MUERTE = 2500;
	/** Lo que se ve «Regenerando el mundo» como poco. */
	private static final long FASE_MUNDO = 3000;
	private static final long MAXIMO = 90_000;

	private static long desde;
	@Nullable
	private static Muertes.Muerte muerte;
	private static int cargados;
	private static int total;
	private static long ultimaDuracion;
	private static long record;
	private static boolean leido;

	public static boolean activo() {
		return desde != 0 && Util.getMillis() - desde < MAXIMO;
	}

	/** Al cambiar de mundo: entrar en la sala de World Reset es que empieza a regenerarse. */
	public static void alReaparecer(ResourceKey<Level> dimension) {
		if (SALA.equals(dimension.identifier()) && !activo()) empezar();
	}

	public static void empezar() {
		leer();
		desde = Util.getMillis();
		muerte = Muertes.reciente(10_000);
		cargados = 0;
		total = 0;
		// Lo que duró el mundo que se acaba (si lo viste empezar)
		long inicio = inicioGuardado;
		if (inicio > 0) {
			ultimaDuracion = System.currentTimeMillis() - inicio;
			if (ultimaDuracion > record) record = ultimaDuracion;
		} else {
			ultimaDuracion = 0;
		}
		inicioGuardado = 0;
		guardar();
		RataLand.LOG.info("El mundo se está regenerando (World Reset)");
	}

	/** Se acaba la pantalla: empieza el mundo nuevo (se apunta cuándo, para el récord). */
	public static void terminar() {
		if (desde == 0) return;
		desde = 0;
		inicioGuardado = System.currentTimeMillis();
		guardar();
	}

	/** ¿Puede cerrarse ya la pantalla de carga? Se queda lo justo para que se vea todo. */
	public static boolean puedeCerrar() {
		return Util.getMillis() - desde >= (muerte != null ? FASE_MUERTE : 0) + FASE_MUNDO;
	}

	/** Cada tick: si la pantalla de carga ya se fue (o nunca salió), se da por terminado. */
	public static void tick(Minecraft juego) {
		if (desde != 0 && Util.getMillis() - desde > 1500 && juego.gui.screen() == null && juego.level != null && puedeCerrar()) terminar();
		if (desde != 0 && !activo()) terminar();
	}

	/** Mensajes del chat de World Reset: no van al chat (true). */
	public static boolean deChat(Component mensaje) {
		String texto = mensaje.getString();
		if (texto.equals("Resetting...")) {
			if (!activo()) empezar();
			return true;
		}
		if (texto.startsWith("Next world isn't ready yet")) {
			Minecraft.getInstance().gui.toastManager().addToast(AvisoRataLand.listo("El mundo nuevo aún se prepara", "Se reinicia en cuanto esté listo"));
			return true;
		}
		return false;
	}

	/** Mensajes encima de la barra de objetos: la cuenta atrás y la carga del terreno de World Reset (true = no se enseñan). */
	public static boolean deEncima(Component mensaje) {
		if (mensaje.getContents() instanceof TranslatableContents t && t.getKey().equals("worldreset.world.loading_terrain")) {
			Matcher m = CARGA.matcher(mensaje.getString().replace(t.getKey(), ""));
			if (t.getArgs().length >= 2) {
				cargados = numero(t.getArgs()[0]);
				total = numero(t.getArgs()[1]);
			} else if (m.find()) {
				cargados = Integer.parseInt(m.group(1));
				total = Integer.parseInt(m.group(2));
			}
			return true;
		}
		Matcher reloj = RELOJ.matcher(mensaje.getString().trim());
		if (reloj.matches()) {
			AvisoCuentaAtras.poner(Integer.parseInt(reloj.group(1)) * 60 + Integer.parseInt(reloj.group(2)));
			return true;
		}
		return false;
	}

	private static int numero(Object o) {
		try {
			return Integer.parseInt(o instanceof Component c ? c.getString() : String.valueOf(o));
		} catch (NumberFormatException e) {
			return 0;
		}
	}

	/** El mundo en el que se va a jugar: uno más que las muertes de todos (cada muerte reinicia el mundo). */
	@Nullable
	private static Integer mundo() {
		Minecraft juego = Minecraft.getInstance();
		if (juego.level == null) return RataLand.MODO_CAPTURA ? 4 : null;
		Scoreboard marcador = juego.level.getScoreboard();
		Objective objetivo = marcador.getObjective(MuertesTab.OBJETIVO);
		if (objetivo == null) return null;
		int muertes = 0;
		for (PlayerScoreEntry e : marcador.listPlayerScores(objetivo)) if (!e.isHidden()) muertes += Math.max(0, e.value());
		return muertes + 1;
	}

	/**
	 * La pantalla mientras se regenera el mundo, encima del paisaje desenfocado de la pantalla de carga.
	 * `progreso`: lo que lleva cargado el juego (0 a 1).
	 */
	public static void dibujar(GuiGraphicsExtractor g, Font fuente, int ancho, int alto, float progreso) {
		long t = Util.getMillis() - desde;
		g.fill(0, 0, ancho, alto, 0x73080D1A);
		if (muerte != null && t < FASE_MUERTE) {
			float opacidad = Mth.clamp(Math.min(t / 250f, (FASE_MUERTE - t) / 300f), 0f, 1f);
			Muertes.cartel(g, fuente, muerte, ancho, alto, opacidad, "El mundo se reinicia" + TarjetaEntrando.puntos());
			return;
		}
		long fase = t - (muerte != null ? FASE_MUERTE : 0);
		// La barra llega al final como pronto al terminar la fase, aunque el mundo ya esté
		float real = total > 0 ? Math.max(progreso, cargados / (float) total) : progreso;
		float avance = Mth.clamp(Math.min(Math.max(real, 0.05f), fase / (float) (FASE_MUNDO - 600)), 0f, 1f);

		int w = Math.min(300, ancho - 40);
		int h = 104;
		int x = (ancho - w) / 2;
		int y = Math.max(10, alto / 2 - h / 2 - 22);
		Estilo.escalon(g, x, y, w, h, 0xEB0D1424);
		Estilo.bordeEscalon(g, x, y, w, h, Estilo.LINEA);

		g.pose().pushMatrix();
		g.pose().translate(x + 14, y + 11);
		g.pose().scale(1.5f, 1.5f);
		g.text(fuente, "Regenerando el mundo", 0, 0, Estilo.TEXTO);
		g.pose().popMatrix();
		Integer mundo = mundo();
		if (mundo != null) {
			String chapa = "Mundo nº " + mundo;
			int cw = fuente.width(chapa) + 12;
			g.fill(x + w - 14 - cw, y + 10, x + w - 14, y + 23, 0x990D1424);
			g.outline(x + w - 14 - cw, y + 10, cw, 13, Estilo.QUESO);
			g.text(fuente, chapa, x + w - 14 - cw + 6, y + 13, Estilo.QUESO, false);
		}

		String primero = muerte != null ? muerte.jugador() + " murió: " + minuscula(muerte.causa()) : "Se acabó el tiempo del mundo";
		String[] pasos = {primero, "Generando el mundo nuevo · " + Math.round(avance * 100) + "%", "Volviendo a jugar"};
		int paso = avance >= 1f ? 3 : 2;
		int fy = y + 34;
		for (int i = 1; i <= 3; i++) {
			String texto = Estilo.recortar(fuente, i == 2 && paso > 2 ? "Mundo nuevo listo" : pasos[i - 1], w - 42);
			if (i < paso) {
				Estilo.icono(g, IconosPixel.HECHO, x + 14, fy, 1, Estilo.HIERBA_LUZ);
				g.text(fuente, texto, x + 28, fy, Estilo.TEXTO);
			} else if (i == paso) {
				g.fill(x + 14, fy + 1, x + 20, fy + 7, Estilo.QUESO);
				g.text(fuente, texto + (i == 3 ? TarjetaEntrando.puntos() : ""), x + 28, fy, Estilo.QUESO);
			} else {
				g.outline(x + 15, fy + 1, 6, 6, Estilo.MUY_TENUE);
				g.text(fuente, texto, x + 28, fy, Estilo.MUY_TENUE);
			}
			fy += 12;
		}
		TarjetaEntrando.barra(g, x + 14, y + 84, w - 28, avance);

		// Abajo: el récord (lo que duró el mundo más largo) o, si aún no se sabe, un consejo
		if (record > 0) {
			String texto = "El mundo más largo duró " + duracion(record) + (ultimaDuracion > 0 ? " · este, " + duracion(ultimaDuracion) : "");
			caja(g, fuente, ancho, alto, y + h + 14, "Récord", texto);
		} else {
			TarjetaEntrando.dibujarConsejo(g, fuente, ancho, alto, y + h + 14);
		}
	}

	private static void caja(GuiGraphicsExtractor g, Font fuente, int ancho, int alto, int cy, String chip, String texto) {
		int cw = Math.min(380, ancho - 40);
		int ch = 22;
		if (cy + ch > alto - 6) return;
		int cx = (ancho - cw) / 2;
		Estilo.panel(g, cx, cy, cw, ch);
		int chipAncho = Estilo.etiqueta(g, fuente, cx + 6, cy + (ch - 15) / 2, chip);
		g.text(fuente, Estilo.recortar(fuente, texto, cw - chipAncho - 20), cx + 6 + chipAncho + 8, cy + 7, Estilo.CLARO);
	}

	private static String minuscula(String texto) {
		return texto.isEmpty() ? texto : Character.toLowerCase(texto.charAt(0)) + texto.substring(1);
	}

	/** 3 d 4 h, 2 h 14 min, 35 min, 50 s */
	static String duracion(long ms) {
		long s = ms / 1000;
		if (s < 60) return s + " s";
		long min = s / 60;
		if (min < 60) return min + " min";
		long h = min / 60;
		if (h < 24) return h + " h " + min % 60 + " min";
		return h / 24 + " d " + h % 24 + " h";
	}

	/* ---------- Cuándo empezó el mundo de ahora y el récord, guardados en config/rataland-mundos.json ---------- */

	private static long inicioGuardado;

	private static void leer() {
		if (leido) return;
		leido = true;
		try {
			Path ruta = RataLand.config("rataland-mundos.json");
			if (!Files.exists(ruta)) return;
			JsonObject json = JsonParser.parseString(Files.readString(ruta)).getAsJsonObject();
			inicioGuardado = json.has("inicio") ? json.get("inicio").getAsLong() : 0;
			record = json.has("record") ? json.get("record").getAsLong() : 0;
		} catch (Exception e) {
			RataLand.LOG.warn("No se pudo leer rataland-mundos.json: {}", e.toString());
		}
	}

	private static void guardar() {
		try {
			JsonObject json = new JsonObject();
			json.addProperty("inicio", inicioGuardado);
			json.addProperty("record", record);
			Files.writeString(RataLand.config("rataland-mundos.json"), json.toString());
		} catch (Exception e) {
			RataLand.LOG.warn("No se pudo guardar rataland-mundos.json: {}", e.toString());
		}
	}

	/** Solo en las pruebas: un reinicio tras la muerte de ejemplo, con un récord de 2 h 14 min. */
	public static void ejemplo() {
		leido = true;
		record = (2 * 60 + 14) * 60_000L;
		inicioGuardado = System.currentTimeMillis() - 35 * 60_000L;
		desde = 0;
		empezar();
		record = (2 * 60 + 14) * 60_000L;
	}

	/** Solo en las pruebas: cuánto lleva la pantalla. */
	public static long transcurrido() {
		return desde == 0 ? 0 : Util.getMillis() - desde;
	}
}
