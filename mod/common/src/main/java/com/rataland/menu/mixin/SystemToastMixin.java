package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import com.rataland.menu.IconosPixel;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.SystemToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.util.FormattedCharSequence;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.List;

/**
 * Los avisos del sistema de Minecraft (paquete de recursos, red, mundo…) con la tarjeta compacta de
 * RataLand: un engranaje, el título en queso y el texto en claro. Si son largos, la tarjeta crece.
 */
@Mixin(SystemToast.class)
public abstract class SystemToastMixin implements Toast {
	@Shadow
	private List<FormattedCharSequence> titleLines;
	@Shadow
	private List<FormattedCharSequence> messageLines;

	@Inject(method = "width", at = @At("RETURN"), cancellable = true)
	private void rataland$ancho(CallbackInfoReturnable<Integer> cir) {
		Font fuente = Minecraft.getInstance().font;
		int texto = 0;
		for (FormattedCharSequence linea : this.titleLines) texto = Math.max(texto, fuente.width(linea));
		for (FormattedCharSequence linea : this.messageLines) texto = Math.max(texto, fuente.width(linea));
		cir.setReturnValue(Math.max(AvisoRataLand.ANCHO_MIN, AvisoRataLand.TEXTO_X + texto + 8));
	}

	@Inject(method = "height", at = @At("RETURN"), cancellable = true)
	private void rataland$alto(CallbackInfoReturnable<Integer> cir) {
		cir.setReturnValue(AvisoRataLand.altoPara(this.titleLines.size() + this.messageLines.size()));
	}

	@Inject(method = "extractRenderState", at = @At("HEAD"), cancellable = true)
	private void rataland$tarjeta(GuiGraphicsExtractor g, Font fuente, long tiempo, CallbackInfo ci) {
		ci.cancel();
		AvisoRataLand.fondo(g, this.width(), this.height(), AvisoRataLand.BORDE);
		Estilo.icono(g, IconosPixel.AJUSTES, 5, 4, 2, Estilo.TENUE);
		int y = this.titleLines.size() + this.messageLines.size() <= 1 ? 8 : 3;
		for (FormattedCharSequence linea : this.titleLines) {
			g.text(fuente, linea, AvisoRataLand.TEXTO_X, y, Estilo.QUESO, false);
			y += 10;
		}
		for (FormattedCharSequence linea : this.messageLines) {
			g.text(fuente, linea, AvisoRataLand.TEXTO_X, y, Estilo.CLARO, false);
			y += 10;
		}
	}
}
