package com.rataland.menu;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.ConfirmLinkScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.StatsScreen;
import net.minecraft.client.gui.screen.advancement.AdvancementsScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.text.Text;

/**
 * Menú de pausa de RataLand: sustituye al de Minecraft (tecla Esc dentro del servidor).
 * "Volver a RataLand" desconecta y lleva al menú principal de la serie.
 */
public class PausaRataLand extends Screen {
	private int fotogramas;

	public PausaRataLand() {
		super(Text.translatable("menu.game"));
	}

	@Override
	protected void init() {
		int x = this.width / 2 - 102;
		int y = Math.max(this.height / 4 + 8, alturaLogo() + 16);
		boolean hayDiscord = !RataLand.discord.isEmpty();

		this.addDrawableChild(ButtonWidget.builder(Text.translatable("menu.returnToGame"), b -> {
			this.client.setScreen(null);
			this.client.mouse.lockCursor();
		}).dimensions(x, y, 204, 20).build());

		this.addDrawableChild(ButtonWidget.builder(Text.translatable("gui.advancements"), b -> {
			if (this.client.player != null) {
				this.client.setScreen(new AdvancementsScreen(this.client.player.networkHandler.getAdvancementHandler(), this));
			}
		}).dimensions(x, y + 24, 98, 20).build());
		this.addDrawableChild(ButtonWidget.builder(Text.translatable("gui.stats"), b -> {
			if (this.client.player != null) {
				this.client.setScreen(new StatsScreen(this, this.client.player.getStatHandler()));
			}
		}).dimensions(x + 106, y + 24, 98, 20).build());

		this.addDrawableChild(ButtonWidget.builder(Text.translatable("menu.options"),
						b -> this.client.setScreen(new OptionsScreen(this, this.client.options)))
				.dimensions(x, y + 48, hayDiscord ? 98 : 204, 20).build());
		if (hayDiscord) {
			this.addDrawableChild(ButtonWidget.builder(Text.literal("Discord"), ConfirmLinkScreen.opening(this, RataLand.discord))
					.dimensions(x + 106, y + 48, 98, 20).build());
		}

		this.addDrawableChild(ButtonWidget.builder(Text.literal("Volver a " + RataLand.nombre), b -> volverAlMenu())
				.dimensions(x, y + 80, 204, 20).build());
	}

	private void volverAlMenu() {
		if (this.client.world != null) this.client.world.disconnect();
		this.client.disconnect();
		this.client.setScreen(new MenuRataLand());
	}

	private int escalaLogo() {
		return Math.max(1, Math.min((int) (this.width * 0.4f / RataLand.LOGO_ANCHO), (int) (this.height * 0.18f / RataLand.LOGO_ALTO)));
	}

	private int alturaLogo() {
		return 16 + RataLand.LOGO_ALTO * escalaLogo();
	}

	@Override
	public void render(DrawContext context, int mouseX, int mouseY, float delta) {
		super.render(context, mouseX, mouseY, delta);
		int escala = escalaLogo();
		int w = RataLand.LOGO_ANCHO * escala;
		int h = RataLand.LOGO_ALTO * escala;
		context.drawTexture(RataLand.LOGO, (this.width - w) / 2, 16, w, h, 0, 0,
				RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);

		if (RataLand.MODO_CAPTURA && ++fotogramas == 60) {
			ScreenshotRecorder.saveScreenshot(this.client.runDirectory, "rataland-pausa.png", this.client.getFramebuffer(), t -> {});
			this.client.scheduleStop();
		}
	}
}
