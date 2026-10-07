package com.rataland.menu.mixin;

import com.rataland.menu.Conexion;
import com.rataland.menu.TarjetaEntrando;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.ReceivingLevelScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mientras carga el mundo al entrar al servidor, la misma tarjeta en el paso «Cargando el mundo».
 * Al cruzar un portal (la misma pantalla, con el fondo del portal) se deja como en Minecraft.
 */
@Mixin(ReceivingLevelScreen.class)
public abstract class ReceivingLevelScreenMixin extends Screen {
	@Shadow
	@Final
	private ReceivingLevelScreen.Reason reason;

	protected ReceivingLevelScreenMixin(Component titulo) {
		super(titulo);
	}

	@Unique
	private boolean rataland$nuestra() {
		return Conexion.entrando && this.reason == ReceivingLevelScreen.Reason.OTHER;
	}

	@Redirect(method = "render", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;drawCenteredString(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;III)V"))
	private void rataland$sinTextoGris(GuiGraphics g, Font fuente, Component texto, int x, int y, int color) {
		if (!rataland$nuestra()) g.drawCenteredString(fuente, texto, x, y, color);
	}

	@Inject(method = "renderBackground", at = @At("TAIL"))
	private void rataland$tarjeta(GuiGraphics g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (rataland$nuestra()) TarjetaEntrando.dibujar(g, this.font, this.width, this.height, 3, false);
	}
}
