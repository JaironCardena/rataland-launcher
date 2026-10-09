package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.PlayerFaceRenderer;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastComponent;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.client.multiplayer.PlayerInfo;

import java.util.UUID;

/** Aviso dentro del juego con el estilo de RataLand: icono (o la cara de un jugador), título y una línea. */
public class AvisoRataLand implements Toast {
	private static final int ANCHO = 180;
	private static final int ALTO = 32;
	private static final long DURACION = 5000;

	private final String titulo;
	private final String texto;
	private final String[] icono;
	private final int colorIcono;
	private final int fondoIcono;
	private final boolean destacado;
	private final UUID jugador;
	private final String nombreCara;

	private AvisoRataLand(String titulo, String texto, String[] icono, int colorIcono, int fondoIcono, boolean destacado, UUID jugador, String nombreCara) {
		this.titulo = titulo;
		this.texto = texto;
		this.icono = icono;
		this.colorIcono = colorIcono;
		this.fondoIcono = fondoIcono;
		this.destacado = destacado;
		this.jugador = jugador;
		this.nombreCara = nombreCara;
	}

	/** Aviso importante, con marco de queso (la cuenta atrás del episodio). */
	public static AvisoRataLand queso(String titulo, String texto) {
		return new AvisoRataLand(titulo, texto, IconosPixel.QUESO, Estilo.QUESO, 0xFF3A2C10, true, null, null);
	}

	/** Algo que salió bien (por ejemplo, la skin). */
	public static AvisoRataLand listo(String titulo, String texto) {
		return new AvisoRataLand(titulo, texto, IconosPixel.HECHO, Estilo.HIERBA_LUZ, 0xFF1F3320, false, null, null);
	}

	/** Alguien entra al servidor: con su cara (la de su skin en el servidor, o la de mc-heads si no está en la lista). */
	public static AvisoRataLand jugador(String titulo, String texto, UUID jugador, String nombre) {
		return new AvisoRataLand(titulo, texto, null, 0, 0, false, jugador, nombre);
	}

	@Override
	public int width() {
		return ANCHO;
	}

	@Override
	public int height() {
		return ALTO;
	}

	@Override
	public Visibility render(GuiGraphics g, ToastComponent avisos, long tiempo) {
		Font fuente = Minecraft.getInstance().font;
		if (destacado) {
			Estilo.escalon(g, 0, 0, ANCHO, ALTO, 0xF00D1424);
			Estilo.bordeEscalon(g, 0, 0, ANCHO, ALTO, Estilo.QUESO);
		} else {
			Estilo.escalon(g, 0, 0, ANCHO, ALTO, 0xF00D1424);
			Estilo.bordeEscalon(g, 0, 0, ANCHO, ALTO, 0x30D6E2FF);
		}
		if (nombreCara != null) {
			// Se busca en cada dibujo: al entrar alguien su skin aún se está descargando, y al ponérsela
			// el servidor lo vuelve a añadir a la lista con otra ficha
			ClientPacketListener red = Minecraft.getInstance().getConnection();
			PlayerInfo info = red != null && jugador != null ? red.getPlayerInfo(jugador) : null;
			if (info != null) PlayerFaceRenderer.draw(g, info.getSkin(), 6, 6, 20);
			else Cabezas.dibujar(g, nombreCara, 6, 6, 20);
		} else {
			Estilo.escalon(g, 5, 5, 22, 22, fondoIcono);
			Estilo.icono(g, icono, 8, 8, 2, colorIcono);
		}
		g.drawString(fuente, Estilo.recortar(fuente, titulo, ANCHO - 40), 33, 7, destacado ? Estilo.QUESO : Estilo.TEXTO, false);
		g.drawString(fuente, Estilo.recortar(fuente, texto, ANCHO - 40), 33, 18, Estilo.TENUE, false);
		return tiempo >= DURACION ? Visibility.HIDE : Visibility.SHOW;
	}
}
