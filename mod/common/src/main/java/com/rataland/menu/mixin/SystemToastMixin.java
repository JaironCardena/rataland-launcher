package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.toasts.SystemToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastComponent;
import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Los avisos del sistema de Minecraft (paquetes de recursos, mundo, red…) con el aspecto de los de
 * RataLand: panel oscuro, al menos del mismo ancho, una raya de queso a la izquierda, el título en
 * queso y el texto en claro. Pueden tener varias líneas, como en Minecraft.
 */
@Mixin(SystemToast.class)
public abstract class SystemToastMixin implements Toast {
	@Inject(method = "width", at = @At("RETURN"), cancellable = true)
	private void rataland$ancho(CallbackInfoReturnable<Integer> cir) {
		cir.setReturnValue(Math.max(cir.getReturnValue(), AvisoRataLand.ANCHO));
	}

	@Inject(method = "render", at = @At("HEAD"))
	private void rataland$fondo(GuiGraphics g, ToastComponent avisos, long tiempo, CallbackInfoReturnable<Toast.Visibility> cir) {
		int alto = this.height();
		AvisoRataLand.fondo(g, this.width(), alto, 0x30D6E2FF);
		g.fill(7, 6, 9, alto - 6, Estilo.QUESO);
	}

	/** El fondo de Minecraft (de una pieza o por filas) ya no se pinta: lo pinta rataland$fondo. */
	@Redirect(method = "render", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V"))
	private void rataland$sinFondo(GuiGraphics g, ResourceLocation sprite, int x, int y, int w, int h) {
	}

	@Inject(method = "renderBackgroundRow", at = @At("HEAD"), cancellable = true)
	private void rataland$sinFilas(GuiGraphics g, int ancho, int v, int y, int alto, CallbackInfo ci) {
		ci.cancel();
	}

	@ModifyArg(method = "render", index = 4, at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;drawString(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)I"))
	private int rataland$colorTitulo(int color) {
		return Estilo.QUESO;
	}

	@ModifyArg(method = "render", index = 4, at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;drawString(Lnet/minecraft/client/gui/Font;Lnet/minecraft/util/FormattedCharSequence;IIIZ)I"))
	private int rataland$colorTexto(int color) {
		return Estilo.CLARO;
	}
}
