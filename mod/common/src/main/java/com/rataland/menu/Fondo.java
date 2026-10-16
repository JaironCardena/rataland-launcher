package com.rataland.menu;

import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.util.ARGB;

/** Dibuja el paisaje de la temporada cubriendo toda la pantalla (como background-size: cover). Las escenas animadas además se mueven. */
public final class Fondo {
	private Fondo() {}

	public static void dibujar(GuiGraphicsExtractor context, int ancho, int alto) {
		dibujar(context, ancho, alto, true);
	}

	/** Con `animado` a false, solo la imagen fija (en la pantalla de carga, mientras aparece o se va). */
	public static void dibujar(GuiGraphicsExtractor context, int ancho, int alto, boolean animado) {
		dibujar(context, ancho, alto, animado, 1f);
	}

	/** Igual, con la imagen fija medio transparente (`opacidad` de 0 a 1). */
	public static void dibujar(GuiGraphicsExtractor context, int ancho, int alto, boolean animado, float opacidad) {
		float escala = Math.max(ancho / (float) RataLand.FONDO_ANCHO, alto / (float) RataLand.FONDO_ALTO);
		int w = Math.round(RataLand.FONDO_ANCHO * escala);
		int h = Math.round(RataLand.FONDO_ALTO * escala);
		int x = (ancho - w) / 2;
		int y = alto - h;
		context.blit(RenderPipelines.GUI_TEXTURED, RataLand.fondoActual(), x, y, 0, 0, w, h, RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO, RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO, ARGB.white(opacidad));
		if (animado) FondoAnimado.dibujar(context, x, y, w, h);
	}
}
