package com.rataland.menu.mixin;

import com.rataland.menu.Conexion;
import com.rataland.menu.Reinicio;
import com.rataland.menu.TarjetaEntrando;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.LevelLoadingScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.multiplayer.LevelLoadTracker;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mientras carga el mundo al entrar al servidor, la misma tarjeta en el paso «Cargando el mundo», en
 * vez del texto y la barra de Minecraft. Al cruzar un portal (la misma pantalla, con el fondo del
 * portal) se deja como en Minecraft. Cuando World Reset regenera el mundo, en su lugar va la pantalla
 * de Reinicio (el cartel de la muerte y «Regenerando el mundo»), que se queda lo justo para verse.
 */
@Mixin(LevelLoadingScreen.class)
public abstract class LevelLoadingScreenMixin extends Screen {
	@Shadow
	private LevelLoadingScreen.Reason reason;
	@Shadow
	private LevelLoadTracker loadTracker;
	@Shadow
	private float smoothedProgress;

	protected LevelLoadingScreenMixin(Component titulo) {
		super(titulo);
	}

	@Unique
	private boolean rataland$nuestra() {
		return Conexion.entrando && this.reason == LevelLoadingScreen.Reason.OTHER;
	}

	@Inject(method = "extractRenderState", at = @At("HEAD"), cancellable = true)
	private void rataland$sinTextoGris(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (!rataland$nuestra() && !Reinicio.activo()) return;
		ci.cancel();
		super.extractRenderState(g, mouseX, mouseY, delta);
	}

	/** Si World Reset te saca del Nether o del End, sin el fondo del portal: el paisaje, como al entrar. */
	@Inject(method = "extractBackground", at = @At("HEAD"))
	private void rataland$sinPortal(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (Reinicio.activo()) this.reason = LevelLoadingScreen.Reason.OTHER;
	}

	@Inject(method = "extractBackground", at = @At("TAIL"))
	private void rataland$tarjeta(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (Reinicio.activo()) {
			Reinicio.dibujar(g, this.font, this.width, this.height, this.loadTracker.isLevelReady() ? 1f : this.smoothedProgress);
		} else if (rataland$nuestra()) {
			TarjetaEntrando.dibujar(g, this.font, this.width, this.height, 3, false);
		}
	}

	/** Con el mundo ya cargado, la pantalla de Reinicio espera a que se haya visto todo antes de cerrarse. */
	@Redirect(method = "tick", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/screens/LevelLoadingScreen;onClose()V"))
	private void rataland$cerrar(LevelLoadingScreen pantalla) {
		if (Reinicio.activo()) {
			if (!Reinicio.puedeCerrar()) return;
			Reinicio.terminar();
		}
		pantalla.onClose();
	}
}
