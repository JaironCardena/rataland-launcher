package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphics;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Pestañas de Progresos con el estilo de RataLand: oscuras, y la elegida del color de la ventana con
 * el borde de queso, abierta por el lado que toca la ventana para que parezcan una sola pieza.
 * (AdvancementTabType no es pública: se nombra por texto.)
 */
@Mixin(targets = "net.minecraft.client.gui.screens.advancements.AdvancementTabType")
public abstract class AdvancementTabTypeMixin {
	/** Orden de las posiciones en el enum de Minecraft: arriba, abajo, izquierda y derecha. */
	private static final int ARRIBA = 0;
	private static final int ABAJO = 1;
	private static final int IZQUIERDA = 2;

	@Shadow
	@Final
	private int width;
	@Shadow
	@Final
	private int height;

	@Shadow
	public abstract int getX(int indice);

	@Shadow
	public abstract int getY(int indice);

	@Inject(method = "draw", at = @At("HEAD"), cancellable = true)
	private void rataland$pestana(GuiGraphics g, int x, int y, boolean elegida, int indice, CallbackInfo ci) {
		ci.cancel();
		int px = x + this.getX(indice);
		int py = y + this.getY(indice);
		int w = this.width;
		int h = this.height;
		Estilo.escalon(g, px, py, w, h, elegida ? 0xFF101828 : 0xFF0A0F1A);
		Estilo.bordeEscalon(g, px, py, w, h, elegida ? Estilo.QUESO : Estilo.LINEA);
		if (!elegida) return;
		// La elegida se abre por el lado que toca la ventana (4 píxeles van por encima de ella)
		int lado = ((Enum<?>) (Object) this).ordinal();
		if (lado == ARRIBA) g.fill(px + 1, py + h - 5, px + w - 1, py + h, 0xFF101828);
		else if (lado == ABAJO) g.fill(px + 1, py, px + w - 1, py + 5, 0xFF101828);
		else if (lado == IZQUIERDA) g.fill(px + w - 5, py + 1, px + w, py + h - 1, 0xFF101828);
		else g.fill(px, py + 1, px + 5, py + h - 1, 0xFF101828);
	}
}
