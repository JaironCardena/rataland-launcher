package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Filas de Estadísticas › General con el estilo de RataLand: bandas alternas suaves, el nombre en
 * claro y el valor en queso (en Minecraft van todas iguales, en blanco y gris).
 */
@Mixin(targets = "net.minecraft.client.gui.screens.achievement.StatsScreen$GeneralStatisticsList$Entry")
public abstract class StatsGeneralEntryMixin {
	@Shadow
	@Final
	private Component statDisplay;

	@Shadow
	private String getValueText() {
		throw new AssertionError();
	}

	@Inject(method = "render", at = @At("HEAD"), cancellable = true)
	private void rataland$fila(GuiGraphics g, int indice, int arriba, int izquierda, int ancho, int alto, int ratonX, int ratonY, boolean encima,
			float delta, CallbackInfo ci) {
		ci.cancel();
		Font fuente = Minecraft.getInstance().font;
		if (indice % 2 == 0) g.fill(izquierda - 2, arriba - 2, izquierda + ancho + 2, arriba + alto + 2, 0x12FFFFFF);
		if (encima) g.fill(izquierda - 2, arriba - 2, izquierda + ancho + 2, arriba + alto + 2, 0x18F6C445);
		int y = arriba + alto / 2 - 4;
		g.drawString(fuente, this.statDisplay, izquierda + 4, y, Estilo.CLARO);
		String valor = this.getValueText();
		g.drawString(fuente, valor, izquierda + ancho - fuente.width(valor) - 4, y, Estilo.QUESO);
	}
}
