package com.rataland.menu.mixin;

import com.rataland.menu.Conexion;
import com.rataland.menu.TarjetaEntrando;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.LevelLoadingScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mientras carga el mundo al entrar al servidor, la misma tarjeta en el paso «Cargando el mundo», en
 * vez del texto y la barra de Minecraft. Al cruzar un portal (la misma pantalla, con el fondo del
 * portal) se deja como en Minecraft.
 */
@Mixin(LevelLoadingScreen.class)
public abstract class LevelLoadingScreenMixin extends Screen {
	@Shadow
	private LevelLoadingScreen.Reason reason;

	protected LevelLoadingScreenMixin(Component titulo) {
		super(titulo);
	}

	@Unique
	private boolean rataland$nuestra() {
		return Conexion.entrando && this.reason == LevelLoadingScreen.Reason.OTHER;
	}

	@Inject(method = "extractRenderState", at = @At("HEAD"), cancellable = true)
	private void rataland$sinTextoGris(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (!rataland$nuestra()) return;
		ci.cancel();
		super.extractRenderState(g, mouseX, mouseY, delta);
	}

	@Inject(method = "extractBackground", at = @At("TAIL"))
	private void rataland$tarjeta(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (rataland$nuestra()) TarjetaEntrando.dibujar(g, this.font, this.width, this.height, 3, false);
	}
}
