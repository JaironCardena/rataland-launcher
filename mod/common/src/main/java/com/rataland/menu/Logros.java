package com.rataland.menu;

import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.advancements.AdvancementNode;
import net.minecraft.advancements.AdvancementType;
import net.minecraft.advancements.DisplayInfo;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.PlayerFaceExtractor;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.HoverEvent;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.minecraft.util.Mth;
import net.minecraft.util.Util;
import net.minecraft.world.item.ItemStack;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.UUID;

/**
 * Los logros (progresos, objetivos y desafíos) de todos, en un cartel de RataLand arriba en el centro
 * de la pantalla, por encima de la mira: el objeto del logro, quién lo ha conseguido y el nombre. En
 * vez de la línea del chat y del aviso de arriba a la derecha (que tapa el minimapa). Con una pantalla
 * abierta (inventario, cofre…) esperan a que se cierre; con el chat abierto sí se ven.
 */
public final class Logros {
	private Logros() {}

	private static final long ENTRADA = 300;
	private static final long SALIDA = 400;
	private static final long DURACION = 5000;
	/** Un mismo logro de la misma persona que llega dos veces (el chat y tu propio aviso) es uno solo. */
	private static final long MISMO = 15_000;
	private static final int ALTO = 46;
	private static final int ANCHO_MIN = 220;
	private static final int ANCHO_MAX = 340;
	private static final String CLAVE = "chat.type.advancement.";

	private static final class Logro {
		final String jugador;
		@Nullable final UUID id;
		final String titulo;
		String descripcion;
		final AdvancementType tipo;
		@Nullable ItemStack icono;
		final boolean yo;
		final long llegada = Util.getMillis();
		long visto;

		Logro(String jugador, @Nullable UUID id, String titulo, String descripcion, AdvancementType tipo, @Nullable ItemStack icono, boolean yo) {
			this.jugador = jugador;
			this.id = id;
			this.titulo = titulo;
			this.descripcion = descripcion;
			this.tipo = tipo;
			this.icono = icono;
			this.yo = yo;
		}

		boolean mismo(String jugador, String titulo) {
			return this.jugador.equalsIgnoreCase(jugador) && this.titulo.equals(titulo) && Util.getMillis() - this.llegada < MISMO;
		}
	}

	private static final Deque<Logro> COLA = new ArrayDeque<>();
	@Nullable
	private static Logro actual;
	private static long ultimoDibujo;

	/**
	 * Un mensaje del sistema: si es el de «X ha conseguido el logro [Y]», pasa al cartel y devuelve
	 * true (no va al chat).
	 */
	public static boolean deChat(Component mensaje) {
		if (!(mensaje.getContents() instanceof TranslatableContents t) || !t.getKey().startsWith(CLAVE) || t.getArgs().length < 2) return false;
		AdvancementType tipo = switch (t.getKey().substring(CLAVE.length())) {
			case "goal" -> AdvancementType.GOAL;
			case "challenge" -> AdvancementType.CHALLENGE;
			default -> AdvancementType.TASK;
		};
		if (!(t.getArgs()[0] instanceof Component quien) || !(t.getArgs()[1] instanceof Component logro)) return false;

		// Quién: el nombre del jugador lleva su UUID (al pasar el ratón) y su nombre sin el del equipo
		UUID id = null;
		String jugador = quien.getString();
		if (quien.getStyle().getHoverEvent() instanceof HoverEvent.ShowEntity entidad) {
			id = entidad.entity().uuid;
			if (entidad.entity().name.isPresent()) jugador = entidad.entity().name.get().getString();
		}

		// El logro viene entre corchetes; dentro, el título con la descripción al pasar el ratón
		Component dentro = logro;
		if (logro.getContents() instanceof TranslatableContents corchetes && corchetes.getArgs().length == 1 && corchetes.getArgs()[0] instanceof Component c) {
			dentro = c;
		}
		String titulo = dentro.getString();
		String descripcion = "";
		if (dentro.getStyle().getHoverEvent() instanceof HoverEvent.ShowText texto) {
			String completo = texto.value().getString();
			int salto = completo.indexOf('\n');
			if (salto >= 0) descripcion = completo.substring(salto + 1);
		}

		Minecraft juego = Minecraft.getInstance();
		boolean yo = juego.player != null && (id != null ? id.equals(juego.player.getUUID()) : jugador.equalsIgnoreCase(juego.player.getGameProfile().name()));
		poner(jugador, id, titulo, descripcion, tipo, icono(titulo), yo);
		return true;
	}

	/** Tu propio logro (en vez del aviso de arriba a la derecha). */
	public static void deAviso(AdvancementHolder logro) {
		DisplayInfo info = logro.value().display().orElse(null);
		Minecraft juego = Minecraft.getInstance();
		if (info == null || juego.player == null) return;
		poner(juego.player.getGameProfile().name(), juego.player.getUUID(), info.title().getString(), info.description().getString(), info.type(),
				crear(info), true);
	}

	private static void poner(String jugador, @Nullable UUID id, String titulo, String descripcion, AdvancementType tipo, @Nullable ItemStack icono, boolean yo) {
		for (Logro l : actual == null ? COLA : java.util.stream.Stream.concat(java.util.stream.Stream.of(actual), COLA.stream()).toList()) {
			if (l.mismo(jugador, titulo)) {
				if (l.icono == null) l.icono = icono;
				if (l.descripcion.isEmpty()) l.descripcion = descripcion;
				return;
			}
		}
		COLA.add(new Logro(jugador, id, titulo, descripcion, tipo, icono, yo));
	}

	/** El objeto del logro: lo busca por su título entre los logros que conoce el juego. */
	@Nullable
	private static ItemStack icono(String titulo) {
		ClientPacketListener red = Minecraft.getInstance().getConnection();
		if (red == null) return null;
		for (AdvancementNode nodo : red.getAdvancements().tree().nodes()) {
			DisplayInfo info = nodo.holder().value().display().orElse(null);
			if (info != null && info.title().getString().equals(titulo)) return crear(info);
		}
		return null;
	}

	@Nullable
	private static ItemStack crear(DisplayInfo info) {
		try {
			return info.icon().create();
		} catch (RuntimeException e) {
			return null;
		}
	}

	/**
	 * Cada fotograma, encima de todo. Solo avanza (y se ve) jugando o con el chat abierto; con
	 * `siempre` se ve también con otra pantalla (las pruebas).
	 */
	public static void dibujar(GuiGraphicsExtractor g, int ancho, int alto, boolean siempre) {
		long ahora = Util.getMillis();
		long paso = ultimoDibujo == 0 ? 0 : Math.min(100, ahora - ultimoDibujo);
		ultimoDibujo = ahora;
		Minecraft juego = Minecraft.getInstance();
		boolean libre = siempre || juego.gui.screen() == null || juego.gui.screen() instanceof ChatScreen;
		if (!libre) return;
		if (actual == null) {
			actual = COLA.poll();
			if (actual == null) return;
		}
		Logro l = actual;
		// Si hay varios esperando, cada uno dura un poco menos
		long dura = (long) (DURACION * juego.gui.toastManager().getNotificationDisplayTimeMultiplier() * (COLA.size() > 2 ? 0.6 : 1));
		l.visto += paso;
		if (l.visto >= ENTRADA + dura + SALIDA) {
			actual = null;
			return;
		}
		float opacidad = l.visto < ENTRADA ? l.visto / (float) ENTRADA : l.visto > ENTRADA + dura ? 1f - (l.visto - ENTRADA - dura) / (float) SALIDA : 1f;
		opacidad = Mth.clamp(opacidad, 0f, 1f);
		cartel(g, juego.font, l, ancho, alto, opacidad);
	}

	private static int conAlfa(int color, float opacidad) {
		return Math.round(((color >>> 24) & 0xFF) * opacidad) << 24 | (color & 0xFFFFFF);
	}

	private static int colorTipo(AdvancementType tipo) {
		return tipo == AdvancementType.CHALLENGE ? 0xFFD58BFF : tipo == AdvancementType.GOAL ? Estilo.QUESO : 0xFF86CF55;
	}

	private static void cartel(GuiGraphicsExtractor g, Font fuente, Logro l, int ancho, int alto, float opacidad) {
		// Tan ancho como pida el texto (entre un mínimo y un máximo), para no cortar la descripción
		int texto = Math.max(Math.round(fuente.width(l.titulo) * 1.25f), fuente.width(l.descripcion));
		texto = Math.max(texto, 11 + fuente.width(l.jugador + (l.yo ? " tú" : "") + " · " + l.tipo.getDisplayName().getString()));
		int w = Math.min(Math.min(ANCHO_MAX, ancho - 40), Math.max(ANCHO_MIN, 44 + texto + 10));
		int x = (ancho - w) / 2;
		// Arriba en el centro, por debajo de las barras de jefe y por encima de la mira; entra bajando un poco
		int y = Math.max(46, Math.round(alto * 0.2f)) - Math.round((1f - opacidad) * 8f);
		int color = colorTipo(l.tipo);

		Estilo.escalon(g, x, y, w, ALTO, conAlfa(0xF20D1424, opacidad));
		Estilo.bordeEscalon(g, x, y, w, ALTO, conAlfa(l.tipo == AdvancementType.TASK ? 0x50D6E2FF : color, opacidad));
		g.fill(x + 1, y + 1, x + w - 1, y + 2, conAlfa(color, opacidad * 0.8f));

		// El objeto del logro (o un trofeo si no se conoce)
		Estilo.escalon(g, x + 8, y + 9, 28, 28, conAlfa(0xFF1B2236, opacidad));
		if (l.icono != null && !l.icono.isEmpty()) {
			if (opacidad > 0.5f) g.fakeItem(l.icono, x + 14, y + 15);
		} else {
			Estilo.icono(g, IconosPixel.TROFEO, x + 14, y + 15, 2, conAlfa(color, opacidad));
		}

		int tx = x + 44;
		int libre = x + w - 8 - tx;
		// Quién y qué: cara, nombre, «tú» y el tipo de logro
		int cara = tx;
		dibujarCara(g, l, cara, y + 7, opacidad);
		int nx = cara + 11;
		String nombre = Estilo.recortar(fuente, l.jugador, Math.max(20, libre - 11 - fuente.width(" · ") - 60));
		g.text(fuente, nombre, nx, y + 7, conAlfa(Estilo.TEXTO, opacidad), false);
		nx += fuente.width(nombre);
		if (l.yo) {
			g.text(fuente, " tú", nx, y + 7, conAlfa(Estilo.QUESO, opacidad), false);
			nx += fuente.width(" tú");
		}
		String tipo = Estilo.recortar(fuente, " · " + l.tipo.getDisplayName().getString(), x + w - 8 - nx);
		g.text(fuente, tipo, nx, y + 7, conAlfa(Estilo.TENUE, opacidad), false);

		// El nombre del logro, más grande
		float escala = 1.25f;
		String titulo = Estilo.recortar(fuente, l.titulo, Math.round(libre / escala));
		g.pose().pushMatrix();
		g.pose().translate(tx, y + 18);
		g.pose().scale(escala, escala);
		g.text(fuente, titulo, 0, 0, conAlfa(l.tipo == AdvancementType.TASK ? Estilo.TEXTO : color, opacidad), true);
		g.pose().popMatrix();

		if (!l.descripcion.isEmpty()) {
			g.text(fuente, Estilo.recortar(fuente, l.descripcion, libre), tx, y + 32, conAlfa(Estilo.MUY_TENUE, opacidad), false);
		}
	}

	private static void dibujarCara(GuiGraphicsExtractor g, Logro l, int x, int y, float opacidad) {
		if (opacidad < 0.5f) return;
		ClientPacketListener red = Minecraft.getInstance().getConnection();
		PlayerInfo info = red == null ? null : l.id != null ? red.getPlayerInfo(l.id) : red.getPlayerInfo(l.jugador);
		if (info != null) PlayerFaceExtractor.extractRenderState(g, info.getSkin(), x, y, 8);
		else Cabezas.dibujar(g, l.jugador.toLowerCase(Locale.ROOT), x, y, 8);
	}

	/** Solo en las pruebas: un desafío de otro jugador tal como lo manda el servidor por el chat. */
	public static void ejemplo() {
		COLA.clear();
		actual = null;
		Component titulo = Component.literal("Cúbreme de netherita");
		Component ayuda = Component.literal("Cúbreme de netherita").withStyle(net.minecraft.ChatFormatting.DARK_PURPLE).append("\n")
				.append(Component.literal("Consigue una armadura completa de netherita"));
		Component logro = net.minecraft.network.chat.ComponentUtils.wrapInSquareBrackets(titulo.copy().withStyle((s) -> s.withHoverEvent(new HoverEvent.ShowText(ayuda))))
				.withStyle(net.minecraft.ChatFormatting.DARK_PURPLE);
		Component mensaje = Component.translatable(CLAVE + "challenge", Component.literal("SrChrisGamer"), logro);
		RataLand.LOG.info("Prueba: el mensaje de logro del chat {} va al cartel", deChat(mensaje) ? "sí" : "NO");
		// Llega otra vez (como tu propio aviso tras la línea del chat): no se repite
		deChat(mensaje);
		RataLand.LOG.info("Prueba: logros en cola {} (repetido unido)", COLA.size());
	}
}
