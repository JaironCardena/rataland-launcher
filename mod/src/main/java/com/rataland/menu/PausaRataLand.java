package com.rataland.menu;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.ConfirmLinkScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.StatsScreen;
import net.minecraft.client.gui.screen.advancement.AdvancementsScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.text.Text;

/**
 * Menú de pausa de RataLand: un panel con marco sobre el mundo desenfocado.
 * "Volver a RataLand" desconecta y lleva al menú principal de la serie.
 */
public class PausaRataLand extends Screen {
	private static final int ANCHO = 216;
	private static final int ANCHO_BOTON = 196;

	private int fotogramas;
	private int panelX;
	private int panelY;
	private int panelAlto;

	public PausaRataLand() {
		super(Text.translatable("menu.game"));
	}

	private int escalaLogo() {
		return this.height >= 300 ? 2 : 1;
	}

	@Override
	protected void init() {
		boolean hayDiscord = !RataLand.discord.isEmpty();
		int alturaLogo = RataLand.LOGO_ALTO * escalaLogo();
		this.panelAlto = 12 + alturaLogo + 10 + 24 + 4 + 20 + 4 + 20 + 12 + 20 + 12;
		this.panelX = (this.width - ANCHO) / 2;
		this.panelY = Math.max(4, (this.height - panelAlto) / 2);
		int x = panelX + (ANCHO - ANCHO_BOTON) / 2;
		int y = panelY + 12 + alturaLogo + 10;
		int medio = (ANCHO_BOTON - 4) / 2;

		this.addDrawableChild(new BotonRataLand(x, y, ANCHO_BOTON, 24, Text.translatable("menu.returnToGame"), b -> {
			this.client.setScreen(null);
			this.client.mouse.lockCursor();
		}, BotonRataLand.Estilo.HIERBA, 1.5f));
		y += 28;
		this.addDrawableChild(new BotonRataLand(x, y, medio, 20, Text.translatable("gui.advancements"), b -> {
			if (this.client.player != null) {
				this.client.setScreen(new AdvancementsScreen(this.client.player.networkHandler.getAdvancementHandler(), this));
			}
		}, BotonRataLand.Estilo.PIEDRA));
		this.addDrawableChild(new BotonRataLand(x + medio + 4, y, medio, 20, Text.translatable("gui.stats"), b -> {
			if (this.client.player != null) {
				this.client.setScreen(new StatsScreen(this, this.client.player.getStatHandler()));
			}
		}, BotonRataLand.Estilo.PIEDRA));
		y += 24;
		this.addDrawableChild(new BotonRataLand(x, y, hayDiscord ? medio : ANCHO_BOTON, 20, Text.translatable("menu.options"),
				b -> this.client.setScreen(new OptionsScreen(this, this.client.options)), BotonRataLand.Estilo.PIEDRA));
		if (hayDiscord) {
			this.addDrawableChild(new BotonRataLand(x + medio + 4, y, medio, 20, Text.literal("Discord"),
					ConfirmLinkScreen.opening(this, RataLand.discord), BotonRataLand.Estilo.PIEDRA));
		}
		y += 20 + 12;
		this.addDrawableChild(new BotonRataLand(x, y, ANCHO_BOTON, 20, Text.literal("Volver a " + RataLand.nombre),
				b -> volverAlMenu(), BotonRataLand.Estilo.PELIGRO));
	}

	private void volverAlMenu() {
		if (this.client.world != null) this.client.world.disconnect();
		this.client.disconnect();
		this.client.setScreen(new MenuRataLand());
	}

	@Override
	public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
		super.renderBackground(context, mouseX, mouseY, delta);
		// Panel con marco: borde oscuro, fondo noche y un filo de color queso
		context.fill(panelX - 2, panelY - 2, panelX + ANCHO + 2, panelY + panelAlto + 2, 0xFF1B120B);
		context.fill(panelX, panelY, panelX + ANCHO, panelY + panelAlto, 0xEB0D1424);
		context.drawBorder(panelX + 1, panelY + 1, ANCHO - 2, panelAlto - 2, 0x59F6C445);
	}

	@Override
	public void render(DrawContext context, int mouseX, int mouseY, float delta) {
		super.render(context, mouseX, mouseY, delta);
		int escala = escalaLogo();
		int w = RataLand.LOGO_ANCHO * escala;
		int h = RataLand.LOGO_ALTO * escala;
		context.drawTexture(RataLand.LOGO, panelX + (ANCHO - w) / 2, panelY + 12, w, h, 0, 0,
				RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);

		if (RataLand.MODO_CAPTURA && ++fotogramas == 60) {
			ScreenshotRecorder.saveScreenshot(this.client.runDirectory, "rataland-pausa.png", this.client.getFramebuffer(), t -> {});
			this.client.scheduleStop();
		}
	}
}
