package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.toasts.RecipeToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * «¡Nuevas recetas desbloqueadas!» con el aspecto de los avisos de RataLand: panel oscuro del mismo
 * ancho, hueco para el objeto y el título en queso. Las recetas que van pasando son las de Minecraft.
 */
@Mixin(RecipeToast.class)
public abstract class RecipeToastMixin implements Toast {
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
	private int rataland$colorTitulo(int color) {
		return Estilo.QUESO;
	}

	@ModifyArg(method = "render", index = 4, at = @At(value = "INVOKE", ordinal = 1,
			target = "Lnet/minecraft/client/gui/GuiGraphics;drawString(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)I"))
	private int rataland$colorTexto(int color) {
		return Estilo.TENUE;
	}
}
