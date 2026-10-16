package com.rataland.menu.mixin;

import com.mojang.renderpearl.api.pipeline.RenderPipeline;
import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.TutorialToast;
import net.minecraft.resources.Identifier;
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

	/** El fondo del aviso (el icono lo pinta Minecraft encima, con su propio blitSprite de 20×20). */
	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;blitSprite(Lcom/mojang/renderpearl/api/pipeline/RenderPipeline;Lnet/minecraft/resources/Identifier;IIII)V"))
	private void rataland$fondo(GuiGraphicsExtractor g, RenderPipeline tuberia, Identifier sprite, int x, int y, int w, int h) {
		AvisoRataLand.fondo(g, w, h, 0x30D6E2FF);
		AvisoRataLand.cajaIcono(g);
	}

	/** El título ya viene con su color dentro del texto (morado): claro, como en los avisos de RataLand. */
	@ModifyArg(method = "<init>(Lnet/minecraft/client/gui/Font;Lnet/minecraft/client/gui/components/toasts/TutorialToast$Icons;Lnet/minecraft/network/chat/Component;Lnet/minecraft/network/chat/Component;ZI)V",
			at = @At(value = "INVOKE", target = "Lnet/minecraft/network/chat/MutableComponent;withColor(I)Lnet/minecraft/network/chat/MutableComponent;"))
	private int rataland$colorTitulo(int color) {
		return Estilo.TEXTO;
	}

	/** El resto del texto (negro en Minecraft), tenue. */
	@ModifyArg(method = "extractRenderState", index = 4, at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;text(Lnet/minecraft/client/gui/Font;Lnet/minecraft/util/FormattedCharSequence;IIIZ)V"))
	private int rataland$colorTexto(int color) {
		return Estilo.TENUE;
	}

	/** La barra de progreso: el fondo oscuro y lo hecho en queso, a lo ancho del aviso. */
	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;fill(IIIII)V"))
	private void rataland$barra(GuiGraphicsExtractor g, int x1, int y1, int x2, int y2, int color) {
		if (color == -1) {
			g.fill(3, y1, 3 + RATALAND_BARRA, y2, 0xFF2B3346);
		} else {
			g.fill(3, y1, 3 + Math.round((x2 - 3) / 154f * RATALAND_BARRA), y2, Estilo.QUESO);
		}
	}
}
