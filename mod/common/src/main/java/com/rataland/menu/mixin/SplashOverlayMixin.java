package com.rataland.menu.mixin;

import com.mojang.blaze3d.systems.RenderSystem;
import com.rataland.menu.Estilo;
import com.rataland.menu.Fondo;
import com.rataland.menu.RataLand;
import com.rataland.menu.TexturaDelMod;
import net.minecraft.Util;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.LoadingOverlay;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Mutable;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.function.IntSupplier;

/**
 * Pantalla de carga de RataLand: el paisaje de la temporada oscurecido, el logo de la serie (en
 * lugar del de Mojang Studios), la barra de queso con la rata y el porcentaje. Sin texto: mientras
 * carga, Minecraft aún no tiene las fuentes listas.
 */
@Mixin(LoadingOverlay.class)
public abstract class SplashOverlayMixin {
	@Shadow
	@Final
	@Mutable
	private static IntSupplier BRAND_BACKGROUND;

	@Shadow
	@Final
	static ResourceLocation MOJANG_STUDIOS_LOGO_LOCATION;

	@Shadow
	private float currentProgress;
	@Shadow
	@Final
	private boolean fadeIn;
	@Shadow
	private long fadeInStart;
	@Shadow
	private long fadeOutStart;

	@Unique
	private static long rataland$inicio;
	@Unique
	private static boolean rataland$capturado;

	@Inject(method = "<clinit>", at = @At("TAIL"))
	private static void rataland$color(CallbackInfo ci) {
		BRAND_BACKGROUND = () -> RataLand.COLOR_CARGA;
	}

	@Inject(method = "registerTextures", at = @At("TAIL"))
	private static void rataland$texturas(Minecraft client, CallbackInfo ci) {
		TexturaDelMod.registrar(client.getTextureManager(), MOJANG_STUDIOS_LOGO_LOCATION);
	}

	/** Lo opaca que se ve la pantalla de carga ahora (igual que calcula Minecraft al aparecer y al irse). */
	@Unique
	private float rataland$opacidad() {
		long ahora = Util.getMillis();
		float fuera = this.fadeOutStart > -1L ? (ahora - this.fadeOutStart) / 1000f : -1f;
		float dentro = this.fadeInStart > -1L ? (ahora - this.fadeInStart) / 500f : -1f;
		if (fuera >= 1f) return 1f - Mth.clamp(fuera - 1f, 0f, 1f);
		if (this.fadeIn) return Mth.clamp(dentro, 0f, 1f);
		return 1f;
	}

	/** Escala del logo en píxeles enteros de pantalla, para que se vea nítido. */
	@Unique
	private static float rataland$escalaLogo(int ancho, int alto) {
		int gui = Math.max(1, (int) Minecraft.getInstance().getWindow().getGuiScale());
		int porAncho = (int) (ancho * 0.5f * gui / RataLand.LOGO_ANCHO);
		int porAlto = (int) (alto * 0.22f * gui / RataLand.LOGO_ALTO);
		return (float) Math.max(gui, Math.min(porAncho, porAlto)) / gui;
	}

	/** Arriba del logo: un poco por encima del centro. */
	@Unique
	private static int rataland$arribaLogo(int alto, float escala) {
		return Math.round(alto * 0.38f - RataLand.LOGO_ALTO * escala / 2f);
	}

	/** Paisaje y logo, justo antes de donde Minecraft dibujaría el suyo. */
	@Inject(method = "render", at = @At(value = "INVOKE", target = "Lcom/mojang/blaze3d/systems/RenderSystem;disableDepthTest()V", ordinal = 0))
	private void rataland$fondoYLogo(GuiGraphics g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		int ancho = g.guiWidth();
		int alto = g.guiHeight();
		float opacidad = rataland$opacidad();
		if (opacidad <= 0f) return;
		RenderSystem.enableBlend();
		RenderSystem.defaultBlendFunc();
		g.setColor(1f, 1f, 1f, opacidad);
		// Mientras aparece o se va, el paisaje fijo; del todo visible, también lo que se mueve
		Fondo.dibujar(g, ancho, alto, opacidad >= 0.999f);
		g.setColor(1f, 1f, 1f, 1f);
		g.fill(0, 0, ancho, alto, (Math.round(opacidad * 0x9E) << 24) | 0x080D1A);

		float escala = rataland$escalaLogo(ancho, alto);
		int w = Math.round(RataLand.LOGO_ANCHO * escala);
		g.setColor(1f, 1f, 1f, opacidad);
		g.pose().pushPose();
		g.pose().translate((ancho - w) / 2f, rataland$arribaLogo(alto, escala), 0f);
		g.pose().scale(escala, escala, 1f);
		g.blit(RataLand.LOGO, 0, 0, 0f, 0f, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);
		g.pose().popPose();
		g.setColor(1f, 1f, 1f, 1f);
		RenderSystem.disableBlend();
	}

	/** El logo de Mojang Studios ya no se dibuja (va el de RataLand, con su color). */
	@Redirect(method = "render", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blit(Lnet/minecraft/resources/ResourceLocation;IIIIFFIIII)V"))
	private void rataland$sinLogoDeMojang(GuiGraphics g, ResourceLocation textura, int x, int y, int w, int h, float u, float v, int uw, int vh, int tw, int th) {
	}

	/** Barra de carga de queso bajo el logo, con la rata corriendo por encima y el porcentaje. */
	@Inject(method = "drawProgressBar", at = @At("HEAD"), cancellable = true)
	private void rataland$barraDeQueso(GuiGraphics context, int minX, int minY, int maxX, int maxY, float opacidad, CallbackInfo ci) {
		ci.cancel();
		int a = Math.round(opacidad * 255f) << 24;
		if (a == 0) return;
		int pantallaAncho = context.guiWidth();
		int pantallaAlto = context.guiHeight();
		float escala = rataland$escalaLogo(pantallaAncho, pantallaAlto);
		int ancho = Math.min(240, Math.round(pantallaAncho * 0.44f));
		int alto = 8;
		int x0 = (pantallaAncho - ancho) / 2;
		int y0 = rataland$arribaLogo(pantallaAlto, escala) + Math.round(RataLand.LOGO_ALTO * escala) + Math.max(18, pantallaAlto / 14);
		float progreso = Mth.clamp(this.currentProgress, 0f, 1f);
		int relleno = Math.round((ancho - 2) * progreso);

		context.fill(x0, y0, x0 + ancho, y0 + alto, a | 0x3A4152);
		context.fill(x0 + 1, y0 + 1, x0 + ancho - 1, y0 + alto - 1, a | 0x0A0F1C);
		if (relleno > 0) {
			int x = x0 + 1;
			int y = y0 + 1;
			context.fill(x, y, x + relleno, y + alto - 2, a | 0xF6C445);
			context.fill(x, y, x + relleno, y + 1, a | 0xFFF0A8);
			context.fill(x, y + alto - 3, x + relleno, y + alto - 2, a | 0xD98A22);
			// Agujeros del queso
			for (int hx = x + 3; hx < x + relleno - 2; hx += 9) {
				int hy = y + ((hx / 9) % 2 == 0 ? 1 : alto - 5);
				context.fill(hx, hy, hx + 2, hy + 2, a | 0xB8701A);
			}
		}

		RenderSystem.enableBlend();
		context.setColor(1f, 1f, 1f, opacidad);
		context.blit(RataLand.RATA, x0 + relleno - 12, y0 - 10, 0, 0, 16, 10, 16, 10);
		context.setColor(1f, 1f, 1f, 1f);

		// Porcentaje con dígitos pixel, debajo a la derecha
		int porcentaje = Math.round(progreso * 100f);
		int p = 2;
		int anchoTexto = Estilo.anchoPorcentaje(porcentaje) * p;
		Estilo.porcentaje(context, porcentaje, x0 + ancho - anchoTexto, y0 + alto + 6, p, a | 0xF6C445);
	}

	@Inject(method = "render", at = @At("TAIL"))
	private void rataland$captura(GuiGraphics context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if (!RataLand.MODO_CAPTURA || rataland$capturado) return;
		if (rataland$inicio == 0) rataland$inicio = System.currentTimeMillis();
		if (System.currentTimeMillis() - rataland$inicio < 1500) return;
		rataland$capturado = true;
		Minecraft client = Minecraft.getInstance();
		Screenshot.grab(client.gameDirectory, "rataland-carga.png", client.getMainRenderTarget(), t -> {});
	}
}
