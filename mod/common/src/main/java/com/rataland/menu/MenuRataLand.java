package com.rataland.menu;

import net.minecraft.SharedConstants;
import net.minecraft.Util;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.ConfirmLinkScreen;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.resolver.ServerAddress;
import net.minecraft.network.chat.Component;
import net.minecraft.util.Mth;
import com.mojang.math.Axis;
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
		super(Component.literal(RataLand.nombre));
		this.frase = RataLand.frases.get((int) (Math.random() * RataLand.frases.size()));
	}

	/**
	 * Escala del logo: un número entero de píxeles de pantalla por cada píxel del logo, para que
	 * se vea nítido aunque no sea un múltiplo de la escala de la interfaz.
	 */
	private float escalaLogo() {
		int gui = Math.max(1, (int) this.minecraft.getWindow().getGuiScale());
		int porAncho = (int) (this.width * gui * 0.42f / RataLand.LOGO_ANCHO);
		int porAlto = (int) (this.height * gui * 0.26f / RataLand.LOGO_ALTO);
		return (float) Math.max(gui, Math.min(porAncho, porAlto)) / gui;
	}

	/** Lo mismo para el personaje: unos 2/5 del alto de la ventana, en píxeles enteros. */
	private float escalaPersonaje() {
		int gui = Math.max(1, (int) this.minecraft.getWindow().getGuiScale());
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

		this.botonJugar = this.addRenderableWidget(new BotonRataLand(MARGEN, y, anchoJugar, ALTO_JUGAR,
				Component.literal(conectando ? "Conectando..." : "Jugar"), b -> jugar(), BotonRataLand.Estilo.HIERBA, 2f));
		if (hayDiscord) {
			this.addRenderableWidget(new BotonRataLand(MARGEN + anchoJugar + 6, y, ALTO_JUGAR, ALTO_JUGAR, Component.literal("Discord"),
					ConfirmLinkScreen.confirmLink(this, RataLand.discord), BotonRataLand.Estilo.DISCORD));
		}
		y += ALTO_JUGAR + 6;
		this.addRenderableWidget(new BotonRataLand(MARGEN, y, medio, 20, Component.translatable("menu.options"),
				b -> this.minecraft.setScreen(new OptionsScreen(this, this.minecraft.options)), BotonRataLand.Estilo.PIEDRA));
		this.addRenderableWidget(new BotonRataLand(MARGEN + medio + 6, y, medio, 20, Component.literal("Salir"),
				b -> this.minecraft.stop(), BotonRataLand.Estilo.PIEDRA));
	}

	/** Busca la dirección actual del servidor (sin congelar el juego) y se conecta. */
	private void jugar() {
		if (conectando) return;
		conectando = true;
		this.botonJugar.setMessage(Component.literal("Conectando..."));
		CompletableFuture.supplyAsync(RataLand::direccionParaConectar).whenComplete((encontrada, error) -> this.minecraft.execute(() -> {
			conectando = false;
			this.botonJugar.setMessage(Component.literal("Jugar"));
			if (this.minecraft.screen != this) return;
			String direccion = encontrada != null ? encontrada : RataLand.direccion();
			RataLand.LOG.info("Conectando a {}", direccion);
			ServerData info = new ServerData(RataLand.nombre, direccion, ServerData.Type.OTHER);
			ConnectScreen.startConnecting(this, this.minecraft, ServerAddress.parseString(direccion), info, false, null);
		}));
	}

	@Override
	public void renderBackground(GuiGraphics context, int mouseX, int mouseY, float delta) {
		Fondo.dibujar(context, this.width, this.height);
		Fondo.oscurecerIzquierda(context, this.width, this.height);
		context.fillGradient(0, this.height * 3 / 4, this.width, this.height, 0x00000000, 0x80000000);
	}

	@Override
	public void render(GuiGraphics context, int mouseX, int mouseY, float delta) {
		super.render(context, mouseX, mouseY, delta);

		// Temporada encima del logo
		int y = arriba();
		if (!RataLand.temporada.isEmpty()) {
			Cartel.chip(context, this.font, MARGEN, y, RataLand.temporada);
			y += altoChip();
		}

		// Logo y su frase
		float escala = escalaLogo();
		int w = Mth.floor(RataLand.LOGO_ANCHO * escala);
		int h = Mth.floor(RataLand.LOGO_ALTO * escala);
		context.pose().pushPose();
		context.pose().translate(MARGEN, y, 0f);
		context.pose().scale(escala, escala, 1f);
		context.blit(RataLand.LOGO, 0, 0, 0f, 0f, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);
		context.pose().popPose();
		dibujarFrase(context, y, w, h);

		// Cuenta atrás del próximo episodio, si cabe entre el logo y los botones
		int yCartel = y + h + 12;
		float escalaTiempo = 2f;
		if (Cartel.hayCuentaAtras() && yCartel + Cartel.altoCuentaAtras(escalaTiempo) <= arribaBotones() - 8) {
			Cartel.cuentaAtras(context, this.font, MARGEN, yCartel, escalaTiempo);
		}

		// Tu personaje, de pie en el paisaje a la derecha (si hay sitio)
		float escalaPj = escalaPersonaje();
		int anchoPj = Math.round(16 * escalaPj);
		int altoPj = Math.round(32 * escalaPj);
		int xPj = (int) (this.width * 0.72f) - anchoPj / 2;
		int yPj = this.height - ABAJO - altoPj;
		if (xPj > MARGEN + Math.max(ANCHO_BOTONES, w) + 24 && yPj > 24) {
			Personaje.dibujar(context, this.minecraft, this.font, xPj, yPj, escalaPj, this.minecraft.getUser().getName());
		}

		String version = "Minecraft " + SharedConstants.getCurrentVersion().getName();
		context.drawString(this.font, version, 6, this.height - 13, 0xFFA3B0C8);

		if (RataLand.MODO_CAPTURA && ++fotogramas == 60) {
			Screenshot.grab(this.minecraft.gameDirectory, "rataland-menu.png",
					this.minecraft.getMainRenderTarget(), t -> {});
			this.minecraft.setScreen(new OptionsScreen(this, this.minecraft.options));
		}
	}

	/**
	 * Frase amarilla inclinada que late, como las de Minecraft. Empieza en la esquina del logo
	 * y sube hacia la derecha, para no tapar el nombre.
	 */
	private void dibujarFrase(GuiGraphics context, int arriba, int w, int h) {
		int ancho = this.font.width(this.frase);
		float base = 1.8f * 100f / (ancho + 32) * Math.min(1f, w / 256f);
		float latido = base * (1f - Mth.abs(Mth.sin((float) (Util.getMillis() % 1000L) / 1000f * ((float) Math.PI * 2f))) * 0.06f);
		float mitad = ancho * base / 2f;
		float angulo = 16f * Mth.DEG_TO_RAD;
		context.pose().pushPose();
		context.pose().translate(MARGEN + w - 20 + mitad * Mth.cos(angulo), arriba + h - 2 - mitad * Mth.sin(angulo), 0f);
		context.pose().mulPose(Axis.ZP.rotationDegrees(-16f));
		context.pose().scale(latido, latido, latido);
		context.drawCenteredString(this.font, this.frase, 0, -4, 0xFFFFFF55);
		context.pose().popPose();
	}

	@Override
	public boolean shouldCloseOnEsc() {
		return false;
	}
}
