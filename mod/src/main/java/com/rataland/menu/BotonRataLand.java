package com.rataland.menu;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

/**
 * Botón con el estilo de RataLand: bloque de hierba (el principal), piedra (los demás),
 * piedra con texto rojizo (salir del servidor) o el azul de Discord (cuadrado, con su icono).
 */
public class BotonRataLand extends ButtonWidget {
	public enum Estilo { HIERBA, PIEDRA, PELIGRO, DISCORD }

	// Icono de Discord en pixel (8×8): una burbuja con dos ojos
	private static final String[] ICONO_DISCORD = {
			"........", ".######.", "########", "##.##.##", "########", "########", ".#....#.", "........"
	};

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
			int fondo = estilo == Estilo.PELIGRO ? 0xFF2B2230 : estilo == Estilo.DISCORD ? 0xFF4F5BD5 : 0xFF3A4152;
			context.fill(ix, iy, ix + iw, iy + ih, fondo);
		}
		// Relieve: luz arriba, sombra abajo
		context.fill(ix, iy, ix + iw, iy + 1, 0x30FFFFFF);
		context.fill(ix, iy + ih - 2, ix + iw, iy + ih, 0x4C000000);
		if (encima) context.fill(ix, iy, ix + iw, iy + ih, 0x22FFFFFF);
		if (!this.active) context.fill(ix, iy, ix + iw, iy + ih, 0x88000000);

		// Botón cuadrado de Discord: solo el icono
		if (estilo == Estilo.DISCORD && w <= h + 4) {
			int p = Math.max(1, Math.min(iw, ih) / 12);
			int ox = x + (w - 8 * p) / 2;
			int oy = y + (h - 8 * p) / 2;
			for (int fy = 0; fy < 8; fy++) {
				for (int fx = 0; fx < 8; fx++) {
					if (ICONO_DISCORD[fy].charAt(fx) == '#') context.fill(ox + fx * p, oy + fy * p, ox + (fx + 1) * p, oy + (fy + 1) * p, encima ? 0xFFFFFFA0 : 0xFFFFFFFF);
				}
			}
			return;
		}

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
