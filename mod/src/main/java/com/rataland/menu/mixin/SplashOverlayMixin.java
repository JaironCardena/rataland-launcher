package com.rataland.menu.mixin;

import com.rataland.menu.RataLand;
import com.rataland.menu.TexturaDelMod;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.SplashOverlay;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.MathHelper;
import com.mojang.blaze3d.systems.RenderSystem;
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

	@Shadow
	private float progress;

	/** Barra de carga de queso, con la rata corriendo por encima. */
	@Inject(method = "renderProgressBar", at = @At("HEAD"), cancellable = true)
	private void rataland$barraDeQueso(DrawContext context, int minX, int minY, int maxX, int maxY, float opacidad, CallbackInfo ci) {
		ci.cancel();
		int a = Math.round(opacidad * 255f) << 24;
		if (a == 0) return;
		int ancho = maxX - minX - 4;
		int relleno = Math.round(ancho * MathHelper.clamp(this.progress, 0f, 1f));
		int x = minX + 2;
		int y = minY + 2;
		int alto = maxY - minY - 4;

		context.fill(minX, minY, maxX, maxY, a | 0x1B120B);
		context.fill(minX + 1, minY + 1, maxX - 1, maxY - 1, a | 0x2A2419);
		if (relleno > 0) {
			context.fill(x, y, x + relleno, y + alto, a | 0xF6C445);
			context.fill(x, y, x + relleno, y + 1, a | 0xFFF0A8);
			context.fill(x, y + alto - 1, x + relleno, y + alto, a | 0xD98A22);
			// Agujeros del queso
			for (int hx = x + 3; hx < x + relleno - 2; hx += 9) {
				int hy = y + 1 + ((hx / 9) % 2 == 0 ? 1 : alto - 4);
				context.fill(hx, hy, hx + 2, hy + 2, a | 0xB8701A);
			}
		}

		RenderSystem.enableBlend();
		context.setShaderColor(1f, 1f, 1f, opacidad);
		context.drawTexture(RataLand.RATA, x + relleno - 10, minY - 10, 0, 0, 16, 10, 16, 10);
		context.setShaderColor(1f, 1f, 1f, 1f);
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
