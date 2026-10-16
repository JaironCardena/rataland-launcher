package com.rataland.menu;

import net.minecraft.advancements.AdvancementType;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.PlayerFaceExtractor;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastManager;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.world.item.ItemStack;
import org.jetbrains.annotations.Nullable;

import java.util.List;
import java.util.UUID;

/**
 * Los avisos dentro del juego con el estilo de RataLand: una tarjeta compacta (24 de alto, tan ancha
 * como su texto) con un icono, la cara de un jugador o el objeto de un logro, y dos líneas. Salen
 * arriba en el centro, una debajo de otra (ToastInstanceMixin). Los avisos de Minecraft (recetas,
 * sistema, consejos) se dibujan con la misma tarjeta.
 */
public class AvisoRataLand implements Toast {
	public static final int ALTO = 24;
	/** Distancia entre avisos apilados (el alto y un hueco). */
	public static final int PASO = 27;
	public static final int ANCHO_MIN = 100;
	public static final int ANCHO_MAX = 240;
	/** Donde empieza el texto, a la derecha del icono. */
	public static final int TEXTO_X = 26;
	public static final int BORDE = 0x29D6E2FF;
	private static final long DURACION = 5000;

	/** Un trozo de texto con su color. */
	public record Tramo(String texto, int color) {}

	private final List<Tramo> linea1;
	private final List<Tramo> linea2;
	@Nullable private final String[] icono;
	private final int colorIcono;
	@Nullable private final ItemStack objeto;
	@Nullable private final UUID jugador;
	@Nullable private final String nombreCara;
	private final int borde;
	/** Color de la rayita de abajo que se acorta mientras se ve (0 = sin ella). */
	private final int barra;
	private Visibility visibilidad = Visibility.SHOW;
	private long visto;

	private AvisoRataLand(List<Tramo> linea1, List<Tramo> linea2, @Nullable String[] icono, int colorIcono, @Nullable ItemStack objeto, @Nullable UUID jugador,
			@Nullable String nombreCara, int borde, int barra) {
		this.linea1 = linea1;
		this.linea2 = linea2;
		this.icono = icono;
		this.colorIcono = colorIcono;
		this.objeto = objeto;
		this.jugador = jugador;
		this.nombreCara = nombreCara;
		this.borde = borde;
		this.barra = barra;
	}

	/** Aviso importante, con el borde de queso (la cuenta atrás del episodio). */
	public static AvisoRataLand queso(String titulo, String texto) {
		return new AvisoRataLand(List.of(new Tramo(titulo, Estilo.QUESO)), List.of(new Tramo(texto, Estilo.TENUE)), IconosPixel.QUESO, Estilo.QUESO, null, null, null,
				Estilo.QUESO, 0);
	}

	/** Algo que salió bien (por ejemplo, la skin). */
	public static AvisoRataLand listo(String titulo, String texto) {
		return new AvisoRataLand(List.of(new Tramo(titulo, Estilo.TEXTO)), List.of(new Tramo(texto, Estilo.TENUE)), IconosPixel.HECHO, Estilo.HIERBA_LUZ, null, null,
				null, BORDE, 0);
	}

	/** Alguien entra al servidor: con su cara (la de su skin en el servidor, o la de mc-heads si no está en la lista). */
	public static AvisoRataLand jugador(String titulo, String texto, @Nullable UUID jugador, String nombre) {
		return new AvisoRataLand(List.of(new Tramo(titulo, Estilo.TEXTO)), List.of(new Tramo(texto, Estilo.TENUE)), null, 0, null, jugador, nombre, BORDE, 0);
	}

	/**
	 * Un logro (tuyo o de otro): el tipo en su color, quién lo ha conseguido y su nombre, con el objeto
	 * del logro (o un trofeo) y el borde y la rayita del tiempo en el color del tipo.
	 */
	public static AvisoRataLand logro(AdvancementType tipo, String quien, boolean yo, String titulo, @Nullable ItemStack objeto) {
		int color = colorLogro(tipo);
		String nombreTipo = tipo == AdvancementType.CHALLENGE ? "Desafío" : tipo == AdvancementType.GOAL ? "Objetivo" : "Progreso";
		List<Tramo> arriba = yo
				? List.of(new Tramo(nombreTipo, color), new Tramo(" · ", Estilo.MUY_TENUE), new Tramo(quien, Estilo.TEXTO), new Tramo(" tú", Estilo.QUESO))
				: List.of(new Tramo(nombreTipo, color), new Tramo(" · ", Estilo.MUY_TENUE), new Tramo(quien, Estilo.TEXTO));
		boolean conObjeto = objeto != null && !objeto.isEmpty();
		return new AvisoRataLand(arriba, List.of(new Tramo(titulo, 0xFFFFFFFF)), conObjeto ? null : IconosPixel.TROFEO, color, conObjeto ? objeto : null, null, null,
				color, color);
	}

	/** El color de cada tipo de logro: progreso en verde, objetivo en queso y desafío en morado. */
	public static int colorLogro(AdvancementType tipo) {
		return tipo == AdvancementType.CHALLENGE ? 0xFFD58BFF : tipo == AdvancementType.GOAL ? Estilo.QUESO : 0xFF86CF55;
	}

	/** Ancho de una tarjeta con estas líneas: el icono, el texto más largo y un margen. */
	public static int anchoPara(Font fuente, int anchoTexto) {
		return Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, TEXTO_X + anchoTexto + 8));
	}

	private static int ancho(Font fuente, List<Tramo> linea) {
		int w = 0;
		for (Tramo t : linea) w += fuente.width(t.texto());
		return w;
	}

	@Override
	public int width() {
		Font fuente = Minecraft.getInstance().font;
		return anchoPara(fuente, Math.max(ancho(fuente, this.linea1), ancho(fuente, this.linea2)));
	}

	@Override
	public int height() {
		return ALTO;
	}

	@Override
	public Visibility getWantedVisibility() {
		return this.visibilidad;
	}

	@Override
	public void update(ToastManager avisos, long tiempo) {
		this.visto = tiempo;
		this.visibilidad = tiempo >= DURACION * avisos.getNotificationDisplayTimeMultiplier() ? Visibility.HIDE : Visibility.SHOW;
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor g, Font fuente, long tiempo) {
		int w = width();
		fondo(g, w, ALTO, this.borde);
		if (this.objeto != null) {
			g.fakeItem(this.objeto, 5, 4);
		} else if (this.nombreCara != null) {
			// Se busca en cada dibujo: al entrar alguien su skin aún se está descargando
			ClientPacketListener red = Minecraft.getInstance().getConnection();
			PlayerInfo info = red != null && this.jugador != null ? red.getPlayerInfo(this.jugador) : null;
			if (info != null) PlayerFaceExtractor.extractRenderState(g, info.getSkin(), 5, 4, 16);
			else Cabezas.dibujar(g, this.nombreCara, 5, 4, 16);
		} else if (this.icono != null) {
			Estilo.icono(g, this.icono, 5, 4, 2, this.colorIcono);
		}
		int libre = w - TEXTO_X - 6;
		tramos(g, fuente, this.linea1, TEXTO_X, 3, libre);
		tramos(g, fuente, this.linea2, TEXTO_X, 13, libre);
		if (this.barra != 0) {
			double total = DURACION * Minecraft.getInstance().gui.toastManager().getNotificationDisplayTimeMultiplier();
			float queda = (float) Math.max(0, 1 - tiempo / total);
			g.fill(2, ALTO - 2, 2 + Math.round((w - 4) * queda), ALTO - 1, this.barra);
		}
	}

	/** Dibuja los trozos uno detrás de otro; si no caben, el último se corta con «…». */
	private static void tramos(GuiGraphicsExtractor g, Font fuente, List<Tramo> linea, int x, int y, int libre) {
		int cx = x;
		for (Tramo t : linea) {
			int queda = x + libre - cx;
			if (queda <= 0) return;
			String texto = Estilo.recortar(fuente, t.texto(), queda);
			g.text(fuente, texto, cx, y, t.color(), false);
			cx += fuente.width(texto);
		}
	}

	/** El fondo de las tarjetas (también para los avisos de Minecraft): oscuro, con un filo del color dado. */
	public static void fondo(GuiGraphicsExtractor g, int ancho, int alto, int borde) {
		Estilo.escalon(g, 0, 0, ancho, alto, 0xEB0D1424);
		Estilo.bordeEscalon(g, 0, 0, ancho, alto, borde);
	}

	/** Alto de una tarjeta de Minecraft con `lineas` líneas de texto (dos caben en una de 24). */
	public static int altoPara(int lineas) {
		return lineas <= 2 ? ALTO : 6 + lineas * 10;
	}
}
