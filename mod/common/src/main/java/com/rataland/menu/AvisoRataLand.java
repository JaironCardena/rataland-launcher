package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.PlayerFaceRenderer;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastComponent;
import net.minecraft.client.resources.PlayerSkin;

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
	private final PlayerSkin cara;
	private final String nombreCara;

	private AvisoRataLand(String titulo, String texto, String[] icono, int colorIcono, int fondoIcono, boolean destacado, PlayerSkin cara, String nombreCara) {
		this.titulo = titulo;
		this.texto = texto;
		this.icono = icono;
		this.colorIcono = colorIcono;
		this.fondoIcono = fondoIcono;
		this.destacado = destacado;
		this.cara = cara;
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

	/** Alguien entra al servidor: con su cara (o la de mc-heads, si aún no se conoce su skin). */
	public static AvisoRataLand jugador(String titulo, String texto, PlayerSkin cara, String nombre) {
		return new AvisoRataLand(titulo, texto, null, 0, 0, false, cara, nombre);
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
		if (cara != null) {
			PlayerFaceRenderer.draw(g, cara, 6, 6, 20);
		} else if (nombreCara != null) {
			Cabezas.dibujar(g, nombreCara, 6, 6, 20);
		} else {
			Estilo.escalon(g, 5, 5, 22, 22, fondoIcono);
			Estilo.icono(g, icono, 8, 8, 2, colorIcono);
		}
		g.drawString(fuente, Estilo.recortar(fuente, titulo, ANCHO - 40), 33, 7, destacado ? Estilo.QUESO : Estilo.TEXTO, false);
		g.drawString(fuente, Estilo.recortar(fuente, texto, ANCHO - 40), 33, 18, Estilo.TENUE, false);
		return tiempo >= DURACION ? Visibility.HIDE : Visibility.SHOW;
	}
}
