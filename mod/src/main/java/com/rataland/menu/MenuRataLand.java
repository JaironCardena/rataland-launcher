package com.rataland.menu;

import net.minecraft.SharedConstants;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.ConfirmLinkScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.ConnectScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.network.ServerAddress;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.text.Text;
import net.minecraft.util.Util;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RotationAxis;

import java.util.concurrent.CompletableFuture;

/**
 * Menú principal de RataLand (sustituye a la pantalla de título): a la izquierda la temporada, el
 * logo con su frase, la cuenta atrás y los botones abajo; a la derecha, tu personaje en el paisaje.
 */
public class MenuRataLand extends Screen {
	private static final int MARGEN = 28;
	private static final int ANCHO_BOTONES = 206;
	private static final int ALTO_JUGAR = 32;
	private static final int ABAJO = 30;

	private final String frase;
	private BotonRataLand botonJugar;
	private boolean conectando;
	private int fotogramas;

	public MenuRataLand() {
		super(Text.literal(RataLand.nombre));
		this.frase = RataLand.frases.get((int) (Math.random() * RataLand.frases.size()));
	}

	/**
	 * Escala del logo: un número entero de píxeles de pantalla por cada píxel del logo, para que
	 * se vea nítido aunque no sea un múltiplo de la escala de la interfaz.
	 */
	private float escalaLogo() {
		int gui = Math.max(1, (int) this.client.getWindow().getScaleFactor());
		int porAncho = (int) (this.width * gui * 0.42f / RataLand.LOGO_ANCHO);
		int porAlto = (int) (this.height * gui * 0.26f / RataLand.LOGO_ALTO);
		return (float) Math.max(gui, Math.min(porAncho, porAlto)) / gui;
	}

	/** Lo mismo para el personaje: unos 2/5 del alto de la ventana, en píxeles enteros. */
	private float escalaPersonaje() {
		int gui = Math.max(1, (int) this.client.getWindow().getScaleFactor());
		return (float) Math.max(gui, (int) (this.height * gui * 0.4f / 32)) / gui;
	}

	private int arriba() {
		return Math.max(12, (int) (this.height * 0.07f));
	}

	private int altoChip() {
		return RataLand.temporada.isEmpty() ? 0 : 15 + 8;
	}

	/** Donde empieza la fila del botón Jugar (los botones van abajo). */
	private int arribaBotones() {
		return this.height - ABAJO - 20 - 6 - ALTO_JUGAR;
	}

	@Override
	protected void init() {
		int y = arribaBotones();
		boolean hayDiscord = !RataLand.discord.isEmpty();
		int anchoJugar = hayDiscord ? ANCHO_BOTONES - ALTO_JUGAR - 6 : ANCHO_BOTONES;
		int medio = (ANCHO_BOTONES - 6) / 2;

		this.botonJugar = this.addDrawableChild(new BotonRataLand(MARGEN, y, anchoJugar, ALTO_JUGAR,
				Text.literal(conectando ? "Conectando..." : "Jugar"), b -> jugar(), BotonRataLand.Estilo.HIERBA, 2f));
		if (hayDiscord) {
			this.addDrawableChild(new BotonRataLand(MARGEN + anchoJugar + 6, y, ALTO_JUGAR, ALTO_JUGAR, Text.literal("Discord"),
					ConfirmLinkScreen.opening(this, RataLand.discord), BotonRataLand.Estilo.DISCORD));
		}
		y += ALTO_JUGAR + 6;
		this.addDrawableChild(new BotonRataLand(MARGEN, y, medio, 20, Text.translatable("menu.options"),
				b -> this.client.setScreen(new OptionsScreen(this, this.client.options)), BotonRataLand.Estilo.PIEDRA));
		this.addDrawableChild(new BotonRataLand(MARGEN + medio + 6, y, medio, 20, Text.literal("Salir"),
				b -> this.client.scheduleStop(), BotonRataLand.Estilo.PIEDRA));
	}

	/** Busca la dirección actual del servidor (sin congelar el juego) y se conecta. */
	private void jugar() {
		if (conectando) return;
		conectando = true;
		this.botonJugar.setMessage(Text.literal("Conectando..."));
		CompletableFuture.supplyAsync(RataLand::direccionParaConectar).whenComplete((encontrada, error) -> this.client.execute(() -> {
			conectando = false;
			this.botonJugar.setMessage(Text.literal("Jugar"));
			if (this.client.currentScreen != this) return;
			String direccion = encontrada != null ? encontrada : RataLand.direccion();
			RataLand.LOG.info("Conectando a {}", direccion);
			ServerInfo info = new ServerInfo(RataLand.nombre, direccion, ServerInfo.ServerType.OTHER);
			ConnectScreen.connect(this, this.client, ServerAddress.parse(direccion), info, false, null);
		}));
	}

	@Override
	public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
		Fondo.dibujar(context, this.width, this.height);
		Fondo.oscurecerIzquierda(context, this.width, this.height);
		context.fillGradient(0, this.height * 3 / 4, this.width, this.height, 0x00000000, 0x80000000);
	}

	@Override
	public void render(DrawContext context, int mouseX, int mouseY, float delta) {
		super.render(context, mouseX, mouseY, delta);

		// Temporada encima del logo
		int y = arriba();
		if (!RataLand.temporada.isEmpty()) {
			Cartel.chip(context, this.textRenderer, MARGEN, y, RataLand.temporada);
			y += altoChip();
		}

		// Logo y su frase
		float escala = escalaLogo();
		int w = MathHelper.floor(RataLand.LOGO_ANCHO * escala);
		int h = MathHelper.floor(RataLand.LOGO_ALTO * escala);
		context.getMatrices().push();
		context.getMatrices().translate(MARGEN, y, 0f);
		context.getMatrices().scale(escala, escala, 1f);
		context.drawTexture(RataLand.LOGO, 0, 0, 0f, 0f, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);
		context.getMatrices().pop();
		dibujarFrase(context, y, w, h);

		// Cuenta atrás del próximo episodio, si cabe entre el logo y los botones
		int yCartel = y + h + 12;
		float escalaTiempo = 2f;
		if (Cartel.hayCuentaAtras() && yCartel + Cartel.altoCuentaAtras(escalaTiempo) <= arribaBotones() - 8) {
			Cartel.cuentaAtras(context, this.textRenderer, MARGEN, yCartel, escalaTiempo);
		}

		// Tu personaje, de pie en el paisaje a la derecha (si hay sitio)
		float escalaPj = escalaPersonaje();
		int anchoPj = Math.round(16 * escalaPj);
		int altoPj = Math.round(32 * escalaPj);
		int xPj = (int) (this.width * 0.72f) - anchoPj / 2;
		int yPj = this.height - ABAJO - altoPj;
		if (xPj > MARGEN + Math.max(ANCHO_BOTONES, w) + 24 && yPj > 24) {
			Personaje.dibujar(context, this.client, this.textRenderer, xPj, yPj, escalaPj, this.client.getSession().getUsername());
		}

		String version = "Minecraft " + SharedConstants.getGameVersion().getName();
		context.drawTextWithShadow(this.textRenderer, version, 6, this.height - 13, 0xFFA3B0C8);

		if (RataLand.MODO_CAPTURA && ++fotogramas == 60) {
			ScreenshotRecorder.saveScreenshot(this.client.runDirectory, "rataland-menu.png",
					this.client.getFramebuffer(), t -> {});
			this.client.setScreen(new OptionsScreen(this, this.client.options));
		}
	}

	/**
	 * Frase amarilla inclinada que late, como las de Minecraft. Empieza en la esquina del logo
	 * y sube hacia la derecha, para no tapar el nombre.
	 */
	private void dibujarFrase(DrawContext context, int arriba, int w, int h) {
		int ancho = this.textRenderer.getWidth(this.frase);
		float base = 1.8f * 100f / (ancho + 32) * Math.min(1f, w / 256f);
		float latido = base * (1f - MathHelper.abs(MathHelper.sin((float) (Util.getMeasuringTimeMs() % 1000L) / 1000f * ((float) Math.PI * 2f))) * 0.06f);
		float mitad = ancho * base / 2f;
		float angulo = 16f * MathHelper.RADIANS_PER_DEGREE;
		context.getMatrices().push();
		context.getMatrices().translate(MARGEN + w - 20 + mitad * MathHelper.cos(angulo), arriba + h - 2 - mitad * MathHelper.sin(angulo), 0f);
		context.getMatrices().multiply(RotationAxis.POSITIVE_Z.rotationDegrees(-16f));
		context.getMatrices().scale(latido, latido, latido);
		context.drawCenteredTextWithShadow(this.textRenderer, this.frase, 0, -4, 0xFFFFFF55);
		context.getMatrices().pop();
	}

	@Override
	public boolean shouldCloseOnEsc() {
		return false;
	}
}
