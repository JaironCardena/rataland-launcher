package com.rataland.menu.mixin;

import com.rataland.menu.BotonRataLand;
import com.rataland.menu.Estilo;
import com.rataland.menu.Fondo;
import com.rataland.menu.IconosPixel;
import com.rataland.menu.Prueba;
import com.rataland.menu.RataLand;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.DeathScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.TextColor;
import net.minecraft.util.FormattedCharSequence;
import org.jetbrains.annotations.Nullable;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.List;

/**
 * Pantalla de muerte de RataLand: sobre el mundo oscurecido, una tarjeta con la calavera, «¡Has
 * muerto!», cómo has muerto (el texto de Minecraft), la puntuación y dónde ha sido, y los botones
 * Reaparecer y Volver a RataLand. Lo demás (el segundo de espera antes de poder pulsar, reaparecer,
 * la confirmación al salir) es lo de Minecraft.
 */
@Mixin(DeathScreen.class)
public abstract class DeathScreenMixin extends Screen {
	@Unique
	private static final int RATALAND_ANCHO = 300;

	@Shadow
	private int delayTicker;
	@Shadow
	@Final
	private Component causeOfDeath;
	@Shadow
	@Final
	private boolean hardcore;
	@Shadow
	private Component deathScore;
	@Shadow
	@Final
	private List<Button> exitButtons;
	@Shadow
	@Nullable
	private Button exitToTitleButton;

	@Unique
	private int rataland$x;
	@Unique
	private int rataland$y;
	@Unique
	private int rataland$w;
	@Unique
	private int rataland$h;
	@Unique
	private List<FormattedCharSequence> rataland$causa = List.of();
	@Unique
	private String rataland$lugar = "";
	@Unique
	private int rataland$fotogramas;

	protected DeathScreenMixin(Component titulo) {
		super(titulo);
	}

	@Shadow
	private void handleExitToTitleScreen() {
		throw new AssertionError();
	}

	@Shadow
	private void setButtonsActive(boolean activos) {
		throw new AssertionError();
	}

	@Inject(method = "init", at = @At("HEAD"), cancellable = true)
	private void rataland$init(CallbackInfo ci) {
		ci.cancel();
		this.delayTicker = 0;
		this.exitButtons.clear();

		LocalPlayer jugador = this.minecraft.player;
		int puntos = jugador != null ? jugador.getScore() : 0;
		this.deathScore = Component.translatable("deathScreen.score.value",
				Component.literal(Integer.toString(puntos)).withStyle((s) -> s.withColor(TextColor.fromRgb(Estilo.QUESO & 0xFFFFFF))));
		BlockPos donde = jugador != null ? jugador.blockPosition() : null;
		this.rataland$lugar = donde != null ? "x " + donde.getX() + "   y " + donde.getY() + "   z " + donde.getZ() : "";

		this.rataland$w = Math.min(RATALAND_ANCHO, this.width - 40);
		List<FormattedCharSequence> causa = this.causeOfDeath == null ? List.of() : this.font.split(this.causeOfDeath, this.rataland$w - 28);
		this.rataland$causa = causa.size() > 3 ? causa.subList(0, 3) : causa;
		this.rataland$h = 14 + 24 + 8 + 16 + 8 + this.rataland$causa.size() * 10 + 6 + 9 + 14 + 26 + 14;
		this.rataland$x = (this.width - this.rataland$w) / 2;
		this.rataland$y = Math.max(10, (this.height - this.rataland$h) / 2);

		int yb = this.rataland$y + this.rataland$h - 14 - 26;
		Component reaparecer = Component.translatable(this.hardcore ? "deathScreen.spectate" : "deathScreen.respawn");
		this.exitButtons.add(this.addRenderableWidget(new BotonRataLand(this.rataland$x + 14, yb, 124, 26, reaparecer, (b) -> {
			this.minecraft.player.respawn();
			b.active = false;
		}, BotonRataLand.Estilo.HIERBA, 1.5f)));
		this.exitToTitleButton = this.addRenderableWidget(new BotonRataLand(this.rataland$x + 14 + 124 + 8, yb, this.rataland$w - 28 - 132, 26,
				Component.literal("Volver a " + RataLand.nombre),
				(b) -> this.minecraft.getReportingContext().draftReportHandled(this.minecraft, this, () -> this.handleExitToTitleScreen(), true),
				BotonRataLand.Estilo.PELIGRO).conIcono(IconosPixel.SALIR, 0xFFFF9A8A));
		this.exitButtons.add(this.exitToTitleButton);
		this.setButtonsActive(false);
	}

	@Inject(method = "renderBackground", at = @At("HEAD"), cancellable = true)
	private void rataland$fondo(GuiGraphics g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		ci.cancel();
		if (this.minecraft.level == null) Fondo.dibujar(g, this.width, this.height);
		// El mundo, oscurecido y con un tinte rojo arriba
		g.fillGradient(0, 0, this.width, this.height, 0xA6300A14, 0xD80A0810);
		int x = this.rataland$x;
		int y = this.rataland$y;
		Estilo.escalon(g, x, y, this.rataland$w, this.rataland$h, 0xEE0D1424);
		Estilo.bordeEscalon(g, x, y, this.rataland$w, this.rataland$h, 0x80FF8A7A);
		Estilo.escalon(g, x + 14, y + 14, 24, 24, 0xFF2B1A22);
		Estilo.icono(g, IconosPixel.CALAVERA, x + 18, y + 18, 2, Estilo.ERROR);
	}

	@Inject(method = "render", at = @At("HEAD"), cancellable = true)
	private void rataland$render(GuiGraphics g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		ci.cancel();
		super.render(g, mouseX, mouseY, delta);
		int x = this.rataland$x + 14;
		int y = this.rataland$y + 14 + 24 + 8;
		g.pose().pushPose();
		g.pose().translate(x, y, 0f);
		g.pose().scale(2f, 2f, 1f);
		g.drawString(this.font, this.title, 0, 0, Estilo.TEXTO);
		g.pose().popPose();
		y += 16 + 8;
		for (FormattedCharSequence linea : this.rataland$causa) {
			g.drawString(this.font, linea, x, y, Estilo.CLARO);
			y += 10;
		}
		y += 6;
		g.drawString(this.font, this.deathScore, x, y, Estilo.TENUE);
		if (!this.rataland$lugar.isEmpty()) {
			g.drawString(this.font, this.rataland$lugar, this.rataland$x + this.rataland$w - 14 - this.font.width(this.rataland$lugar), y, Estilo.MUY_TENUE);
		}

		if (RataLand.MODO_CAPTURA && ++this.rataland$fotogramas == 60) {
			Prueba.alSiguienteTick("rataland-muerte.png", () -> this.minecraft.setScreen(new Prueba.Tabla()));
		}
	}
}
