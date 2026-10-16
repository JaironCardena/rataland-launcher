package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.TutorialToast;
import net.minecraft.util.FormattedCharSequence;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.List;

/**
 * Los consejos para jugadores nuevos (moverse, mirar alrededor, talar un árbol…) con la tarjeta
 * compacta de RataLand: su icono de Minecraft, el título en claro, el texto en tenue y la barra de
 * progreso en queso a lo largo del borde de abajo.
 */
@Mixin(TutorialToast.class)
public abstract class TutorialToastMixin implements Toast {
	@Shadow
	@Final
	private TutorialToast.Icons icon;
	@Shadow
	@Final
	private List<FormattedCharSequence> lines;
	@Shadow
	@Final
	private boolean progressable;
	@Shadow
	private float smoothedProgress;

	@Override
	public int width() {
		Font fuente = Minecraft.getInstance().font;
		int texto = 0;
		for (FormattedCharSequence linea : this.lines) texto = Math.max(texto, fuente.width(linea));
		return Math.max(AvisoRataLand.ANCHO_MIN, AvisoRataLand.TEXTO_X + texto + 8);
	}

	@Override
	public int height() {
		return AvisoRataLand.altoPara(this.lines.size());
	}

	/** El título ya viene con su color dentro del texto (morado): claro, como en los avisos de RataLand. */
	@ModifyArg(method = "<init>(Lnet/minecraft/client/gui/Font;Lnet/minecraft/client/gui/components/toasts/TutorialToast$Icons;Lnet/minecraft/network/chat/Component;Lnet/minecraft/network/chat/Component;ZI)V",
			at = @At(value = "INVOKE", target = "Lnet/minecraft/network/chat/MutableComponent;withColor(I)Lnet/minecraft/network/chat/MutableComponent;"))
	private int rataland$colorTitulo(int color) {
		return Estilo.TEXTO;
	}

	@Inject(method = "extractRenderState", at = @At("HEAD"), cancellable = true)
	private void rataland$tarjeta(GuiGraphicsExtractor g, Font fuente, long tiempo, CallbackInfo ci) {
		ci.cancel();
		int w = this.width();
		int h = this.height();
		AvisoRataLand.fondo(g, w, h, AvisoRataLand.BORDE);
		// Los iconos de Minecraft miden 20: aquí, 16
		g.pose().pushMatrix();
		g.pose().translate(5f, 4f);
		g.pose().scale(0.8f, 0.8f);
		this.icon.extractRenderState(g, 0, 0);
		g.pose().popMatrix();
		int y = this.lines.size() <= 1 ? 8 : 3;
		for (FormattedCharSequence linea : this.lines) {
			g.text(fuente, linea, AvisoRataLand.TEXTO_X, y, Estilo.TENUE, false);
			y += 10;
		}
		if (this.progressable) {
			g.fill(2, h - 2, w - 2, h - 1, 0xFF2B3346);
			g.fill(2, h - 2, 2 + Math.round((w - 4) * this.smoothedProgress), h - 1, Estilo.QUESO);
		}
	}
}
