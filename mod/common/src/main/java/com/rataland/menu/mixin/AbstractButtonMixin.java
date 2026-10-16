package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractButton;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

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

	@Inject(method = "extractDefaultSprite", at = @At("HEAD"), cancellable = true)
	private void rataland$piedra(GuiGraphicsExtractor g, CallbackInfo ci) {
		ci.cancel();
		Estilo.botonPiedra(g, this.getX(), this.getY(), this.getWidth(), this.getHeight(), Estilo.PIEDRA, this.isHovered() && this.active,
				this.isFocused() && !this.isHovered(), this.active);
	}
}
