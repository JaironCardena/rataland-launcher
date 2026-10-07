package com.rataland.menu;

import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Piezas pequeñas de los menús: la etiqueta de la temporada y el cartel de la cuenta atrás. */
public final class Cartel {
	private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM, HH:mm", Locale.of("es"));
	/** Hueco para el reloj a la izquierda (icono de 16 y separación). */
	private static final int RELOJ = 16 + 9;

	private Cartel() {
	}

	/** Etiqueta con borde de queso (como la del launcher). Devuelve su alto. */
	public static int chip(GuiGraphics context, Font fuente, int x, int y, String texto) {
		Estilo.etiqueta(context, fuente, x, y, texto);
		return 15;
	}

	/** ¿Hay una cuenta atrás que enseñar? (desde que se anuncia hasta que acaba el evento) */
	public static boolean hayCuentaAtras() {
		return RataLand.eventoInicio > 0 && System.currentTimeMillis() < RataLand.eventoFin;
	}

	/** Alto del cartel con el tiempo a esa escala (título, tiempo y fecha). */
	public static int altoCuentaAtras(float escalaTiempo) {
		return 7 + 9 + 3 + Math.round(8 * escalaTiempo) + 4 + 9 + 6;
	}

	/** Ancho del cartel, para colocarlo pegado a la derecha. */
	public static int anchoCuentaAtras(Font fuente, float escalaTiempo) {
		String[] t = textos();
		int texto = Math.max(Math.max(fuente.width(t[0]), fuente.width(t[2])), Math.round(fuente.width(t[1]) * escalaTiempo));
		return RELOJ + texto + 18;
	}

	/** El cartel de la cuenta atrás: marco de queso, reloj, título, el tiempo en grande y el día. */
	public static void cuentaAtras(GuiGraphics context, Font fuente, int x, int y, float escalaTiempo) {
		String[] t = textos();
		int w = anchoCuentaAtras(fuente, escalaTiempo);
		int h = altoCuentaAtras(escalaTiempo);
		Estilo.marcoQueso(context, x, y, w, h);
		Estilo.icono(context, IconosPixel.RELOJ, x + 9, y + (h - 16) / 2, 2, Estilo.QUESO);
		int tx = x + 9 + RELOJ;
		context.drawString(fuente, t[0], tx, y + 7, Estilo.TENUE);
		context.pose().pushPose();
		context.pose().translate(tx, y + 7 + 9 + 3, 0f);
		context.pose().scale(escalaTiempo, escalaTiempo, 1f);
		context.drawString(fuente, t[1], 0, 0, Estilo.QUESO);
		context.pose().popPose();
		context.drawString(fuente, t[2], tx, y + h - 6 - 9, Estilo.TENUE);
	}

	private static String[] textos() {
		long ahora = System.currentTimeMillis();
		String titulo = RataLand.eventoTitulo.isEmpty() ? "El próximo evento" : RataLand.eventoTitulo;
		String dia = FECHA.format(Instant.ofEpochMilli(RataLand.eventoInicio).atZone(ZoneId.systemDefault()));
		dia = dia.isEmpty() ? dia : Character.toUpperCase(dia.charAt(0)) + dia.substring(1);
		if (ahora >= RataLand.eventoInicio) return new String[] {titulo, "¡Ya empezó!", dia};
		return new String[] {titulo + " empieza en", formatear(RataLand.eventoInicio - ahora), dia};
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
