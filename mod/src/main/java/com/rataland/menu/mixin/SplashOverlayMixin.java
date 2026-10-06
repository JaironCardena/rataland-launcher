package com.rataland.menu.mixin;

import com.rataland.menu.RataLand;
import com.rataland.menu.TexturaDelMod;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.SplashOverlay;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.util.Identifier;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Mutable;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.function.IntSupplier;

/** Pantalla de carga: el logo de RataLand en lugar del de Mojang Studios, sobre el azul noche de la serie. */
@Mixin(SplashOverlay.class)
public abstract class SplashOverlayMixin {
	@Shadow
	@Final
	@Mutable
	private static IntSupplier BRAND_ARGB;

	@Shadow
	@Final
	static Identifier LOGO;

	@Unique
	private static long rataland$inicio;
	@Unique
	private static boolean rataland$capturado;

	@Inject(method = "<clinit>", at = @At("TAIL"))
	private static void rataland$color(CallbackInfo ci) {
		BRAND_ARGB = () -> RataLand.COLOR_CARGA;
	}

	@Inject(method = "init", at = @At("TAIL"))
	private static void rataland$texturas(MinecraftClient client, CallbackInfo ci) {
		TexturaDelMod.registrar(client.getTextureManager(), LOGO);
	}

	@Inject(method = "render", at = @At("TAIL"))
	private void rataland$captura(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (!RataLand.MODO_CAPTURA || rataland$capturado) return;
		if (rataland$inicio == 0) rataland$inicio = System.currentTimeMillis();
		if (System.currentTimeMillis() - rataland$inicio < 1500) return;
		rataland$capturado = true;
		MinecraftClient client = MinecraftClient.getInstance();
		ScreenshotRecorder.saveScreenshot(client.runDirectory, "rataland-carga.png", client.getFramebuffer(), t -> {});
	}
}
