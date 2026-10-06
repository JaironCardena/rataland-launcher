package com.rataland.menu.mixin;

import com.rataland.menu.Fondo;
import com.rataland.menu.RataLand;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Opciones, conexión, desconexión…: en lugar del panorama de Minecraft se ve el paisaje de RataLand. */
@Mixin(Screen.class)
public abstract class ScreenMixin {
	@Shadow
	public int width;
	@Shadow
	public int height;

	@Unique
	private int rataland$fotogramas;

	@Inject(method = "renderPanorama", at = @At("HEAD"), cancellable = true)
	private void rataland$fondo(GuiGraphics context, float delta, CallbackInfo ci) {
		Fondo.dibujar(context, this.width, this.height);
		ci.cancel();
	}

	@Inject(method = "render", at = @At("TAIL"))
	private void rataland$captura(GuiGraphics context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (RataLand.MODO_CAPTURA && (Object) this instanceof OptionsScreen && ++rataland$fotogramas == 60) {
			Minecraft client = Minecraft.getInstance();
			Screenshot.grab(client.gameDirectory, "rataland-opciones.png", client.getMainRenderTarget(), t -> {});
			client.setScreen(new JoinMultiplayerScreen(new TitleScreen()));
			RataLand.LOG.info("Prueba: al abrir Multijugador se muestra {}", client.screen.getClass().getSimpleName());
			// Sigue con el menú de pausa; PausaRataLand hace su captura y cierra el juego.
			client.setScreen(new PauseScreen(true));
			RataLand.LOG.info("Prueba: al pausar se muestra {}", client.screen.getClass().getSimpleName());
		}
	}
}
