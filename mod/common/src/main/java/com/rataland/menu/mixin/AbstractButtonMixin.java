package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractButton;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Los botones de las pantallas de Minecraft (Opciones, Gráficos, Controles…) con la piedra de RataLand
 * en lugar del botón gris. Solo cambia el dibujo del fondo: el texto, el sonido y lo demás son los de
 * Minecraft.
 */
@Mixin(AbstractButton.class)
public abstract class AbstractButtonMixin extends AbstractWidget {
	public AbstractButtonMixin(int x, int y, int ancho, int alto, Component texto) {
		super(x, y, ancho, alto, texto);
	}

	@Redirect(method = "renderWidget", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V"))
	private void rataland$piedra(GuiGraphics g, ResourceLocation sprite, int x, int y, int w, int h) {
		Estilo.botonPiedra(g, x, y, w, h, Estilo.PIEDRA, this.isHovered() && this.active, this.isFocused() && !this.isHovered(), this.active);
	}
}
