package com.rataland.menu.mixin;

import net.minecraft.client.renderer.RenderPipelines;
import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.advancements.AdvancementWidget;
import com.mojang.renderpearl.api.pipeline.RenderPipeline;
import net.minecraft.resources.Identifier;
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
	@Redirect(method = "extractHover", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;blitSprite(Lcom/mojang/renderpearl/api/pipeline/RenderPipeline;Lnet/minecraft/resources/Identifier;IIII)V"))
	private void rataland$panel(GuiGraphicsExtractor g, RenderPipeline tuberia, Identifier sprite, int x, int y, int w, int h) {
		if (!sprite.getPath().equals("advancements/title_box")) {
			g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite, x, y, w, h);
			return;
		}
		Estilo.escalon(g, x, y, w, h, 0xF20D1424);
		Estilo.bordeEscalon(g, x, y, w, h, Estilo.LINEA);
	}

	@Redirect(method = "extractHover", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;blitSprite(Lcom/mojang/renderpearl/api/pipeline/RenderPipeline;Lnet/minecraft/resources/Identifier;IIIIIIII)V"))
	private void rataland$barra(GuiGraphicsExtractor g, RenderPipeline tuberia, Identifier sprite, int anchoTextura, int altoTextura, int u, int v, int x, int y,
			int w, int h) {
		if (w <= 0) return;
		boolean conseguido = sprite.getPath().endsWith("box_obtained");
		int base = conseguido ? 0xFF8A5A14 : Estilo.PIEDRA;
		g.fill(x, y, x + w, y + h, Estilo.BORDE_BOTON);
		g.fill(x, y + 1, x + w, y + h - 1, base);
		g.fill(x, y + 1, x + w, y + 2, conseguido ? 0xFFB8701A : 0x30FFFFFF);
		g.fill(x, y + h - 3, x + w, y + h - 1, 0x4C000000);
	}
}
