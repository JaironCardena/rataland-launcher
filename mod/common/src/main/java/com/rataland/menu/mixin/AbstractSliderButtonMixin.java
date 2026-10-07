package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/** Los deslizadores de Minecraft (campo de visión, volumen…): pista oscura que se llena de queso y un tirador de queso. */
@Mixin(AbstractSliderButton.class)
public abstract class AbstractSliderButtonMixin extends AbstractWidget {
	@Shadow
	protected double value;

	public AbstractSliderButtonMixin(int x, int y, int ancho, int alto, Component texto) {
		super(x, y, ancho, alto, texto);
	}

	@Redirect(method = "renderWidget", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V", ordinal = 0))
	private void rataland$pista(GuiGraphics g, ResourceLocation sprite, int x, int y, int w, int h) {
		g.fill(x, y, x + w, y + h, this.isFocused() && !this.isHovered() && this.active ? Estilo.QUESO : 0xFF0A0F1C);
		g.fill(x + 1, y + 1, x + w - 1, y + h - 1, 0xFF141B2E);
		int lleno = (int) (this.value * (w - 8)) + 4;
		g.fill(x + 1, y + 1, x + lleno, y + h - 1, this.active ? 0x47F6C445 : 0x1FF6C445);
	}

	@Redirect(method = "renderWidget", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V", ordinal = 1))
	private void rataland$tirador(GuiGraphics g, ResourceLocation sprite, int x, int y, int w, int h) {
		int color = this.active ? Estilo.QUESO : 0xFF6B6150;
		g.fill(x + 2, y, x + w - 2, y + h, color);
		if (this.active) {
			g.fill(x + 2, y, x + w - 2, y + 1, Estilo.QUESO_LUZ);
			g.fill(x + 2, y + h - 2, x + w - 2, y + h, Estilo.QUESO_SOMBRA);
			if (this.isHovered()) g.fill(x + 2, y, x + w - 2, y + h, 0x30FFFFFF);
		}
	}
}
