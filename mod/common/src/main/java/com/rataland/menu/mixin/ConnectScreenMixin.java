package com.rataland.menu.mixin;

import com.rataland.menu.Conexion;
import com.rataland.menu.Prueba;
import com.rataland.menu.RataLand;
import com.rataland.menu.TarjetaEntrando;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Al entrar al servidor de la serie, en vez del texto gris de Minecraft («Conectando al servidor…»)
 * se ve la tarjeta «Entrando en RataLand» con los pasos, y el botón Cancelar va dentro de ella.
 */
@Mixin(ConnectScreen.class)
public abstract class ConnectScreenMixin extends Screen {
	@Shadow
	private Component status;

	@Unique
	private int rataland$fotogramas;

	protected ConnectScreenMixin(Component titulo) {
		super(titulo);
	}

	@Inject(method = "init", at = @At("TAIL"))
	private void rataland$colocarBoton(CallbackInfo ci) {
		if (!Conexion.entrando) return;
		int[] zona = TarjetaEntrando.boton(this.width, this.height);
		for (GuiEventListener hijo : this.children()) {
			if (hijo instanceof AbstractWidget boton) {
				boton.setX(zona[0]);
				boton.setY(zona[1]);
				boton.setWidth(zona[2]);
			}
		}
	}

	@Redirect(method = "render", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;drawCenteredString(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;III)V"))
	private void rataland$sinTextoGris(GuiGraphics g, Font fuente, Component texto, int x, int y, int color) {
		if (!Conexion.entrando) g.drawCenteredString(fuente, texto, x, y, color);
	}

	@Override
	public void renderBackground(GuiGraphics g, int mouseX, int mouseY, float delta) {
		super.renderBackground(g, mouseX, mouseY, delta);
		if (Conexion.entrando) TarjetaEntrando.dibujar(g, this.font, this.width, this.height, TarjetaEntrando.paso(this.status), true);
	}

	@Inject(method = "render", at = @At("TAIL"))
	private void rataland$captura(GuiGraphics g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (RataLand.MODO_CAPTURA && ++this.rataland$fotogramas == 80) Prueba.conectando((ConnectScreen) (Object) this);
	}
}
