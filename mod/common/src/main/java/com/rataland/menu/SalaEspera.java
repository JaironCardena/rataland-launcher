package com.rataland.menu;

import net.minecraft.Util;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;

import java.util.List;

/**
 * La sala de espera de RataLand. Con el servidor dormido, el hosting a veces no deja pasar mientras lo
 * despierta (dice que está «lleno» o rechaza la conexión): en vez de un error, se espera aquí y se
 * vuelve a intentar solo cada pocos segundos hasta entrar, como en la sala del propio hosting.
 */
public final class SalaEspera {
	private SalaEspera() {}

	/** Cada cuánto se vuelve a intentar entrar. */
	public static final long CADA = 10_000;
	/** Cuánto se espera como mucho antes de explicar que no abre. */
	public static final long MAXIMO = 10 * 60_000;

	private static final int ANCHO = 300;
	private static final String TEXTO = "El servidor estaba dormido y se está despertando. Entrarás solo en cuanto abra; suele tardar un par de minutos.";

	/** Desde cuándo se espera (0 = no se está esperando). */
	private static long desde;

	public static boolean activa() {
		return desde != 0;
	}

	public static void empezar() {
		if (desde == 0) desde = Util.getMillis();
	}

	public static void terminar() {
		desde = 0;
	}

	/** Cuánto se lleva esperando (ms). */
	public static long esperado() {
		return desde == 0 ? 0 : Util.getMillis() - desde;
	}

	/**
	 * ¿Este fallo al entrar se espera en la sala? Al principio, solo si el hosting dice «lleno» sin que
	 * el servidor esté encendido, o si rechaza la conexión al entrar; ya esperando, cualquier fallo que
	 * no sea una expulsión, un baneo o una versión distinta.
	 */
	public static boolean seEspera(Component razon) {
		PantallaDesconectado.Motivo motivo = PantallaDesconectado.clasificar(razon);
		if (activa()) {
			return motivo != PantallaDesconectado.Motivo.EXPULSADO && motivo != PantallaDesconectado.Motivo.BANEADO
					&& motivo != PantallaDesconectado.Motivo.VERSION;
		}
		boolean encendido = EstadoServidor.estado() == EstadoServidor.Estado.ENCENDIDO;
		return motivo == PantallaDesconectado.Motivo.LLENO && !encendido || motivo == PantallaDesconectado.Motivo.APAGADO && Conexion.entrando;
	}

	private static List<FormattedCharSequence> lineas(Font fuente, int w) {
		return fuente.split(Component.literal(TEXTO), w - 28);
	}

	/** Rectángulo de la tarjeta {x, y, ancho, alto}. */
	public static int[] caja(Font fuente, int ancho, int alto) {
		int w = Math.min(ANCHO, ancho - 40);
		int h = 106 + lineas(fuente, w).size() * 10;
		return new int[] {(ancho - w) / 2, Math.max(10, alto / 2 - h / 2 - 22), w, h};
	}

	/** Dónde va el botón «Volver al menú» {x, y, ancho, alto}. */
	public static int[] boton(Font fuente, int ancho, int alto) {
		int[] c = caja(fuente, ancho, alto);
		return new int[] {c[0] + (c[2] - 110) / 2, c[1] + c[3] - 30, 110, 20};
	}

	/**
	 * La tarjeta «Despertando RataLand», con el mismo aspecto que «Entrando en RataLand». `siguiente`:
	 * segundos que faltan para el próximo intento, o -1 si ya se está intentando entrar.
	 */
	public static void dibujar(GuiGraphics g, Font fuente, int ancho, int alto, int siguiente) {
		g.fill(0, 0, ancho, alto, 0x66080D1A);
		int[] c = caja(fuente, ancho, alto);
		int x = c[0];
		int y = c[1];
		int w = c[2];
		Estilo.escalon(g, x, y, w, c[3], 0xEB0D1424);
		Estilo.bordeEscalon(g, x, y, w, c[3], Estilo.LINEA);

		g.pose().pushPose();
		g.pose().translate(x + 14, y + 12, 0f);
		g.pose().scale(1.5f, 1.5f, 1f);
		g.drawString(fuente, "Despertando " + RataLand.nombre, 0, 0, Estilo.TEXTO);
		g.pose().popPose();

		int ty = y + 34;
		for (FormattedCharSequence linea : lineas(fuente, w)) {
			g.drawString(fuente, linea, x + 14, ty, Estilo.CLARO);
			ty += 10;
		}

		// Qué pasa ahora y cuánto llevas esperando
		int fy = ty + 6;
		if (siguiente < 0) {
			g.fill(x + 14, fy + 1, x + 20, fy + 7, Estilo.QUESO);
			g.drawString(fuente, "Intentando entrar" + TarjetaEntrando.puntos(), x + 28, fy, Estilo.QUESO);
		} else {
			Estilo.icono(g, IconosPixel.RELOJ, x + 13, fy, 1, Estilo.TENUE);
			g.drawString(fuente, "Nuevo intento en " + siguiente + " s", x + 28, fy, Estilo.TENUE);
		}
		long s = esperado() / 1000;
		String tiempo = "Esperando " + s / 60 + ":" + (s % 60 < 10 ? "0" : "") + s % 60;
		g.drawString(fuente, tiempo, x + w - 14 - fuente.width(tiempo), fy, Estilo.MUY_TENUE);

		// No se sabe cuánto falta: la barra avanza deprisa al principio y cada vez más despacio
		float avance = 0.06f + 0.86f * (1f - (float) Math.exp(-esperado() / 80_000.0));
		TarjetaEntrando.barra(g, x + 14, fy + 20, w - 28, avance);
		TarjetaEntrando.dibujarConsejo(g, fuente, ancho, alto, y + c[3] + 14);
	}
}
