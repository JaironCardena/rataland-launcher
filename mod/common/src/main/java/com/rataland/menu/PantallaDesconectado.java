package com.rataland.menu;

import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.minecraft.util.FormattedCharSequence;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Cuando no se puede entrar o te echan del servidor: en vez del mensaje de Minecraft (en inglés y sin
 * explicar qué hacer), qué ha pasado y qué hacer, con «Reintentar» y «Volver al menú». El mensaje
 * original sigue a mano en «Ver el mensaje de Minecraft».
 */
public class PantallaDesconectado extends Screen {
	enum Motivo { APAGADO, SIN_INTERNET, EXPULSADO, BANEADO, LLENO, VERSION, OTRO }

	private static final int ANCHO = 330;
	/** Nombres de servidores de Aternos y direcciones IP: lo que no se enseña en el mensaje de Minecraft. */
	private static final Pattern DIRECCION = Pattern.compile("(?i)[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.aternos\\.me|(?:\\d{1,3}\\.){3}\\d{1,3}");

	private final Component razon;
	private final Component detalle;
	private final Motivo motivo;
	/** ¿Se llega aquí tras esperar en la sala de espera sin que el servidor llegue a abrir? */
	private final boolean trasEsperar;
	private boolean detalles;
	private int fotogramas;

	// Maquetación (init)
	private int x;
	private int y;
	private int w;
	private int h;
	private List<FormattedCharSequence> lineasTexto = List.of();
	private List<FormattedCharSequence> lineasDetalle = List.of();
	private int yDetalle;

	public PantallaDesconectado(Component razon) {
		this(razon, false);
	}

	public PantallaDesconectado(Component razon, boolean trasEsperar) {
		super(Component.literal("No se pudo entrar a " + RataLand.nombre));
		this.razon = razon == null ? Component.empty() : razon;
		this.motivo = clasificar(this.razon);
		this.detalle = sinDatosPrivados(this.razon);
		this.trasEsperar = trasEsperar;
	}

	/** ¿Esperó en la sala y el servidor no llegó a abrir? (se diga lo que se diga al final) */
	private boolean noDesperto() {
		return this.trasEsperar && (this.motivo == Motivo.APAGADO || this.motivo == Motivo.LLENO);
	}

	/**
	 * El mensaje de Minecraft sin lo que es privado: la dirección del servidor queda como «el servidor»
	 * y se quitan las líneas que nombran el hosting.
	 */
	private static Component sinDatosPrivados(Component razon) {
		String texto = razon.getString();
		if (!RataLand.ip.isBlank()) texto = texto.replaceAll("(?i)" + Pattern.quote(RataLand.ip), "el servidor");
		texto = DIRECCION.matcher(texto).replaceAll("el servidor");
		texto = texto.replaceAll("el servidor(?:/el servidor)?(?::\\d+)?", "el servidor");
		List<String> lineas = new ArrayList<>();
		for (String linea : texto.split("\\R")) {
			String l = linea.toLowerCase(Locale.ROOT);
			if (!l.contains("aternos") && !l.contains("exaroton")) lineas.add(linea);
		}
		String limpio = String.join("\n", lineas).strip();
		return Component.literal(limpio.isEmpty() ? "Sin más detalles." : limpio);
	}

	static Motivo clasificar(Component razon) {
		String clave = razon.getContents() instanceof TranslatableContents t ? t.getKey() : "";
		String texto = razon.getString().toLowerCase(Locale.ROOT);
		if (clave.equals("multiplayer.disconnect.server_full") || texto.contains("server is full")) return Motivo.LLENO;
		if (clave.startsWith("multiplayer.disconnect.banned") || texto.contains("banned")) return Motivo.BANEADO;
		if (clave.equals("multiplayer.disconnect.kicked") || texto.contains("kicked")) return Motivo.EXPULSADO;
		if (clave.contains("outdated") || clave.contains("incompatible") || texto.contains("outdated") || texto.contains("incompatible")) return Motivo.VERSION;
		if (texto.contains("offline") || texto.contains("refused") || texto.contains("not online")) return Motivo.APAGADO;
		if (clave.equals("disconnect.timeout") || clave.equals("disconnect.unknownHost") || texto.contains("timed out") || texto.contains("unknown host")
				|| texto.contains("unresolved")) {
			return Motivo.SIN_INTERNET;
		}
		return Motivo.OTRO;
	}

	private String titulo() {
		if (noDesperto()) return "El servidor no ha despertado";
		return switch (motivo) {
			case APAGADO -> "El servidor está dormido";
			case SIN_INTERNET -> "No llegamos al servidor";
			case EXPULSADO -> "Te han sacado del servidor";
			case BANEADO -> "No puedes entrar";
			case LLENO -> "El servidor está lleno";
			case VERSION -> "Versiones distintas";
			case OTRO -> "Se ha cortado la conexión";
		};
	}

	private String explicacion() {
		if (noDesperto()) {
			return "Llevamos " + SalaEspera.MAXIMO / 60_000 + " minutos esperando y sigue sin abrir: a veces el hosting no tiene sitio para encenderlo. Vuelve a intentarlo en un rato.";
		}
		return switch (motivo) {
			case APAGADO -> RataLand.nombre + " se duerme cuando no hay nadie jugando. Al intentar entrar se despierta solo, pero tarda un par de minutos en abrir: vuelve a intentarlo en un momento.";
			case SIN_INTERNET -> "Parece que se ha cortado tu conexión a internet. Revísala y vuelve a intentarlo.";
			case EXPULSADO -> "Un moderador te ha expulsado. Si crees que es un error, pregunta en el Discord de la serie.";
			case BANEADO -> "Tienes la entrada bloqueada en este servidor. Si crees que es un error, pregunta en el Discord de la serie.";
			case LLENO -> "Ahora mismo no cabe nadie más. Vuelve a intentarlo en un rato.";
			case VERSION -> "Tu juego y el servidor no tienen la misma versión. Cierra el juego y vuelve a abrirlo desde el launcher para que se actualice.";
			case OTRO -> "El servidor cerró la conexión. Vuelve a intentarlo en un momento.";
		};
	}

	private String[] icono() {
		if (noDesperto()) return IconosPixel.LUNA;
		return switch (motivo) {
			case APAGADO -> IconosPixel.LUNA;
			case SIN_INTERNET, OTRO -> IconosPixel.SENAL;
			case EXPULSADO, BANEADO -> IconosPixel.SALIR;
			case LLENO -> IconosPixel.PERSONAS;
			case VERSION -> IconosPixel.AJUSTES;
		};
	}

	private int colorIcono() {
		return motivo == Motivo.APAGADO || motivo == Motivo.LLENO || motivo == Motivo.VERSION ? Estilo.QUESO : Estilo.ERROR;
	}

	@Override
	protected void init() {
		Conexion.entrando = false;
		this.w = Math.min(ANCHO, this.width - 40);
		this.lineasTexto = this.font.split(Component.literal(explicacion()), this.w - 28);
		this.lineasDetalle = this.font.split(this.detalle, this.w - 28);
		if (this.lineasDetalle.size() > 4) this.lineasDetalle = this.lineasDetalle.subList(0, 4);
		int alto = 14 + 24 + 8 + 12 + 6 + this.lineasTexto.size() * 10 + 10 + 26 + 10 + 11 + 12;
		if (this.detalles) alto += 4 + this.lineasDetalle.size() * 10;
		this.h = alto;
		this.x = (this.width - this.w) / 2;
		this.y = Math.max(10, (this.height - this.h) / 2);

		int yb = this.y + 14 + 24 + 8 + 12 + 6 + this.lineasTexto.size() * 10 + 10;
		this.addRenderableWidget(new BotonRataLand(this.x + 14, yb, 124, 26, Component.literal("Reintentar"), b -> Conexion.entrar(this),
				BotonRataLand.Estilo.HIERBA, 1.5f));
		this.addRenderableWidget(new BotonRataLand(this.x + 14 + 124 + 8, yb, Math.min(120, this.w - 28 - 132), 26, Component.literal("Volver al menú"),
				b -> this.minecraft.setScreen(new MenuRataLand()), BotonRataLand.Estilo.PIEDRA));
		this.yDetalle = yb + 26 + 10;
		this.addRenderableWidget(new EnlaceRataLand(this.x + 13, this.yDetalle, Component.literal(this.detalles ? "Ocultar el mensaje de Minecraft" : "Ver el mensaje de Minecraft"), b -> {
			this.detalles = !this.detalles;
			this.rebuildWidgets();
		}));
	}

	@Override
	public void renderBackground(GuiGraphics g, int mouseX, int mouseY, float delta) {
		Fondo.dibujar(g, this.width, this.height);
		g.fill(0, 0, this.width, this.height, 0x9E080D1A);
		Estilo.escalon(g, this.x, this.y, this.w, this.h, 0xED0D1424);
		Estilo.bordeEscalon(g, this.x, this.y, this.w, this.h, Estilo.LINEA);
		Estilo.escalon(g, this.x + 14, this.y + 14, 24, 24, 0xFF1B2236);
		Estilo.icono(g, icono(), this.x + 18, this.y + 18, 2, colorIcono());
		g.pose().pushPose();
		g.pose().translate(this.x + 14, this.y + 14 + 24 + 8, 0f);
		g.pose().scale(1.5f, 1.5f, 1f);
		g.drawString(this.font, titulo(), 0, 0, Estilo.TEXTO);
		g.pose().popPose();
		int ty = this.y + 14 + 24 + 8 + 12 + 6;
		for (FormattedCharSequence linea : this.lineasTexto) {
			g.drawString(this.font, linea, this.x + 14, ty, Estilo.CLARO);
			ty += 10;
		}
		if (this.detalles) {
			int dy = this.yDetalle + 11 + 4;
			for (FormattedCharSequence linea : this.lineasDetalle) {
				g.drawString(this.font, linea, this.x + 14, dy, Estilo.MUY_TENUE);
				dy += 10;
			}
		}
	}

	@Override
	public void render(GuiGraphics g, int mouseX, int mouseY, float delta) {
		super.render(g, mouseX, mouseY, delta);
		if (RataLand.MODO_CAPTURA && ++this.fotogramas == 80) {
			Screenshot.grab(this.minecraft.gameDirectory, "rataland-desconectado.png", this.minecraft.getMainRenderTarget(), t -> {});
			RataLand.LOG.info("Prueba: sin poder entrar se muestra «{}» ({})", titulo(), this.razon.getString());
			this.minecraft.stop();
		}
	}

	@Override
	public void onClose() {
		this.minecraft.setScreen(new MenuRataLand());
	}
}
