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
 * Menú de pausa de RataLand: un panel a la izquierda con los botones en columna, que deja ver el
 * mundo. "Volver a RataLand" (abajo, aparte) desconecta y lleva al menú principal de la serie.
 */
public class PausaRataLand extends Screen {
	private static final int MARGEN = 16;
	private static final int SEPARACION = 4;

	private int fotogramas;
	private int anchoPanel;
	private int escalaLogo;
	private boolean conChip;

	public PausaRataLand() {
		super(Text.translatable("menu.game"));
	}

	private int altoLogo() {
		return RataLand.LOGO_ALTO * escalaLogo;
	}

	/** Alto de lo de arriba (logo, temporada y botones) para decidir si cabe a tamaño grande. */
	private int altoContenido(boolean hayDiscord) {
		int botones = 24 + SEPARACION + (20 + SEPARACION) * (hayDiscord ? 4 : 3);
		return 14 + altoLogo() + 8 + (conChip ? 15 + 12 : 4) + botones;
	}

	@Override
	protected void init() {
		boolean hayDiscord = !RataLand.discord.isEmpty();
		this.anchoPanel = Math.min(210, Math.max(160, (int) (this.width * 0.32f)));
		int anchoBoton = anchoPanel - MARGEN * 2;

		// Lo más grande que quepa: logo ×2 y la temporada; si no, logo ×1 y sin temporada
		this.escalaLogo = RataLand.LOGO_ANCHO * 2 <= anchoBoton ? 2 : 1;
		this.conChip = !RataLand.temporada.isEmpty();
		int abajo = this.height - 14 - 20;
		if (altoContenido(hayDiscord) > abajo - 10) this.escalaLogo = 1;
		if (altoContenido(hayDiscord) > abajo - 10) this.conChip = false;

		int x = MARGEN;
		int y = 14 + altoLogo() + 8 + (conChip ? 15 + 12 : 4);

		this.addDrawableChild(new BotonRataLand(x, y, anchoBoton, 24, Text.translatable("menu.returnToGame"), b -> {
			this.client.setScreen(null);
			this.client.mouse.lockCursor();
		}, BotonRataLand.Estilo.HIERBA, 1.5f));
		y += 24 + SEPARACION;
		this.addDrawableChild(new BotonRataLand(x, y, anchoBoton, 20, Text.translatable("gui.advancements"), b -> {
			if (this.client.player != null) {
				this.client.setScreen(new AdvancementsScreen(this.client.player.networkHandler.getAdvancementHandler(), this));
			}
		}, BotonRataLand.Estilo.PIEDRA));
		y += 20 + SEPARACION;
		this.addDrawableChild(new BotonRataLand(x, y, anchoBoton, 20, Text.translatable("gui.stats"), b -> {
			if (this.client.player != null) {
				this.client.setScreen(new StatsScreen(this, this.client.player.getStatHandler()));
			}
		}, BotonRataLand.Estilo.PIEDRA));
		y += 20 + SEPARACION;
		this.addDrawableChild(new BotonRataLand(x, y, anchoBoton, 20, Text.translatable("menu.options"),
				b -> this.client.setScreen(new OptionsScreen(this, this.client.options)), BotonRataLand.Estilo.PIEDRA));
		y += 20 + SEPARACION;
		if (hayDiscord) {
			this.addDrawableChild(new BotonRataLand(x, y, anchoBoton, 20, Text.literal("Discord"),
					ConfirmLinkScreen.opening(this, RataLand.discord), BotonRataLand.Estilo.PIEDRA));
		}
		this.addDrawableChild(new BotonRataLand(x, abajo, anchoBoton, 20, Text.literal("Volver a " + RataLand.nombre),
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
		// Panel de la izquierda: noche casi opaca y un filo de queso
		context.fill(0, 0, anchoPanel, this.height, 0xEE090E1A);
		context.fill(anchoPanel - 1, 0, anchoPanel, this.height, 0x80F6C445);
	}

	@Override
	public void render(DrawContext context, int mouseX, int mouseY, float delta) {
		super.render(context, mouseX, mouseY, delta);
		int w = RataLand.LOGO_ANCHO * escalaLogo;
		int h = altoLogo();
		context.drawTexture(RataLand.LOGO, MARGEN, 14, w, h, 0, 0,
				RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);
		if (conChip) Cartel.chip(context, this.textRenderer, MARGEN, 14 + h + 8, RataLand.temporada);

		// Cuenta atrás del próximo episodio, abajo a la derecha, sobre el mundo
		if (Cartel.hayCuentaAtras()) {
			float escala = this.height >= 300 ? 2f : 1.5f;
			int ancho = Cartel.anchoCuentaAtras(this.textRenderer, escala);
			int x = this.width - ancho - 14;
			if (x > anchoPanel + 14) {
				Cartel.cuentaAtras(context, this.textRenderer, x, this.height - Cartel.altoCuentaAtras(escala) - 14, escala);
			}
		}

		if (RataLand.MODO_CAPTURA && ++fotogramas == 60) {
			ScreenshotRecorder.saveScreenshot(this.client.runDirectory, "rataland-pausa.png", this.client.getFramebuffer(), t -> {});
			this.client.scheduleStop();
		}
	}
}
