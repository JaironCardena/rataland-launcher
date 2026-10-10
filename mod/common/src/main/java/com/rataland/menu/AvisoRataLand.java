package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.PlayerFaceRenderer;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastComponent;
import net.minecraft.advancements.AdvancementType;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ItemStack;

import java.util.UUID;

/** Aviso dentro del juego con el estilo de RataLand: icono (o la cara de un jugador), título y una línea. */
public class AvisoRataLand implements Toast {
	public static final int ANCHO = 180;
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
		fondo(g, destacado ? Estilo.QUESO : 0x30D6E2FF);
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

	private static void fondo(GuiGraphics g, int borde) {
		fondo(g, ANCHO, ALTO, borde);
	}

	/** El fondo de los avisos de RataLand, de cualquier tamaño (también para los de Minecraft). */
	public static void fondo(GuiGraphics g, int ancho, int alto, int borde) {
		Estilo.escalon(g, 0, 0, ancho, alto, 0xF00D1424);
		Estilo.bordeEscalon(g, 0, 0, ancho, alto, borde);
	}

	/** El hueco oscuro del icono, a la izquierda del aviso. */
	public static void cajaIcono(GuiGraphics g) {
		Estilo.escalon(g, 5, 5, 22, 22, 0xFF1B2236);
	}

	/**
	 * Un logro de Minecraft con el aspecto de los avisos de RataLand: el objeto del logro, el tipo
	 * («¡Progreso realizado!», «¡Objetivo alcanzado!», «¡Desafío completado!») y su nombre. Los
	 * desafíos van en morado, como en Minecraft; los objetivos, con el marco de queso.
	 */
	public static void dibujarLogro(GuiGraphics g, AdvancementType tipo, Component titulo, ItemStack icono) {
		Font fuente = Minecraft.getInstance().font;
		int color = tipo == AdvancementType.CHALLENGE ? 0xFFD58BFF : Estilo.QUESO;
		fondo(g, tipo == AdvancementType.TASK ? 0x30D6E2FF : color);
		Estilo.escalon(g, 5, 5, 22, 22, 0xFF1B2236);
		g.renderFakeItem(icono, 8, 8);
		g.drawString(fuente, Estilo.recortar(fuente, tipo.getDisplayName().getString(), ANCHO - 40), 33, 7, color, false);
		g.drawString(fuente, Estilo.recortar(fuente, titulo.getString(), ANCHO - 40), 33, 18, Estilo.TEXTO, false);
	}
}
