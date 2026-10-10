package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.advancements.AdvancementWidget;
import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * El recuadro que sale al pasar el ratón por un logro, con el estilo de RataLand: la barra del
 * nombre en ámbar (lo conseguido) y piedra (lo que falta), y la descripción en un panel oscuro.
 * El marco del icono del logro sigue siendo el de Minecraft.
 */
@Mixin(AdvancementWidget.class)
public abstract class AdvancementWidgetMixin {
	@Redirect(method = "drawHover", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V"))
	private void rataland$panel(GuiGraphics g, ResourceLocation sprite, int x, int y, int w, int h) {
		if (!sprite.getPath().equals("advancements/title_box")) {
			g.blitSprite(sprite, x, y, w, h);
			return;
		}
		Estilo.escalon(g, x, y, w, h, 0xF20D1424);
		Estilo.bordeEscalon(g, x, y, w, h, Estilo.LINEA);
	}

	@Redirect(method = "drawHover", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIIIIIII)V"))
	private void rataland$barra(GuiGraphics g, ResourceLocation sprite, int anchoTextura, int altoTextura, int u, int v, int x, int y, int w, int h) {
		if (w <= 0) return;
		boolean conseguido = sprite.getPath().endsWith("box_obtained");
		int base = conseguido ? 0xFF8A5A14 : Estilo.PIEDRA;
		g.fill(x, y, x + w, y + h, Estilo.BORDE_BOTON);
		g.fill(x, y + 1, x + w, y + h - 1, base);
		g.fill(x, y + 1, x + w, y + 2, conseguido ? 0xFFB8701A : 0x30FFFFFF);
		g.fill(x, y + h - 3, x + w, y + h - 1, 0x4C000000);
	}
}
