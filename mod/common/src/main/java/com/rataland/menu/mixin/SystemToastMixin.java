package com.rataland.menu.mixin;

import com.mojang.renderpearl.api.pipeline.RenderPipeline;
import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.SystemToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.resources.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Los avisos del sistema de Minecraft (paquete de recursos, red, mundo…) con el aspecto de los de
 * RataLand: panel oscuro, al menos del mismo ancho, una raya de queso a la izquierda, el título en
 * queso y el texto en claro. Pueden tener varias líneas, como en Minecraft.
 */
@Mixin(SystemToast.class)
public abstract class SystemToastMixin implements Toast {
	@Inject(method = "width", at = @At("RETURN"), cancellable = true)
	private void rataland$ancho(CallbackInfoReturnable<Integer> cir) {
		cir.setReturnValue(Math.max(cir.getReturnValue(), AvisoRataLand.ANCHO));
	}

	@Inject(method = "extractRenderState", at = @At("HEAD"))
	private void rataland$fondo(GuiGraphicsExtractor g, Font fuente, long tiempo, CallbackInfo ci) {
		int alto = this.height();
		AvisoRataLand.fondo(g, this.width(), alto, 0x30D6E2FF);
		g.fill(7, 6, 9, alto - 6, Estilo.QUESO);
	}

	/** El fondo de Minecraft ya no se pinta: lo pinta rataland$fondo. */
	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;blitSprite(Lcom/mojang/renderpearl/api/pipeline/RenderPipeline;Lnet/minecraft/resources/Identifier;IIII)V"))
	private void rataland$sinFondo(GuiGraphicsExtractor g, RenderPipeline tuberia, Identifier sprite, int x, int y, int w, int h) {
	}

	/** El título (amarillo en Minecraft) en queso y el texto (blanco) en claro. */
	@ModifyArg(method = "extractRenderState", index = 4, at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/components/toasts/SystemToast;extractTextLines(Lnet/minecraft/client/gui/GuiGraphicsExtractor;Lnet/minecraft/client/gui/Font;Ljava/util/List;II)V"))
	private int rataland$colores(int color) {
		return color == -256 ? Estilo.QUESO : Estilo.CLARO;
	}
}
