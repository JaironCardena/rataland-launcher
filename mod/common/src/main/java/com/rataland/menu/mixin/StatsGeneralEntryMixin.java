package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractSelectionList;
import net.minecraft.client.gui.layouts.LayoutElement;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Estadísticas › General: filas alternas sobre el fondo oscuro, el nombre en claro y el valor en
 * queso, y la fila bajo el ratón resaltada.
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

	@Inject(method = "extractContent", at = @At("HEAD"), cancellable = true)
	private void rataland$fila(GuiGraphicsExtractor g, int ratonX, int ratonY, boolean encima, float delta, CallbackInfo ci) {
		ci.cancel();
		Font fuente = Minecraft.getInstance().font;
		LayoutElement fila = (LayoutElement) this;
		int x = fila.getX();
		int y = fila.getY();
		int ancho = fila.getWidth();
		int alto = fila.getHeight();
		AbstractSelectionList<?> lista = ((SelectionListEntryAccessor) this).rataland$lista();
		int indice = lista == null ? 0 : lista.children().indexOf(this);
		if (indice % 2 == 0) g.fill(x, y, x + ancho, y + alto, 0x12FFFFFF);
		if (encima) g.fill(x, y, x + ancho, y + alto, 0x18F6C445);
		int ty = y + (alto - 8) / 2;
		g.text(fuente, this.statDisplay, x + 6, ty, Estilo.CLARO);
		String valor = this.getValueText();
		g.text(fuente, valor, x + ancho - fuente.width(valor) - 6, ty, Estilo.QUESO);
	}
}
