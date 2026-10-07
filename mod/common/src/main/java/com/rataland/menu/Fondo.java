package com.rataland.menu;

import net.minecraft.client.gui.GuiGraphics;

/** Dibuja el paisaje de la temporada cubriendo toda la pantalla (como background-size: cover). Las escenas animadas además se mueven. */
public final class Fondo {
	private Fondo() {}

	public static void dibujar(GuiGraphics context, int ancho, int alto) {
		dibujar(context, ancho, alto, true);
	}

	/** Con `animado` a false, solo la imagen fija (en la pantalla de carga, mientras aparece o se va). */
	public static void dibujar(GuiGraphics context, int ancho, int alto, boolean animado) {
		float escala = Math.max(ancho / (float) RataLand.FONDO_ANCHO, alto / (float) RataLand.FONDO_ALTO);
		int w = Math.round(RataLand.FONDO_ANCHO * escala);
		int h = Math.round(RataLand.FONDO_ALTO * escala);
		int x = (ancho - w) / 2;
		int y = alto - h;
		context.blit(RataLand.fondoActual(), x, y, w, h, 0, 0,
				RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO, RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO);
		if (animado) FondoAnimado.dibujar(context, x, y, w, h);
	}
}
