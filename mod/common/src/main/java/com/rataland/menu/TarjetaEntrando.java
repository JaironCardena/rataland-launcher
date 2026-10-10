package com.rataland.menu;

import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.Util;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.minecraft.util.Mth;

/**
 * «Entrando en RataLand»: la tarjeta que se ve mientras te conectas al servidor y mientras carga el
 * mundo, con los pasos (servidor encontrado → conectando → cargando el mundo), la barra de queso con
 * la rata y un consejo debajo.
 */
public final class TarjetaEntrando {
	private TarjetaEntrando() {}

	private static final String[] CONSEJOS = {
			"En la pausa tienes Discord a un clic para hablar con el resto de ratas.",
			"Tu skin se cambia desde el launcher, también sin premium.",
			"Cuando el servidor está dormido, tarda un par de minutos en despertar.",
			"Las novedades de la serie salen en el launcher.",
			"Antes de cada episodio verás una cuenta atrás en el menú y en la pausa."
	};
	private static String consejo = CONSEJOS[0];

	/** Cambia el consejo (al empezar a entrar). */
	public static void nuevoConsejo() {
		consejo = CONSEJOS[(int) (Math.random() * CONSEJOS.length)];
	}

	private static final int ANCHO = 300;

	/** Rectángulo de la tarjeta {x, y, ancho, alto}. */
	public static int[] caja(int ancho, int alto, boolean conBoton) {
		int w = Math.min(ANCHO, ancho - 40);
		int h = conBoton ? 126 : 98;
		return new int[] {(ancho - w) / 2, Math.max(10, alto / 2 - h / 2 - 22), w, h};
	}

	/** Dónde va el botón Cancelar {x, y, ancho}. */
	public static int[] boton(int ancho, int alto) {
		int[] c = caja(ancho, alto, true);
		return new int[] {c[0] + (c[2] - 110) / 2, c[1] + c[3] - 30, 110};
	}

	/** En qué paso va la conexión según el texto que pone Minecraft (1 buscando, 2 conectando, 3 cargando el mundo). */
	public static int paso(Component estado) {
		if (estado != null && estado.getContents() instanceof TranslatableContents t) {
			return switch (t.getKey()) {
				case "connect.resolving" -> 1;
				case "connect.joining" -> 3;
				default -> 2;
			};
		}
		return 2;
	}

	public static void dibujar(GuiGraphics g, Font fuente, int ancho, int alto, int paso, boolean conBoton) {
		// Algo más oscuro el paisaje, para que la tarjeta destaque
		g.fill(0, 0, ancho, alto, 0x66080D1A);
		int[] c = caja(ancho, alto, conBoton);
		int x = c[0];
		int y = c[1];
		int w = c[2];
		Estilo.escalon(g, x, y, w, c[3], 0xEB0D1424);
		Estilo.bordeEscalon(g, x, y, w, c[3], Estilo.LINEA);

		g.pose().pushPose();
		g.pose().translate(x + 14, y + 12, 0f);
		g.pose().scale(1.5f, 1.5f, 1f);
		g.drawString(fuente, "Entrando en " + RataLand.nombre, 0, 0, Estilo.TEXTO);
		g.pose().popPose();

		String[] nombres = {paso > 1 ? "Servidor encontrado" : "Buscando el servidor", "Conectando", "Cargando el mundo"};
		int fy = y + 34;
		for (int i = 1; i <= 3; i++) {
			String texto = nombres[i - 1];
			if (i < paso) {
				Estilo.icono(g, IconosPixel.HECHO, x + 14, fy, 1, Estilo.HIERBA_LUZ);
				g.drawString(fuente, texto, x + 28, fy, Estilo.TEXTO);
			} else if (i == paso) {
				g.fill(x + 14, fy + 1, x + 20, fy + 7, Estilo.QUESO);
				g.drawString(fuente, texto + puntos(), x + 28, fy, Estilo.QUESO);
			} else {
				g.renderOutline(x + 15, fy + 1, 6, 6, Estilo.MUY_TENUE);
				g.drawString(fuente, texto, x + 28, fy, Estilo.MUY_TENUE);
			}
			fy += 12;
		}

		barra(g, x + 14, y + 34 + 36 + 14, w - 28, paso == 1 ? 0.2f : paso == 2 ? 0.5f : 0.82f);
		dibujarConsejo(g, fuente, ancho, alto, y + c[3] + 14);
	}

	/** Barra de queso con la rata corriendo, llena hasta base (y un poco arriba y abajo, para que se mueva). */
	static void barra(GuiGraphics g, int bx, int by, int bw, float base) {
		float avance = Mth.clamp(base + 0.04f * Mth.sin((Util.getMillis() % 4000L) / 4000f * Mth.TWO_PI), 0f, 1f);
		int lleno = Math.round(bw * avance);
		g.fill(bx, by, bx + bw, by + 6, 0xFF0A0F1C);
		g.fill(bx + 1, by + 1, bx + bw - 1, by + 5, 0xFF141B2E);
		g.fill(bx + 1, by + 1, bx + lleno, by + 5, Estilo.QUESO);
		g.fill(bx + 1, by + 1, bx + lleno, by + 2, Estilo.QUESO_LUZ);
		g.fill(bx + 1, by + 4, bx + lleno, by + 5, Estilo.QUESO_SOMBRA);
		int salto = (Util.getMillis() / 150) % 2 == 0 ? 0 : 1;
		RenderSystem.enableBlend();
		g.blit(RataLand.RATA, bx + lleno - 12, by - 10 + salto, 0, 0, 16, 10, 16, 10);
		RenderSystem.disableBlend();
	}

	/** El consejo, debajo de la tarjeta (en `cy`), si cabe. */
	static void dibujarConsejo(GuiGraphics g, Font fuente, int ancho, int alto, int cy) {
		int cw = Math.min(380, ancho - 40);
		int chipAncho = fuente.width("Consejo") + 12;
		java.util.List<net.minecraft.util.FormattedCharSequence> lineas = fuente.split(Component.literal(consejo), cw - chipAncho - 20);
		if (lineas.size() > 2) lineas = lineas.subList(0, 2);
		int ch = Math.max(22, 8 + lineas.size() * 10 + 4);
		if (cy + ch <= alto - 6) {
			int cx = (ancho - cw) / 2;
			Estilo.panel(g, cx, cy, cw, ch);
			Estilo.etiqueta(g, fuente, cx + 6, cy + (ch - 15) / 2, "Consejo");
			int ty = cy + (ch - lineas.size() * 10) / 2 + 1;
			for (net.minecraft.util.FormattedCharSequence linea : lineas) {
				g.drawString(fuente, linea, cx + 6 + chipAncho + 8, ty, Estilo.CLARO);
				ty += 10;
			}
		}
	}

	static String puntos() {
		return ".".repeat((int) (Util.getMillis() / 400 % 4));
	}
}
