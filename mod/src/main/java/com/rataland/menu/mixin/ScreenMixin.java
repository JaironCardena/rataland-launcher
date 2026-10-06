package com.rataland.menu.mixin;

import com.rataland.menu.Fondo;
import com.rataland.menu.RataLand;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.util.ScreenshotRecorder;
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

	@Inject(method = "renderPanoramaBackground", at = @At("HEAD"), cancellable = true)
	private void rataland$fondo(DrawContext context, float delta, CallbackInfo ci) {
		Fondo.dibujar(context, this.width, this.height);
		ci.cancel();
	}

	@Inject(method = "render", at = @At("TAIL"))
	private void rataland$captura(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (RataLand.MODO_CAPTURA && (Object) this instanceof OptionsScreen && ++rataland$fotogramas == 60) {
			MinecraftClient client = MinecraftClient.getInstance();
			ScreenshotRecorder.saveScreenshot(client.runDirectory, "rataland-opciones.png", client.getFramebuffer(), t -> {});
			client.setScreen(new MultiplayerScreen(new TitleScreen()));
			RataLand.LOG.info("Prueba: al abrir Multijugador se muestra {}", client.currentScreen.getClass().getSimpleName());
			client.scheduleStop();
		}
	}
}
