package com.rataland.menu;

import net.minecraft.client.gui.DrawContext;

/** Dibuja el paisaje de la temporada cubriendo toda la pantalla (como background-size: cover). */
public final class Fondo {
	private Fondo() {}

	public static void dibujar(DrawContext context, int ancho, int alto) {
		float escala = Math.max(ancho / (float) RataLand.FONDO_ANCHO, alto / (float) RataLand.FONDO_ALTO);
		int w = Math.round(RataLand.FONDO_ANCHO * escala);
		int h = Math.round(RataLand.FONDO_ALTO * escala);
		int x = (ancho - w) / 2;
		int y = alto - h;
		context.drawTexture(RataLand.fondoActual(), x, y, w, h, 0, 0,
				RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO, RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO);
	}

	/** Oscurece la parte izquierda (donde van el logo y los botones) para que se lean bien. */
	public static void oscurecerIzquierda(DrawContext context, int ancho, int alto) {
		int hasta = (int) (ancho * 0.62f);
		int pasos = 24;
		for (int i = 0; i < pasos; i++) {
			int x0 = hasta * i / pasos;
			int x1 = hasta * (i + 1) / pasos;
			int alfa = (int) (0xD8 * (1f - (float) i / pasos));
			context.fill(x0, 0, x1, alto, (alfa << 24) | 0x0A1020);
		}
	}
}
