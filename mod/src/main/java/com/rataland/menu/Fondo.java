package com.rataland.menu;

import net.minecraft.client.gui.DrawContext;

/** Dibuja el paisaje de RataLand cubriendo toda la pantalla (como background-size: cover). */
public final class Fondo {
	private Fondo() {}

	public static void dibujar(DrawContext context, int ancho, int alto) {
		float escala = Math.max(ancho / (float) RataLand.FONDO_ANCHO, alto / (float) RataLand.FONDO_ALTO);
		int w = Math.round(RataLand.FONDO_ANCHO * escala);
		int h = Math.round(RataLand.FONDO_ALTO * escala);
		int x = (ancho - w) / 2;
		int y = alto - h;
		context.drawTexture(RataLand.FONDO, x, y, w, h, 0, 0,
				RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO, RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO);
	}
}
