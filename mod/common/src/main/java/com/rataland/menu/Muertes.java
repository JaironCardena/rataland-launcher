package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.HoverEvent;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.minecraft.util.Mth;
import net.minecraft.util.Util;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.ReadOnlyScoreInfo;
import net.minecraft.world.scores.ScoreHolder;
import net.minecraft.world.scores.Scoreboard;
import org.jetbrains.annotations.Nullable;

import java.util.UUID;

/**
 * Cuando muere un jugador: en vez de la línea del chat, un cartel en el centro (el diseño B) con la
 * calavera, «X ha muerto», cómo ha sido y su número de muerte, y los bordes de la pantalla en rojo.
 * Si el servidor reinicia el mundo (World Reset), el cartel abre la pantalla de Reinicio.
 */
public final class Muertes {
	private Muertes() {}

	/** Una muerte: quién, cómo («Cayó desde muy alto») y cuándo llegó. */
	public record Muerte(String jugador, @Nullable UUID id, String causa, long llegada) {}

	public static final long DURACION = 3500;
	private static final long ENTRADA = 250;
	private static final long SALIDA = 400;
	private static final int ANCHO = 230;
	@Nullable
	private static Muerte ultima;

	/** Un mensaje del sistema: si es la muerte de un jugador, pasa al cartel y devuelve true (no va al chat). */
	public static boolean deChat(Component mensaje) {
		if (!(mensaje.getContents() instanceof TranslatableContents t) || !t.getKey().startsWith("death.") || t.getArgs().length < 1
				|| !(t.getArgs()[0] instanceof Component quien)) {
			return false;
		}
		UUID id = null;
		String jugador = quien.getString();
		if (quien.getStyle().getHoverEvent() instanceof HoverEvent.ShowEntity entidad) {
			// Las mascotas con nombre también tienen mensaje de muerte: esas siguen en el chat
			if (entidad.entity().type != EntityTypes.PLAYER) return false;
			id = entidad.entity().uuid;
			if (entidad.entity().name.isPresent()) jugador = entidad.entity().name.get().getString();
		}
		String texto = mensaje.getString();
		String causa = texto.startsWith(quien.getString()) ? texto.substring(quien.getString().length()).trim() : texto;
		if (!causa.isEmpty()) causa = Character.toUpperCase(causa.charAt(0)) + causa.substring(1);
		ultima = new Muerte(jugador, id, causa, Util.getMillis());
		return true;
	}

	/** La última muerte si llegó hace menos de `ms`. */
	@Nullable
	public static Muerte reciente(long ms) {
		return ultima != null && Util.getMillis() - ultima.llegada() < ms ? ultima : null;
	}

	/** Cuántas veces ha muerto (el marcador rataland_muertes del Tab), o null si el servidor no lo comparte. */
	@Nullable
	public static Integer numero(String jugador) {
		Minecraft juego = Minecraft.getInstance();
		if (juego.level == null) return RataLand.MODO_CAPTURA ? 3 : null;
		Scoreboard marcador = juego.level.getScoreboard();
		Objective objetivo = marcador.getObjective(MuertesTab.OBJETIVO);
		if (objetivo == null) return null;
		ReadOnlyScoreInfo valor = marcador.getPlayerScoreInfo(ScoreHolder.forNameOnly(jugador), objetivo);
		return valor == null ? null : valor.value();
	}

	/** Cada fotograma, encima del juego (no con otra pantalla abierta, ni mientras se regenera el mundo). */
	public static void dibujar(GuiGraphicsExtractor g, int ancho, int alto) {
		Muerte m = reciente(DURACION);
		if (m == null || Reinicio.activo()) return;
		Minecraft juego = Minecraft.getInstance();
		if (juego.gui.screen() != null && !(juego.gui.screen() instanceof ChatScreen) && !(RataLand.MODO_CAPTURA && juego.gui.screen() instanceof Prueba.Muerte)) return;
		long t = Util.getMillis() - m.llegada();
		float opacidad = t < ENTRADA ? t / (float) ENTRADA : t > DURACION - SALIDA ? (DURACION - t) / (float) SALIDA : 1f;
		cartel(g, juego.font, m, ancho, alto, Mth.clamp(opacidad, 0f, 1f), null);
	}

	private static int conAlfa(int color, float opacidad) {
		return Math.round(((color >>> 24) & 0xFF) * opacidad) << 24 | (color & 0xFFFFFF);
	}

	/**
	 * El cartel: bordes de la pantalla en rojo, la calavera, «X ha muerto», la causa con su número de
	 * muerte y, si se da, una tercera línea (como «El mundo se reinicia…»).
	 */
	public static void cartel(GuiGraphicsExtractor g, Font fuente, Muerte m, int ancho, int alto, float opacidad, @Nullable String tercera) {
		// Los bordes en rojo, cada vez más suaves hacia el centro
		for (int i = 0; i < 12; i++) {
			int a = Math.round((0x60 - i * 8) * opacidad);
			if (a <= 0) break;
			int c = a << 24 | 0x6E0810;
			int b = i * 4;
			g.fill(b, b, ancho - b, b + 4, c);
			g.fill(b, alto - b - 4, ancho - b, alto - b, c);
			g.fill(b, b + 4, b + 4, alto - b - 4, c);
			g.fill(ancho - b - 4, b + 4, ancho - b, alto - b - 4, c);
		}

		Integer numero = numero(m.jugador());
		String detalle = m.causa() + (numero != null && numero > 0 ? " · su muerte nº " + numero : "");
		float escala = 1.25f;
		int textoAncho = Math.max(Math.round(fuente.width(m.jugador() + " ha muerto") * escala), fuente.width(detalle));
		int w = Math.min(ancho - 40, Math.max(ANCHO, 42 + textoAncho + 10));
		int h = tercera == null ? 41 : 58;
		int x = (ancho - w) / 2;
		int y = Math.max(40, Math.round(alto * 0.18f)) - Math.round((1f - opacidad) * 6f);

		Estilo.escalon(g, x, y, w, h, conAlfa(0xF00D1424, opacidad));
		Estilo.bordeEscalon(g, x, y, w, h, conAlfa(0x8CFF8A7A, opacidad));
		Estilo.escalon(g, x + 8, y + 8, 26, 26, conAlfa(0xFF2B1A22, opacidad));
		Estilo.icono(g, IconosPixel.CALAVERA, x + 13, y + 13, 2, conAlfa(Estilo.ERROR, opacidad));

		g.pose().pushMatrix();
		g.pose().translate(x + 42, y + 8);
		g.pose().scale(escala, escala);
		g.text(fuente, Estilo.recortar(fuente, m.jugador() + " ha muerto", Math.round((w - 52) / escala)), 0, 0, conAlfa(Estilo.TEXTO, opacidad), true);
		g.pose().popMatrix();
		int dx = x + 42;
		String causa = Estilo.recortar(fuente, m.causa(), w - 52);
		g.text(fuente, causa, dx, y + 24, conAlfa(Estilo.CLARO, opacidad), false);
		if (numero != null && numero > 0 && fuente.width(detalle) <= w - 52) {
			g.text(fuente, " · su muerte nº " + numero, dx + fuente.width(causa), y + 24, conAlfa(Estilo.MUY_TENUE, opacidad), false);
		}
		if (tercera != null) {
			g.fill(x + 8, y + 41, x + w - 8, y + 42, conAlfa(Estilo.LINEA, opacidad));
			g.text(fuente, tercera, x + 8, y + 46, conAlfa(Estilo.TENUE, opacidad), false);
		}
	}

	/** Solo en las pruebas: una muerte de otro jugador tal como la manda el servidor. */
	public static void ejemplo() {
		ultima = null;
		Component quien = Component.literal("JaironEc").withStyle((s) -> s.withHoverEvent(new HoverEvent.ShowEntity(
				new HoverEvent.EntityTooltipInfo(EntityTypes.PLAYER, UUID.nameUUIDFromBytes("JaironEc".getBytes()), Component.literal("JaironEc")))));
		Component mensaje = Component.translatable("death.fell.accident.generic", quien);
		RataLand.LOG.info("Prueba: el mensaje de muerte del chat {} va al cartel ({})", deChat(mensaje) ? "sí" : "NO", ultima == null ? "" : ultima.causa());
	}
}
