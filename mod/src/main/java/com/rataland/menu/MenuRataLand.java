package com.rataland.menu;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.ConnectScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.network.ServerAddress;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.text.Text;
import net.minecraft.SharedConstants;

/** Menú principal de RataLand: sustituye a la pantalla de título de Minecraft. */
public class MenuRataLand extends Screen {
	private int fotogramas;

	public MenuRataLand() {
		super(Text.literal(RataLand.nombre));
	}

	@Override
	protected void init() {
		int centro = this.width / 2;
		int y = Math.max(this.height / 2 + 4, alturaLogo() + 34);

		this.addDrawableChild(ButtonWidget.builder(Text.literal("Jugar"), b -> jugar())
				.dimensions(centro - 100, y, 200, 28)
				.build());
		this.addDrawableChild(ButtonWidget.builder(Text.translatable("menu.options"),
						b -> this.client.setScreen(new OptionsScreen(this, this.client.options)))
				.dimensions(centro - 100, y + 34, 98, 20)
				.build());
		this.addDrawableChild(ButtonWidget.builder(Text.translatable("menu.quit"), b -> this.client.scheduleStop())
				.dimensions(centro + 2, y + 34, 98, 20)
				.build());
	}

	private void jugar() {
		String direccion = RataLand.direccion();
		ServerInfo info = new ServerInfo(RataLand.nombre, direccion, ServerInfo.ServerType.OTHER);
		ConnectScreen.connect(this, this.client, ServerAddress.parse(direccion), info, false, null);
	}

	/** Escala entera para que el logo pixel-art se vea nítido. */
	private int escalaLogo() {
		int porAncho = (int) (this.width * 0.6f / RataLand.LOGO_ANCHO);
		int porAlto = (int) (this.height * 0.3f / RataLand.LOGO_ALTO);
		return Math.max(1, Math.min(porAncho, porAlto));
	}

	private int alturaLogo() {
		return (int) (this.height * 0.12f) + RataLand.LOGO_ALTO * escalaLogo();
	}

	@Override
	public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
		Fondo.dibujar(context, this.width, this.height);
		context.fillGradient(0, this.height / 3, this.width, this.height, 0x00000000, 0xA0000000);
	}

	@Override
	public void render(DrawContext context, int mouseX, int mouseY, float delta) {
		super.render(context, mouseX, mouseY, delta);

		int escala = escalaLogo();
		int w = RataLand.LOGO_ANCHO * escala;
		int h = RataLand.LOGO_ALTO * escala;
		context.drawTexture(RataLand.LOGO, (this.width - w) / 2, (int) (this.height * 0.12f), w, h, 0, 0,
				RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);

		String version = "Minecraft " + SharedConstants.getGameVersion().getName();
		context.drawTextWithShadow(this.textRenderer, version, 4, this.height - 12, 0xFF9AA8C3);

		if (RataLand.MODO_CAPTURA && ++fotogramas == 60) {
			ScreenshotRecorder.saveScreenshot(this.client.runDirectory, "rataland-menu.png",
					this.client.getFramebuffer(), t -> {});
			this.client.setScreen(new OptionsScreen(this, this.client.options));
		}
	}

	@Override
	public boolean shouldCloseOnEsc() {
		return false;
	}
}
