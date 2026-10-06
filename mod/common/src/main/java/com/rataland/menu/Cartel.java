package com.rataland.menu;

import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;

/** Piezas pequeñas de los menús: la etiqueta de la temporada y el cartel de la cuenta atrás. */
public final class Cartel {
	private static final int QUESO = 0xFFF6C445;

	private Cartel() {
	}

	/** Etiqueta con borde de queso (como la del launcher). Devuelve su alto. */
	public static int chip(GuiGraphics context, Font fuente, int x, int y, String texto) {
		int w = fuente.width(texto) + 12;
		int h = 15;
		context.fill(x, y, x + w, y + h, 0x990D1424);
		context.renderOutline(x, y, w, h, QUESO);
		context.drawString(fuente, texto, x + 6, y + 4, QUESO);
		return h;
	}

	/** ¿Hay una cuenta atrás que enseñar? (desde que se anuncia hasta que acaba el evento) */
	public static boolean hayCuentaAtras() {
		return RataLand.eventoInicio > 0 && System.currentTimeMillis() < RataLand.eventoFin;
	}

	/** Alto del cartel con el tiempo a esa escala. */
	public static int altoCuentaAtras(float escalaTiempo) {
		return 7 + 9 + 3 + Math.round(8 * escalaTiempo) + 8;
	}

	/** Ancho del cartel, para colocarlo pegado a la derecha. */
	public static int anchoCuentaAtras(Font fuente, float escalaTiempo) {
		String[] t = textos();
		return Math.max(fuente.width(t[0]), Math.round(fuente.width(t[1]) * escalaTiempo)) + 18;
	}

	/** El cartel de la cuenta atrás: marco de queso, título y el tiempo en grande. */
	public static void cuentaAtras(GuiGraphics context, Font fuente, int x, int y, float escalaTiempo) {
		String[] t = textos();
		int w = anchoCuentaAtras(fuente, escalaTiempo);
		int h = altoCuentaAtras(escalaTiempo);
		context.fill(x, y, x + w, y + h, 0xE60D1424);
		context.renderOutline(x, y, w, h, QUESO);
		context.renderOutline(x + 2, y + 2, w - 4, h - 4, 0x40F6C445);
		context.drawString(fuente, t[0], x + 9, y + 7, 0xFFA3B0C8);
		context.pose().pushPose();
		context.pose().translate(x + 9, y + 7 + 9 + 3, 0f);
		context.pose().scale(escalaTiempo, escalaTiempo, 1f);
		context.drawString(fuente, t[1], 0, 0, QUESO);
		context.pose().popPose();
	}

	private static String[] textos() {
		long ahora = System.currentTimeMillis();
		String titulo = RataLand.eventoTitulo.isEmpty() ? "El próximo evento" : RataLand.eventoTitulo;
		if (ahora >= RataLand.eventoInicio) return new String[] {titulo, "¡Ya empezó!"};
		return new String[] {titulo + " empieza en", formatear(RataLand.eventoInicio - ahora)};
	}

	private static String formatear(long ms) {
		long s = ms / 1000;
		long d = s / 86400;
		long h = s / 3600 % 24;
		long m = s / 60 % 60;
		if (d > 0) return String.format("%dd %02dh %02dm", d, h, m);
		return String.format("%02dh %02dm %02ds", h, m, s % 60);
	}
}
