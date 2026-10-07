package com.rataland.menu;

import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;

/**
 * El estilo del launcher llevado al juego: colores, paneles con esquinas en escalón, el marco de
 * queso, iconos pixel y botones de piedra. Lo usan las pantallas de RataLand y también los botones
 * y deslizadores de las pantallas de Minecraft (Opciones, Gráficos, Controles…).
 */
public final class Estilo {
	private Estilo() {}

	public static final int NOCHE = 0xFF0D1424;
	public static final int PANEL = 0xE60D1424;
	public static final int PANEL_FUERTE = 0xF2090E1A;
	public static final int LINEA = 0x24D6E2FF;
	public static final int TEXTO = 0xFFEEF1F6;
	public static final int CLARO = 0xFFCDD5E4;
	public static final int TENUE = 0xFFA3B0C8;
	public static final int MUY_TENUE = 0xFF7684A0;
	public static final int QUESO = 0xFFF6C445;
	public static final int QUESO_LUZ = 0xFFFFF0A8;
	public static final int QUESO_SOMBRA = 0xFFD98A22;
	public static final int HIERBA = 0xFF5EA83A;
	public static final int HIERBA_LUZ = 0xFF86CF55;
	public static final int ERROR = 0xFFFF8A7A;
	public static final int PIEDRA = 0xFF3A4152;
	public static final int PIEDRA_ENCIMA = 0xFF46506A;
	public static final int PIEDRA_APAGADA = 0xFF262C3A;
	public static final int BORDE_BOTON = 0xFF10141D;
	public static final int DISCORD = 0xFF4F5BD5;
	public static final int PELIGRO = 0xFF2B2230;

	/** Rectángulo con las esquinas recortadas un píxel (como .px en el launcher). */
	public static void escalon(GuiGraphics g, int x, int y, int w, int h, int color) {
		if (w < 3 || h < 3) {
			g.fill(x, y, x + w, y + h, color);
			return;
		}
		g.fill(x + 1, y, x + w - 1, y + h, color);
		g.fill(x, y + 1, x + 1, y + h - 1, color);
		g.fill(x + w - 1, y + 1, x + w, y + h - 1, color);
	}

	/** Borde de un píxel que sigue las esquinas en escalón. */
	public static void bordeEscalon(GuiGraphics g, int x, int y, int w, int h, int color) {
		g.fill(x + 1, y, x + w - 1, y + 1, color);
		g.fill(x + 1, y + h - 1, x + w - 1, y + h, color);
		g.fill(x, y + 1, x + 1, y + h - 1, color);
		g.fill(x + w - 1, y + 1, x + w, y + h - 1, color);
	}

	/** Panel oscuro del launcher: fondo casi opaco y un filo claro muy suave. */
	public static void panel(GuiGraphics g, int x, int y, int w, int h) {
		escalon(g, x, y, w, h, PANEL);
		bordeEscalon(g, x, y, w, h, LINEA);
	}

	/** Panel con marco de queso (la cuenta atrás, los avisos importantes). */
	public static void marcoQueso(GuiGraphics g, int x, int y, int w, int h) {
		escalon(g, x, y, w, h, PANEL);
		bordeEscalon(g, x, y, w, h, QUESO);
		g.renderOutline(x + 2, y + 2, w - 4, h - 4, 0x40F6C445);
	}

	/** Etiqueta con borde de queso, como la de la temporada. Devuelve su ancho. */
	public static int etiqueta(GuiGraphics g, Font fuente, int x, int y, String texto) {
		int w = fuente.width(texto) + 12;
		g.fill(x, y, x + w, y + 15, 0x990D1424);
		g.renderOutline(x, y, w, 15, QUESO);
		g.drawString(fuente, texto, x + 6, y + 4, QUESO);
		return w;
	}

	/** Icono pixel de 8×8 (filas de '#' y '.'), cada píxel del icono de `p`×`p`. */
	public static void icono(GuiGraphics g, String[] filas, int x, int y, int p, int color) {
		for (int fy = 0; fy < filas.length; fy++) {
			String fila = filas[fy];
			int fx = 0;
			while (fx < fila.length()) {
				if (fila.charAt(fx) != '#') {
					fx++;
					continue;
				}
				int n = 1;
				while (fx + n < fila.length() && fila.charAt(fx + n) == '#') n++;
				g.fill(x + fx * p, y + fy * p, x + (fx + n) * p, y + (fy + 1) * p, color);
				fx += n;
			}
		}
	}

	/** Cuadradito de estado (verde, queso o rojo) con su halo. */
	public static void punto(GuiGraphics g, int x, int y, int color) {
		g.fill(x - 1, y - 1, x + 6, y + 6, (color & 0x00FFFFFF) | 0x40000000);
		g.fill(x, y, x + 5, y + 5, color);
	}

	/**
	 * Botón de piedra del launcher (relieve arriba y abajo, borde oscuro). Con el foco del teclado
	 * se marca con el borde de queso, como en el launcher.
	 */
	public static void botonPiedra(GuiGraphics g, int x, int y, int w, int h, int fondo, boolean encima, boolean foco, boolean activo) {
		int base = !activo ? PIEDRA_APAGADA : encima && fondo == PIEDRA ? PIEDRA_ENCIMA : fondo;
		g.fill(x, y, x + w, y + h, foco && activo ? QUESO : BORDE_BOTON);
		g.fill(x + 1, y + 1, x + w - 1, y + h - 1, base);
		if (activo) {
			g.fill(x + 1, y + 1, x + w - 1, y + 2, 0x30FFFFFF);
			g.fill(x + 1, y + h - 3, x + w - 1, y + h - 1, 0x4C000000);
			if (encima && fondo != PIEDRA) g.fill(x + 1, y + 1, x + w - 1, y + h - 1, 0x22FFFFFF);
		} else {
			g.fill(x + 1, y + h - 2, x + w - 1, y + h - 1, 0x40000000);
		}
	}

	/** Recorta el texto con «…» para que quepa en `ancho`. */
	public static String recortar(Font fuente, String texto, int ancho) {
		if (fuente.width(texto) <= ancho) return texto;
		String puntos = "…";
		int fin = texto.length();
		while (fin > 0 && fuente.width(texto.substring(0, fin) + puntos) > ancho) fin--;
		return texto.substring(0, fin).stripTrailing() + puntos;
	}

	/* ---------- Dígitos pixel (3×5) para la pantalla de carga, que aún no tiene fuentes ---------- */

	private static final String[][] DIGITOS = {
			{"###", "#.#", "#.#", "#.#", "###"}, {".#.", "##.", ".#.", ".#.", "###"}, {"###", "..#", "###", "#..", "###"},
			{"###", "..#", ".##", "..#", "###"}, {"#.#", "#.#", "###", "..#", "..#"}, {"###", "#..", "###", "..#", "###"},
			{"###", "#..", "###", "#.#", "###"}, {"###", "..#", ".#.", ".#.", ".#."}, {"###", "#.#", "###", "#.#", "###"},
			{"###", "#.#", "###", "..#", "###"}
	};
	private static final String[] PORCIENTO = {"#...#", "...#.", "..#..", ".#...", "#...#"};

	/** Ancho en píxeles (sin escalar) de un número con su «%». */
	public static int anchoPorcentaje(int valor) {
		return String.valueOf(valor).length() * 4 + 5;
	}

	/** Dibuja «68%» con dígitos pixel, con sombra; cada píxel de `p`×`p`. */
	public static void porcentaje(GuiGraphics g, int valor, int x, int y, int p, int color) {
		String texto = String.valueOf(valor);
		for (int pasada = 0; pasada < 2; pasada++) {
			int c = pasada == 0 ? ((color >>> 24) / 2) << 24 : color;
			int dx = pasada == 0 ? p : 0;
			int cx = x;
			for (char ch : texto.toCharArray()) {
				icono(g, DIGITOS[ch - '0'], cx + dx, y + dx, p, c);
				cx += 4 * p;
			}
			icono(g, PORCIENTO, cx + dx, y + dx, p, c);
		}
	}
}
