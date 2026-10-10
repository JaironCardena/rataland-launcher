package com.rataland.menu;

import com.mojang.math.Axis;
import net.minecraft.SharedConstants;
import net.minecraft.Util;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.ConfirmLinkScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.util.Mth;

import java.util.ArrayList;
import java.util.List;

/**
 * Menú principal de RataLand (sustituye a la pantalla de título), como la portada de un juego: arriba
 * el logo con su frase y la cuenta atrás del próximo episodio; en medio el paisaje libre; abajo, en el
 * centro, el estado del servidor, Jugar y Opciones, Discord y Salir. Tu personaje está de pie en el
 * paisaje, a la derecha, y tu cuenta en la esquina de arriba.
 */
public class MenuRataLand extends Screen {
	private static final int MARGEN = 10;
	private static final int SEPARACION = 4;
	private static final int ALTO_JUGAR = 28;
	private static final int ALTO_BOTON = 20;
	private static final int ALTO_ESTADO = 15;
	private static final int ANCHO_ACCIONES_MIN = 180;

	private final String frase;
	private BotonRataLand botonJugar;
	private int fotogramas;

	// Maquetación, calculada en init()
	private float escalaLogo;
	private int xLogo;
	private int yLogo;
	private int anchoLogo;
	private int altoLogo;
	private boolean conCuentaAtras;
	private int xAcciones;
	private int anchoAcciones;
	private int yEstado;
	private int pie;

	public MenuRataLand() {
		super(Component.literal(RataLand.nombre));
		this.frase = RataLand.frases.get((int) (Math.random() * RataLand.frases.size()));
	}

	private int escalaInterfaz() {
		return Math.max(1, (int) this.minecraft.getWindow().getGuiScale());
	}

	/**
	 * Escala del logo: un número entero de píxeles de pantalla por cada píxel del logo, para que
	 * se vea nítido aunque no sea un múltiplo de la escala de la interfaz.
	 */
	private float escalaLogo(float anchoMax, float altoMax) {
		int gui = escalaInterfaz();
		int porAncho = (int) (anchoMax * gui / RataLand.LOGO_ANCHO);
		int porAlto = (int) (altoMax * gui / RataLand.LOGO_ALTO);
		return (float) Math.max(gui, Math.min(porAncho, porAlto)) / gui;
	}

	/** Lo mismo para el personaje (32 de alto), en píxeles enteros de pantalla. */
	private float escalaPersonaje(float altoMax) {
		int gui = escalaInterfaz();
		return (float) Math.max(0, (int) (altoMax * gui / 32)) / gui;
	}

	@Override
	protected void init() {
		// Al volver aquí (cancelar la conexión, salir del servidor…) ya no se está entrando ni esperando
		Conexion.entrando = false;
		SalaEspera.terminar();

		// Abajo, en el centro: estado del servidor, Jugar y la fila de Opciones, Discord y Salir
		List<String> fila = new ArrayList<>(List.of("Opciones"));
		if (!RataLand.discord.isEmpty()) fila.add("Discord");
		fila.add("Salir");
		int anchoTexto = 0;
		for (String texto : fila) anchoTexto = Math.max(anchoTexto, this.font.width(texto));
		int n = fila.size();
		this.anchoAcciones = Math.max(ANCHO_ACCIONES_MIN, n * (anchoTexto + 8 + 6 + 16) + (n - 1) * SEPARACION);
		this.anchoAcciones = Math.min(this.anchoAcciones, this.width - 2 * MARGEN);
		int anchoBoton = (this.anchoAcciones - (n - 1) * SEPARACION) / n;
		this.xAcciones = (this.width - this.anchoAcciones) / 2;
		int abajo = Math.max(MARGEN, Math.round(this.height * 0.05f));
		int yFila = this.height - abajo - ALTO_BOTON;
		int yJugar = yFila - SEPARACION - ALTO_JUGAR;
		this.yEstado = yJugar - 5 - ALTO_ESTADO;
		this.pie = yFila + ALTO_BOTON;

		this.botonJugar = this.addRenderableWidget(new BotonRataLand(this.xAcciones, yJugar, this.anchoAcciones, ALTO_JUGAR,
				Component.literal(Conexion.buscando() ? "Buscando..." : "Jugar"), b -> jugar(), BotonRataLand.Estilo.HIERBA, 2f));
		int x = this.xAcciones;
		this.addRenderableWidget(new BotonRataLand(x, yFila, anchoBoton, ALTO_BOTON, Component.literal("Opciones"),
				b -> this.minecraft.setScreen(new OptionsScreen(this, this.minecraft.options)), BotonRataLand.Estilo.PIEDRA)
				.conIcono(IconosPixel.AJUSTES, 0xFFFFFFFF));
		x += anchoBoton + SEPARACION;
		if (!RataLand.discord.isEmpty()) {
			this.addRenderableWidget(new BotonRataLand(x, yFila, anchoBoton, ALTO_BOTON, Component.literal("Discord"),
					ConfirmLinkScreen.confirmLink(this, RataLand.discord), BotonRataLand.Estilo.DISCORD).conIcono(IconosPixel.DISCORD, 0xFFFFFFFF));
			x += anchoBoton + SEPARACION;
		}
		// El último se estira hasta el borde, por si la división no es exacta
		this.addRenderableWidget(new BotonRataLand(x, yFila, this.xAcciones + this.anchoAcciones - x, ALTO_BOTON, Component.literal("Salir"),
				b -> this.minecraft.stop(), BotonRataLand.Estilo.PELIGRO).conIcono(IconosPixel.SALIR, 0xFFFF9A8A));

		// Arriba, en el centro: el logo lo más grande posible dejando ver el paisaje entre él y los botones
		this.conCuentaAtras = Cartel.hayCuentaAtras();
		this.yLogo = Math.max(8, Math.round(this.height * 0.055f));
		int debajoLogo = this.conCuentaAtras ? 6 + Cartel.ALTO_CINTA : 0;
		float altoMax = Math.min(this.height * 0.27f, this.yEstado - 24 - debajoLogo - this.yLogo);
		this.escalaLogo = escalaLogo(Math.min(this.width * 0.46f, 300f), altoMax);
		this.anchoLogo = Mth.floor(RataLand.LOGO_ANCHO * this.escalaLogo);
		this.altoLogo = Mth.floor(RataLand.LOGO_ALTO * this.escalaLogo);
		this.xLogo = (this.width - this.anchoLogo) / 2;
	}

	private void jugar() {
		if (Conexion.buscando()) return;
		this.botonJugar.setMessage(Component.literal("Buscando..."));
		Conexion.entrar(this);
	}

	@Override
	public void tick() {
		EstadoServidor.mantener();
		if (!Conexion.buscando() && !"Jugar".equals(this.botonJugar.getMessage().getString())) this.botonJugar.setMessage(Component.literal("Jugar"));
	}

	/* ---------- Estado del servidor, encima de Jugar ---------- */

	private void dibujarEstado(GuiGraphics g, int mouseX, int mouseY) {
		EstadoServidor.Estado estado = EstadoServidor.estado();
		int color;
		String titulo;
		String detalle = "";
		List<String> nombres = List.of();
		switch (estado) {
			case ENCENDIDO -> {
				color = Estilo.HIERBA;
				titulo = "Servidor abierto";
				int conectados = EstadoServidor.conectados();
				detalle = conectados == 0 ? "nadie dentro" : conectados + " dentro";
				nombres = EstadoServidor.nombres();
			}
			case ENCENDIENDO -> {
				color = Estilo.QUESO;
				titulo = "Despertando el servidor";
				detalle = "un par de minutos";
			}
			case APAGADO -> {
				color = Estilo.ERROR;
				titulo = "Servidor dormido";
				detalle = "se despierta al pulsar Jugar";
			}
			case SIN_RESPUESTA -> {
				color = Estilo.ERROR;
				titulo = "No responde";
				detalle = "¿apagado o sin internet?";
			}
			default -> {
				color = Estilo.MUY_TENUE;
				titulo = "Mirando el servidor...";
			}
		}
		int caben = Math.min(nombres.size(), 5);
		int anchoCabezas = caben > 0 ? 6 + caben * 9 - 1 : 0;
		int w = anchoEstado(titulo, anchoCabezas, detalle);
		if (w > this.width - 2 * MARGEN) {
			detalle = "";
			w = anchoEstado(titulo, anchoCabezas, detalle);
		}
		int x = (this.width - w) / 2;
		int y = this.yEstado;
		Estilo.escalon(g, x, y, w, ALTO_ESTADO, 0xC2080D1A);
		Estilo.punto(g, x + 6, y + 5, color);
		int cx = x + 16;
		g.drawString(this.font, titulo, cx, y + 4, Estilo.TEXTO);
		cx += this.font.width(titulo);
		if (caben > 0) {
			cx += 6;
			int desde = cx;
			for (int i = 0; i < caben; i++) {
				Cabezas.dibujar(g, nombres.get(i), cx, y + 3, 8);
				cx += 9;
			}
			if (mouseX >= desde && mouseX < cx && mouseY >= y && mouseY < y + ALTO_ESTADO) {
				this.setTooltipForNextRenderPass(Component.literal(String.join(", ", nombres)));
			}
			cx -= 1;
		}
		if (!detalle.isEmpty()) {
			// Una rayita separa el estado del detalle
			g.fill(cx + 6, y + 3, cx + 7, y + 12, 0x50D6E2FF);
			g.drawString(this.font, detalle, cx + 13, y + 4, Estilo.TENUE);
		}
	}

	private int anchoEstado(String titulo, int anchoCabezas, String detalle) {
		return 16 + this.font.width(titulo) + anchoCabezas + (detalle.isEmpty() ? 0 : 13 + this.font.width(detalle)) + 7;
	}

	/* ---------- Tu cuenta, arriba a la derecha ---------- */

	private void dibujarCuenta(GuiGraphics g) {
		String nombre = this.minecraft.getUser().getName();
		String cuenta = switch (RataLand.cuenta) {
			case "microsoft" -> "Premium";
			case "sinPremium" -> "Sin premium";
			default -> "";
		};
		int h = cuenta.isEmpty() ? 22 : 28;
		int w = 5 + 18 + 6 + Math.max(this.font.width(nombre), this.font.width(cuenta)) + 8;
		int x = this.width - MARGEN - w;
		int y = 6;
		// Sin sitio a la derecha del logo, no se pone
		if (x < this.xLogo + this.anchoLogo + 8) return;
		Estilo.escalon(g, x, y, w, h, 0xB8080D1A);
		Personaje.cara(g, this.minecraft, x + 5, y + (h - 18) / 2, 18);
		int tx = x + 5 + 18 + 6;
		if (cuenta.isEmpty()) {
			g.drawString(this.font, nombre, tx, y + 7, Estilo.TEXTO);
		} else {
			g.drawString(this.font, nombre, tx, y + 5, Estilo.TEXTO);
			g.drawString(this.font, cuenta, tx, y + 16, Estilo.TENUE);
		}
	}

	/* ---------- Dibujo ---------- */

	@Override
	public void renderBackground(GuiGraphics g, int mouseX, int mouseY, float delta) {
		Fondo.dibujar(g, this.width, this.height);
		// Algo de oscuridad arriba y abajo para leer bien; el paisaje del medio, limpio
		g.fillGradient(0, 0, this.width, Math.round(this.height * 0.34f), 0x99080D1A, 0x00080D1A);
		g.fillGradient(0, Math.round(this.height * 0.6f), this.width, this.height, 0x00080D1A, 0xD6080D1A);

		g.pose().pushPose();
		g.pose().translate(this.xLogo, this.yLogo, 0f);
		g.pose().scale(this.escalaLogo, this.escalaLogo, 1f);
		g.blit(RataLand.LOGO, 0, 0, 0f, 0f, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);
		g.pose().popPose();
		dibujarFrase(g);

		int arribaPersonaje = this.yLogo + this.altoLogo + 12;
		if (this.conCuentaAtras) {
			int yCinta = this.yLogo + this.altoLogo + 6;
			Cartel.cinta(g, this.font, this.width / 2, yCinta, this.width - 2 * MARGEN);
			arribaPersonaje = yCinta + Cartel.ALTO_CINTA + 12;
		}
		dibujarCuenta(g);
		dibujarPersonaje(g, arribaPersonaje);
		dibujarEstado(g, mouseX, mouseY);

		String version = "Minecraft " + SharedConstants.getCurrentVersion().getName() + " con " + RataLand.cargador;
		if (6 + this.font.width(version) + 8 <= this.xAcciones) g.drawString(this.font, version, 6, this.height - 6 - 8, Estilo.MUY_TENUE);
	}

	/** Tu personaje, de pie en el paisaje a la derecha de los botones (si hay sitio). */
	private void dibujarPersonaje(GuiGraphics g, int arriba) {
		String nombre = this.minecraft.getUser().getName();
		int izquierda = this.xAcciones + this.anchoAcciones + 16;
		int derecha = this.width - MARGEN;
		float escala = escalaPersonaje(Math.min(this.height * 0.38f, this.pie - arriba - 14));
		escala = Math.min(escala, (float) Math.floor((derecha - izquierda) / 16f * escalaInterfaz()) / escalaInterfaz());
		if (escala < 1f) return;
		int ancho = Math.round(16 * escala);
		int alto = Math.round(32 * escala);
		int hueco = Math.max(ancho, this.font.width(nombre) + 6);
		if (derecha - izquierda < hueco) return;
		int centro = Mth.clamp(Math.round(this.width * 0.85f), izquierda + hueco / 2, derecha - hueco / 2);
		Personaje.dibujar(g, this.minecraft, this.font, centro - ancho / 2, this.pie - alto, escala, nombre);
	}

	@Override
	public void render(GuiGraphics g, int mouseX, int mouseY, float delta) {
		super.render(g, mouseX, mouseY, delta);
		if (RataLand.MODO_CAPTURA && Prueba.alPrincipio() && ++this.fotogramas == 80) {
			Screenshot.grab(this.minecraft.gameDirectory, "rataland-menu.png", this.minecraft.getMainRenderTarget(), t -> {});
			this.minecraft.setScreen(new OptionsScreen(this, this.minecraft.options));
		}
	}

	/**
	 * Frase amarilla inclinada que late, como las de Minecraft. Empieza en la esquina del logo
	 * y sube hacia la derecha, para no tapar el nombre.
	 */
	private void dibujarFrase(GuiGraphics context) {
		int ancho = this.font.width(this.frase);
		float base = 1.8f * 100f / (ancho + 32) * Math.min(1f, this.anchoLogo / 256f);
		float latido = base * (1f - Mth.abs(Mth.sin((float) (Util.getMillis() % 1000L) / 1000f * ((float) Math.PI * 2f))) * 0.06f);
		float mitad = ancho * base / 2f;
		float angulo = 16f * Mth.DEG_TO_RAD;
		context.pose().pushPose();
		context.pose().translate(this.xLogo + this.anchoLogo - 20 + mitad * Mth.cos(angulo), this.yLogo + this.altoLogo - 2 - mitad * Mth.sin(angulo), 0f);
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
