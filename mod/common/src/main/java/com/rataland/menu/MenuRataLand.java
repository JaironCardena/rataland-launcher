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
import net.minecraft.network.chat.FormattedText;
import net.minecraft.network.chat.Style;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Menú principal de RataLand (sustituye a la pantalla de título), con la misma estructura que el
 * launcher: a la izquierda la temporada, el logo, el estado del servidor y la cuenta atrás; en medio
 * tu personaje; a la derecha las novedades con el último episodio; y abajo una barra con tu cuenta,
 * Opciones, Discord, Salir y el botón Jugar.
 */
public class MenuRataLand extends Screen {
	private static final int MARGEN = 16;
	private static final int MARGEN_DER = 12;
	private static final int ALTO_HUD = 38;
	private static final int ANCHO_TARJETA = 172;
	private static final int ALTO_TARJETA = 34;
	private static final int ANCHO_NOVEDADES_MAX = 144;
	private static final int ANCHO_JUGAR = 100;
	private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale.of("es"));

	private final String frase;
	private BotonRataLand botonJugar;
	private int fotogramas;

	// Maquetación, calculada en init()
	private int anchoNovedades = ANCHO_NOVEDADES_MAX;
	private float escalaLogo;
	private float escalaTiempo;
	private boolean conCuentaAtras;
	private int arribaHud;
	private int xBotones;
	private boolean conNovedades;
	private int xNov;
	private int yNov;
	private int altoNov;

	public MenuRataLand() {
		super(Component.literal(RataLand.nombre));
		this.frase = RataLand.frases.get((int) (Math.random() * RataLand.frases.size()));
	}

	/**
	 * Escala del logo: un número entero de píxeles de pantalla por cada píxel del logo, para que
	 * se vea nítido aunque no sea un múltiplo de la escala de la interfaz.
	 */
	private float escalaLogo(int altoMaximo) {
		int gui = Math.max(1, (int) this.minecraft.getWindow().getGuiScale());
		int porAncho = (int) (Math.min(this.width * 0.4f, 280) * gui / RataLand.LOGO_ANCHO);
		int porAlto = (int) (Math.min(this.height * 0.24f, altoMaximo) * gui / RataLand.LOGO_ALTO);
		return (float) Math.max(gui, Math.min(porAncho, porAlto)) / gui;
	}

	/** Columna izquierda: el logo lo más grande posible dejando sitio a la tarjeta del servidor y a la cuenta atrás. */
	private void maquetarIzquierda() {
		int y = arriba() + (RataLand.temporada.isEmpty() ? 0 : 15 + 8);
		int disponible = this.arribaHud - 8 - y - 12 - ALTO_TARJETA;
		this.conCuentaAtras = Cartel.hayCuentaAtras();
		this.escalaTiempo = 2f;
		if (this.conCuentaAtras && disponible - 8 - Cartel.altoCuentaAtras(2f) < RataLand.LOGO_ALTO * 2) this.escalaTiempo = 1.5f;
		int paraLogo = this.conCuentaAtras ? disponible - 8 - Cartel.altoCuentaAtras(this.escalaTiempo) : disponible;
		if (paraLogo < RataLand.LOGO_ALTO) {
			// No cabe todo: la cuenta atrás se queda en la pausa
			this.conCuentaAtras = false;
			paraLogo = disponible;
		}
		this.escalaLogo = escalaLogo(Math.max(RataLand.LOGO_ALTO, paraLogo));
	}

	/** Lo mismo para el personaje: hasta 2/5 del alto de la ventana, en píxeles enteros. */
	private float escalaPersonaje(int altoMaximo) {
		int gui = Math.max(1, (int) this.minecraft.getWindow().getGuiScale());
		int porAlto = (int) (Math.min(this.height * 0.4f, altoMaximo) * gui / 32);
		return (float) Math.max(1, porAlto) / gui;
	}

	private int arriba() {
		return Math.max(12, (int) (this.height * 0.06f));
	}

	@Override
	protected void init() {
		// Al volver aquí (cancelar la conexión, salir del servidor…) ya no se está entrando
		Conexion.entrando = false;
		this.arribaHud = this.height - ALTO_HUD;
		this.conNovedades = this.width >= 420 && (!RataLand.noticias.isEmpty() || !RataLand.episodioUrl.isEmpty());
		this.anchoNovedades = this.width < 470 ? 132 : ANCHO_NOVEDADES_MAX;
		this.xNov = this.width - MARGEN_DER - this.anchoNovedades;
		maquetarIzquierda();
		this.yNov = 12;
		this.altoNov = this.arribaHud - 10 - this.yNov;

		// Barra de abajo: Jugar a la derecha y, a su izquierda, Opciones, Discord y Salir
		int yBoton = this.arribaHud + (ALTO_HUD - 26) / 2;
		int xJugar = this.width - MARGEN_DER - ANCHO_JUGAR;
		this.botonJugar = this.addRenderableWidget(new BotonRataLand(xJugar, yBoton, ANCHO_JUGAR, 26,
				Component.literal(Conexion.buscando() ? "Buscando..." : "Jugar"), b -> jugar(), BotonRataLand.Estilo.HIERBA, 1.5f));
		int x = xJugar - 8 - 26;
		this.addRenderableWidget(new BotonRataLand(x, yBoton, 26, 26, Component.literal("Salir del juego"), b -> this.minecraft.stop(),
				BotonRataLand.Estilo.PELIGRO).conIcono(IconosPixel.SALIR, 0xFFFF9A8A));
		if (!RataLand.discord.isEmpty()) {
			x -= 30;
			this.addRenderableWidget(new BotonRataLand(x, yBoton, 26, 26, Component.literal("Discord"), ConfirmLinkScreen.confirmLink(this, RataLand.discord),
					BotonRataLand.Estilo.DISCORD).conIcono(IconosPixel.DISCORD, 0xFFFFFFFF));
		}
		x -= 30;
		this.addRenderableWidget(new BotonRataLand(x, yBoton, 26, 26, Component.translatable("menu.options"),
				b -> this.minecraft.setScreen(new OptionsScreen(this, this.minecraft.options)), BotonRataLand.Estilo.PIEDRA).conIcono(IconosPixel.AJUSTES, 0xFFFFFFFF));
		this.xBotones = x;

		// «Ver en YouTube», dentro de Novedades, debajo del título del episodio
		if (this.conNovedades && !RataLand.episodioUrl.isEmpty()) {
			int yEnlace = yEnlaceEpisodio();
			if (yEnlace + 11 <= this.yNov + this.altoNov - 6) {
				this.addRenderableWidget(new EnlaceRataLand(this.xNov + 7, yEnlace, Component.literal("Ver en YouTube"),
						ConfirmLinkScreen.confirmLink(this, RataLand.episodioUrl)));
			}
		}
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

	/* ---------- Novedades ---------- */

	private int anchoMini() {
		return this.anchoNovedades - 16;
	}

	private int altoMini() {
		return anchoMini() * 9 / 16;
	}

	/** El texto partido en líneas del ancho de la miniatura; si no cabe en `maximo`, la última acaba en «…». */
	private List<String> lineas(String texto, int maximo) {
		List<String> lineas = new ArrayList<>();
		for (FormattedText linea : this.font.getSplitter().splitLines(texto, anchoMini(), Style.EMPTY)) lineas.add(linea.getString());
		if (lineas.size() <= maximo) return lineas;
		lineas = new ArrayList<>(lineas.subList(0, maximo));
		lineas.set(maximo - 1, Estilo.recortar(this.font, lineas.get(maximo - 1).stripTrailing() + "…", anchoMini()));
		return lineas;
	}

	private String tituloEpisodio() {
		return RataLand.episodioTitulo.isEmpty() ? "Último episodio" : RataLand.episodioTitulo;
	}

	private int yEnlaceEpisodio() {
		return this.yNov + 8 + 14 + altoMini() + 4 + lineas(tituloEpisodio(), 2).size() * 10 + 1;
	}

	private void dibujarNovedades(GuiGraphics g) {
		Estilo.panel(g, this.xNov, this.yNov, this.anchoNovedades, this.altoNov);
		int anchoMini = anchoMini();
		int x = this.xNov + 8;
		int y = this.yNov + 8;
		int fin = this.yNov + this.altoNov - 6;
		g.drawString(this.font, "Novedades", x, y, Estilo.TEXTO);
		y += 14;

		if (!RataLand.episodioUrl.isEmpty()) {
			int altoM = altoMini();
			ResourceLocation mini = Miniatura.textura();
			if (mini != null) {
				g.blit(mini, x, y, anchoMini, altoM, 0, 0, Miniatura.ancho(), Miniatura.alto(), Miniatura.ancho(), Miniatura.alto());
			} else {
				// Sin miniatura: un trozo del paisaje de la temporada
				g.blit(RataLand.fondoActual(), x, y, anchoMini, altoM, 200, 100, 288, 162, RataLand.FONDO_ANCHO, RataLand.FONDO_ALTO);
			}
			int px = x + anchoMini / 2 - 11;
			int py = y + altoM / 2 - 8;
			Estilo.escalon(g, px, py, 22, 16, 0xD80D1424);
			Estilo.icono(g, IconosPixel.PLAY, px + 7, py + 4, 1, Estilo.QUESO);
			y += altoM + 4;
			for (String linea : lineas(tituloEpisodio(), 2)) {
				g.drawString(this.font, linea, x, y, Estilo.TEXTO);
				y += 10;
			}
			y += 1 + 11 + 5;
			g.fill(x, y, x + anchoMini, y + 1, Estilo.LINEA);
			y += 7;
		}

		for (RataLand.Noticia noticia : RataLand.noticias) {
			List<String> titulo = lineas(noticia.titulo(), 2);
			if (y + 10 + titulo.size() * 10 > fin) break;
			if (!noticia.fecha().isEmpty()) {
				g.drawString(this.font, fecha(noticia.fecha()), x, y, Estilo.TENUE);
				y += 10;
			}
			for (String linea : titulo) {
				g.drawString(this.font, linea, x, y, Estilo.TEXTO);
				y += 10;
			}
			// Hasta tres líneas del texto, las que quepan
			int caben = Math.min(3, (fin - y + 1) / 10);
			if (!noticia.texto().isEmpty() && caben > 0) {
				for (String linea : lineas(noticia.texto(), caben)) {
					g.drawString(this.font, linea, x, y, Estilo.CLARO);
					y += 10;
				}
			}
			y += 7;
		}
	}

	private static String fecha(String iso) {
		try {
			return LocalDate.parse(iso).format(FECHA);
		} catch (Exception e) {
			return iso;
		}
	}

	/* ---------- Estado del servidor ---------- */

	private void dibujarServidor(GuiGraphics g, int x, int y, int mouseX, int mouseY) {
		Estilo.panel(g, x, y, ANCHO_TARJETA, ALTO_TARJETA);
		EstadoServidor.Estado estado = EstadoServidor.estado();
		int color;
		String titulo;
		String detalle = "";
		String ayuda = "";
		switch (estado) {
			case ENCENDIDO -> {
				color = Estilo.HIERBA;
				titulo = "Servidor abierto";
				detalle = EstadoServidor.conectados() + " de " + EstadoServidor.maximo();
			}
			case ENCENDIENDO -> {
				color = Estilo.QUESO;
				titulo = "Abriendo el servidor";
				ayuda = "Lo están encendiendo";
			}
			case APAGADO -> {
				color = Estilo.ERROR;
				titulo = "Servidor dormido";
				ayuda = "Enciéndelo desde Aternos";
			}
			case SIN_RESPUESTA -> {
				color = Estilo.ERROR;
				titulo = "No responde";
				ayuda = "¿Apagado o sin internet?";
			}
			default -> {
				color = Estilo.MUY_TENUE;
				titulo = "Mirando el servidor...";
			}
		}
		Estilo.punto(g, x + 7, y + 8, color);
		g.drawString(this.font, titulo, x + 17, y + 7, Estilo.TEXTO);
		if (!detalle.isEmpty()) g.drawString(this.font, detalle, x + ANCHO_TARJETA - 7 - this.font.width(detalle), y + 7, Estilo.TENUE);

		int fila = y + 20;
		if (estado == EstadoServidor.Estado.ENCENDIDO) {
			List<String> nombres = EstadoServidor.nombres();
			if (nombres.isEmpty()) {
				g.drawString(this.font, EstadoServidor.conectados() == 0 ? "Aún no hay nadie dentro" : "Hay gente jugando", x + 7, fila, Estilo.TENUE);
				return;
			}
			int caben = Math.min(nombres.size(), (ANCHO_TARJETA - 14 - 22) / 12);
			int cx = x + 7;
			for (int i = 0; i < caben; i++) {
				Cabezas.dibujar(g, nombres.get(i), cx, fila - 1, 10);
				cx += 12;
			}
			int resto = EstadoServidor.conectados() - caben;
			if (resto > 0) g.drawString(this.font, "+" + resto, cx + 2, fila, Estilo.TENUE);
			if (mouseX >= x + 7 && mouseX < cx && mouseY >= fila - 1 && mouseY < fila + 9) {
				this.setTooltipForNextRenderPass(Component.literal(String.join(", ", nombres)));
			}
		} else if (!ayuda.isEmpty()) {
			g.drawString(this.font, Estilo.recortar(this.font, ayuda, ANCHO_TARJETA - 14), x + 7, fila, Estilo.TENUE);
		}
	}

	/* ---------- Barra de abajo ---------- */

	private void dibujarBarra(GuiGraphics g) {
		g.fill(0, this.arribaHud, this.width, this.height, 0xE6070C18);
		g.fill(0, this.arribaHud, this.width, this.arribaHud + 1, Estilo.LINEA);
		Personaje.cara(g, this.minecraft, MARGEN, this.arribaHud + (ALTO_HUD - 20) / 2, 20);
		String nombre = this.minecraft.getUser().getName();
		String cuenta = switch (RataLand.cuenta) {
			case "microsoft" -> "Cuenta de Microsoft";
			case "sinPremium" -> "Sin premium";
			default -> "";
		};
		int tx = MARGEN + 28;
		int ty = cuenta.isEmpty() ? this.arribaHud + 15 : this.arribaHud + 9;
		g.drawString(this.font, nombre, tx, ty, Estilo.TEXTO);
		if (!cuenta.isEmpty()) g.drawString(this.font, cuenta, tx, ty + 11, Estilo.TENUE);

		String estado = Conexion.buscando() ? "Buscando el servidor..." : "Listo para jugar";
		String version = "Minecraft " + SharedConstants.getCurrentVersion().getName() + " con " + RataLand.cargador;
		int sx = tx + Math.max(this.font.width(nombre), this.font.width(cuenta)) + 24;
		if (sx + Math.max(this.font.width(version), this.font.width(estado)) <= this.xBotones - 12) {
			g.drawString(this.font, estado, sx, this.arribaHud + 9, Estilo.TEXTO);
			g.drawString(this.font, version, sx, this.arribaHud + 20, Estilo.TENUE);
		}
	}

	/* ---------- Dibujo ---------- */

	@Override
	public void renderBackground(GuiGraphics g, int mouseX, int mouseY, float delta) {
		Fondo.dibujar(g, this.width, this.height);
		Fondo.oscurecerIzquierda(g, this.width, this.height);
		if (this.conNovedades) {
			// Un poco de oscuridad también tras las novedades, como en el launcher
			int desde = this.xNov - 40;
			for (int i = 0; i < 8; i++) {
				int x0 = desde + (this.width - desde) * i / 8;
				int x1 = desde + (this.width - desde) * (i + 1) / 8;
				g.fill(x0, 0, x1, this.height, ((int) (0x90 * (i + 1) / 8f) << 24) | 0x080D1A);
			}
		}

		// Columna izquierda: temporada, logo, servidor y cuenta atrás
		int y = arriba();
		if (!RataLand.temporada.isEmpty()) {
			Estilo.etiqueta(g, this.font, MARGEN, y, RataLand.temporada);
			y += 15 + 8;
		}
		float escala = this.escalaLogo;
		int anchoLogo = Mth.floor(RataLand.LOGO_ANCHO * escala);
		int altoLogo = Mth.floor(RataLand.LOGO_ALTO * escala);
		g.pose().pushPose();
		g.pose().translate(MARGEN, y, 0f);
		g.pose().scale(escala, escala, 1f);
		g.blit(RataLand.LOGO, 0, 0, 0f, 0f, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);
		g.pose().popPose();
		dibujarFrase(g, y, anchoLogo, altoLogo);

		int anchoIzquierda = Math.max(ANCHO_TARJETA, anchoLogo);
		int yTarjeta = y + altoLogo + 12;
		if (yTarjeta + ALTO_TARJETA <= this.arribaHud - 8) {
			dibujarServidor(g, MARGEN, yTarjeta, mouseX, mouseY);
			int yCartel = yTarjeta + ALTO_TARJETA + 8;
			if (this.conCuentaAtras && yCartel + Cartel.altoCuentaAtras(this.escalaTiempo) <= this.arribaHud - 8) {
				Cartel.cuentaAtras(g, this.font, MARGEN, yCartel, this.escalaTiempo);
				anchoIzquierda = Math.max(anchoIzquierda, Cartel.anchoCuentaAtras(this.font, this.escalaTiempo));
			}
		}

		if (this.conNovedades) dibujarNovedades(g);

		// Tu personaje, de pie junto a las novedades como en el launcher (así no tapa el centro del paisaje)
		int izquierda = MARGEN + anchoIzquierda + 16;
		int derecha = this.conNovedades ? this.xNov - 14 : this.width - Math.max(MARGEN_DER, this.width / 10);
		int pie = this.arribaHud - 8;
		float escalaPj = Math.min(escalaPersonaje(pie - 30), (derecha - izquierda - 20) / 16f);
		int gui = Math.max(1, (int) this.minecraft.getWindow().getGuiScale());
		escalaPj = (float) Math.floor(escalaPj * gui) / gui;
		int anchoPj = Math.round(16 * escalaPj);
		int altoPj = Math.round(32 * escalaPj);
		if (escalaPj >= 1f && derecha - izquierda >= anchoPj + 20 && pie - altoPj >= 24) {
			String nombre = this.minecraft.getUser().getName();
			int centro = derecha - Math.max(anchoPj, this.font.width(nombre) + 6) / 2;
			int xPj = Math.max(izquierda + 10, centro - anchoPj / 2);
			Personaje.dibujar(g, this.minecraft, this.font, xPj, pie - altoPj, escalaPj, nombre);
		}

		dibujarBarra(g);
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
