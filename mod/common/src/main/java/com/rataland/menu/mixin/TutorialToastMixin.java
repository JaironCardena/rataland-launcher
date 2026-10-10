package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.TutorialToast;
import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Los consejos para jugadores nuevos (moverse, mirar alrededor, talar un árbol…) con el aspecto de
 * los avisos de RataLand, y su barra de progreso en queso. Los iconos son los de Minecraft.
 */
@Mixin(TutorialToast.class)
public abstract class TutorialToastMixin implements Toast {
	/** Minecraft pinta la barra de 3 a 157 (154 de ancho) para su aviso de 160. */
	@Unique
	private static final int RATALAND_BARRA = AvisoRataLand.ANCHO - 6;

	@Override
	public int width() {
		return AvisoRataLand.ANCHO;
	}

	@Redirect(method = "render", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V"))
	private void rataland$fondo(GuiGraphics g, ResourceLocation sprite, int x, int y, int w, int h) {
		AvisoRataLand.fondo(g, w, h, 0x30D6E2FF);
		AvisoRataLand.cajaIcono(g);
	}

	@ModifyArg(method = "render", index = 4, at = @At(value = "INVOKE", ordinal = 0,
			target = "Lnet/minecraft/client/gui/GuiGraphics;drawString(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)I"))
	private int rataland$colorSoloTitulo(int color) {
		return Estilo.TEXTO;
	}

	@ModifyArg(method = "render", index = 4, at = @At(value = "INVOKE", ordinal = 1,
			target = "Lnet/minecraft/client/gui/GuiGraphics;drawString(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)I"))
	private int rataland$colorTitulo(int color) {
		return Estilo.TEXTO;
	}

	@ModifyArg(method = "render", index = 4, at = @At(value = "INVOKE", ordinal = 2,
			target = "Lnet/minecraft/client/gui/GuiGraphics;drawString(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)I"))
	private int rataland$colorTexto(int color) {
		return Estilo.TENUE;
	}

	/** La barra de progreso: el fondo oscuro y lo hecho en queso, a lo ancho del aviso. */
	@Redirect(method = "render", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphics;fill(IIIII)V"))
	private void rataland$barra(GuiGraphics g, int x1, int y1, int x2, int y2, int color) {
		if (color == -1) {
			g.fill(3, 28, 3 + RATALAND_BARRA, 29, 0xFF2B3346);
		} else {
			g.fill(3, 28, 3 + Math.round((x2 - 3) / 154f * RATALAND_BARRA), 29, Estilo.QUESO);
		}
	}
}
