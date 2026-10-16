package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.RecipeToast;
import net.minecraft.client.gui.components.toasts.Toast;
import com.mojang.renderpearl.api.pipeline.RenderPipeline;
import net.minecraft.resources.Identifier;
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

	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;blitSprite(Lcom/mojang/renderpearl/api/pipeline/RenderPipeline;Lnet/minecraft/resources/Identifier;IIII)V"))
	private void rataland$fondo(GuiGraphicsExtractor g, RenderPipeline tuberia, Identifier sprite, int x, int y, int w, int h) {
		AvisoRataLand.fondo(g, w, h, 0x30D6E2FF);
		AvisoRataLand.cajaIcono(g);
	}

	@ModifyArg(method = "extractRenderState", index = 4, at = @At(value = "INVOKE", ordinal = 0,
			target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;text(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)V"))
	private int rataland$colorTitulo(int color) {
		return Estilo.QUESO;
	}

	@ModifyArg(method = "extractRenderState", index = 4, at = @At(value = "INVOKE", ordinal = 1,
			target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;text(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)V"))
	private int rataland$colorTexto(int color) {
		return Estilo.TENUE;
	}
}
