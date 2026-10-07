package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;

/**
 * Botón con el estilo de RataLand: bloque de hierba (el principal), piedra (los demás), piedra con
 * texto rojizo (salir) o el azul de Discord. Puede llevar un icono pixel: delante del texto, solo
 * (botón cuadrado, con el texto como ayuda al pasar el ratón) o encima del texto (ficha).
 */
public class BotonRataLand extends Button {
	public enum Estilo { HIERBA, PIEDRA, PELIGRO, DISCORD }

	private final Estilo estilo;
	private final float escalaTexto;
	private String[] icono;
	private int colorIcono = 0xFFFFFFFF;
	private boolean ficha;

	public BotonRataLand(int x, int y, int ancho, int alto, Component texto, OnPress accion, Estilo estilo, float escalaTexto) {
		super(x, y, ancho, alto, texto, accion, DEFAULT_NARRATION);
		this.estilo = estilo;
		this.escalaTexto = escalaTexto;
	}

	public BotonRataLand(int x, int y, int ancho, int alto, Component texto, OnPress accion, Estilo estilo) {
		this(x, y, ancho, alto, texto, accion, estilo, 1f);
	}

	/** Icono pixel delante del texto (o solo, si el botón es cuadrado). */
	public BotonRataLand conIcono(String[] icono, int color) {
		this.icono = icono;
		this.colorIcono = color;
		if (soloIcono()) setTooltip(Tooltip.create(getMessage()));
		return this;
	}

	/** Icono encima del texto, como las fichas de la pausa. */
	public BotonRataLand comoFicha() {
		this.ficha = true;
		return this;
	}

	private boolean soloIcono() {
		return icono != null && !ficha && getWidth() <= getHeight() + 4;
	}

	@Override
	protected void renderWidget(GuiGraphics context, int mouseX, int mouseY, float delta) {
		int x = getX();
		int y = getY();
		int w = getWidth();
		int h = getHeight();
		boolean encima = isHovered() && this.active;
		boolean foco = isFocused() && !isHovered();

		if (estilo == Estilo.HIERBA) {
			context.fill(x, y, x + w, y + h, foco ? com.rataland.menu.Estilo.QUESO : 0xFF1B120B);
			mosaico(context, RataLand.BOTON_TIERRA, x + 1, y + 1, w - 2, h - 2, 16, 16);
			mosaico(context, RataLand.BOTON_HIERBA, x + 1, y + 1, w - 2, Math.min(6, h - 2), 16, 6);
			context.fill(x + 1, y + 1, x + w - 1, y + 2, 0x30FFFFFF);
			context.fill(x + 1, y + h - 3, x + w - 1, y + h - 1, 0x4C000000);
			if (encima) context.fill(x + 1, y + 1, x + w - 1, y + h - 1, 0x22FFFFFF);
			if (!this.active) context.fill(x + 1, y + 1, x + w - 1, y + h - 1, 0x88000000);
		} else {
			int fondo = estilo == Estilo.PELIGRO ? com.rataland.menu.Estilo.PELIGRO
					: estilo == Estilo.DISCORD ? com.rataland.menu.Estilo.DISCORD : com.rataland.menu.Estilo.PIEDRA;
			com.rataland.menu.Estilo.botonPiedra(context, x, y, w, h, fondo, encima, foco, this.active);
		}

		int color = !this.active ? com.rataland.menu.Estilo.MUY_TENUE : encima ? 0xFFFFFFA0 : estilo == Estilo.PELIGRO ? 0xFFFF9A8A : 0xFFFFFFFF;
		Font fuente = Minecraft.getInstance().font;

		if (soloIcono()) {
			int p = Math.max(1, Math.min(w, h) / 12);
			com.rataland.menu.Estilo.icono(context, icono, x + (w - 8 * p) / 2, y + (h - 8 * p) / 2, p, encima ? 0xFFFFFFA0 : colorIcono);
			return;
		}
		if (ficha && icono != null) {
			int alto = 8 + 4 + 8;
			int iy = y + (h - alto) / 2;
			com.rataland.menu.Estilo.icono(context, icono, x + (w - 8) / 2, iy, 1, colorIcono);
			context.drawCenteredString(fuente, com.rataland.menu.Estilo.recortar(fuente, getMessage().getString(), w - 4), x + w / 2, iy + 12, color);
			return;
		}

		float cy = y + h / 2f + (estilo == Estilo.HIERBA ? 1.5f : 0f);
		float anchoTexto = fuente.width(getMessage()) * escalaTexto;
		float cx = x + w / 2f;
		if (icono != null) {
			// Icono y texto centrados juntos
			float total = 8 + 6 + anchoTexto;
			float inicio = x + (w - total) / 2f;
			com.rataland.menu.Estilo.icono(context, icono, Math.round(inicio), Math.round(cy - 4), 1, color == 0xFFFFFFFF ? colorIcono : color);
			cx = inicio + 14 + anchoTexto / 2f;
		}
		context.pose().pushPose();
		context.pose().translate(cx, cy, 0);
		context.pose().scale(escalaTexto, escalaTexto, 1f);
		context.drawCenteredString(fuente, getMessage(), 0, -4, color);
		context.pose().popPose();
	}

	private static void mosaico(GuiGraphics context, ResourceLocation textura, int x, int y, int w, int h, int tw, int th) {
		for (int py = y; py < y + h; py += th) {
			for (int px = x; px < x + w; px += tw) {
				int cw = Math.min(tw, x + w - px);
				int ch = Math.min(th, y + h - py);
				context.blit(textura, px, py, 0, 0, cw, ch, tw, th);
			}
		}
	}
}
