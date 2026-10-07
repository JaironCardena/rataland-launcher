package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.network.chat.Component;

/** Enlace de texto en color queso (subrayado al pasar el ratón o con el foco), como «Ver en YouTube». */
public class EnlaceRataLand extends Button {
	public EnlaceRataLand(int x, int y, Component texto, OnPress accion) {
		super(x, y, Minecraft.getInstance().font.width(texto) + 2, 11, texto, accion, DEFAULT_NARRATION);
	}

	@Override
	protected void renderWidget(GuiGraphics g, int mouseX, int mouseY, float delta) {
		boolean marcado = isHoveredOrFocused();
		int color = marcado ? 0xFFFFD76A : Estilo.QUESO;
		g.drawString(Minecraft.getInstance().font, getMessage(), getX() + 1, getY() + 1, color);
		if (marcado) g.fill(getX() + 1, getY() + 10, getX() + getWidth() - 1, getY() + 11, color);
	}
}
