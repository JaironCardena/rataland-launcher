package com.rataland.menu;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

/**
 * Botón con el estilo de RataLand: bloque de hierba (el principal), piedra (los demás)
 * o piedra con texto rojizo (salir del servidor).
 */
public class BotonRataLand extends ButtonWidget {
	public enum Estilo { HIERBA, PIEDRA, PELIGRO }

	private final Estilo estilo;
	private final float escalaTexto;

	public BotonRataLand(int x, int y, int ancho, int alto, Text texto, PressAction accion, Estilo estilo, float escalaTexto) {
		super(x, y, ancho, alto, texto, accion, DEFAULT_NARRATION_SUPPLIER);
		this.estilo = estilo;
		this.escalaTexto = escalaTexto;
	}

	public BotonRataLand(int x, int y, int ancho, int alto, Text texto, PressAction accion, Estilo estilo) {
		this(x, y, ancho, alto, texto, accion, estilo, 1f);
	}

	@Override
	protected void renderWidget(DrawContext context, int mouseX, int mouseY, float delta) {
		int x = getX();
		int y = getY();
		int w = getWidth();
		int h = getHeight();
		boolean encima = isSelected() && this.active;

		context.fill(x, y, x + w, y + h, estilo == Estilo.HIERBA ? 0xFF1B120B : 0xFF10141D);
		int ix = x + 1;
		int iy = y + 1;
		int iw = w - 2;
		int ih = h - 2;
		if (estilo == Estilo.HIERBA) {
			mosaico(context, RataLand.BOTON_TIERRA, ix, iy, iw, ih, 16, 16);
			mosaico(context, RataLand.BOTON_HIERBA, ix, iy, iw, Math.min(6, ih), 16, 6);
		} else {
			context.fill(ix, iy, ix + iw, iy + ih, estilo == Estilo.PELIGRO ? 0xFF2B2230 : 0xFF3A4152);
		}
		// Relieve: luz arriba, sombra abajo
		context.fill(ix, iy, ix + iw, iy + 1, 0x30FFFFFF);
		context.fill(ix, iy + ih - 2, ix + iw, iy + ih, 0x4C000000);
		if (encima) context.fill(ix, iy, ix + iw, iy + ih, 0x22FFFFFF);
		if (!this.active) context.fill(ix, iy, ix + iw, iy + ih, 0x88000000);

		int color = !this.active ? 0xFFA0A0A0 : encima ? 0xFFFFFFA0 : estilo == Estilo.PELIGRO ? 0xFFFF9A8A : 0xFFFFFFFF;
		TextRenderer fuente = MinecraftClient.getInstance().textRenderer;
		float cx = x + w / 2f;
		float cy = y + h / 2f + (estilo == Estilo.HIERBA ? 1.5f : 0f);
		context.getMatrices().push();
		context.getMatrices().translate(cx, cy, 0);
		context.getMatrices().scale(escalaTexto, escalaTexto, 1f);
		context.drawCenteredTextWithShadow(fuente, getMessage(), 0, -4, color);
		context.getMatrices().pop();
	}

	private static void mosaico(DrawContext context, Identifier textura, int x, int y, int w, int h, int tw, int th) {
		for (int py = y; py < y + h; py += th) {
			for (int px = x; px < x + w; px += tw) {
				int cw = Math.min(tw, x + w - px);
				int ch = Math.min(th, y + h - py);
				context.drawTexture(textura, px, py, 0, 0, cw, ch, tw, th);
			}
		}
	}
}
