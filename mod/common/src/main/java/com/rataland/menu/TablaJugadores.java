package com.rataland.menu;

import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.PlayerFaceRenderer;
import net.minecraft.client.resources.PlayerSkin;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;
import org.jetbrains.annotations.Nullable;

import java.util.List;

/**
 * La lista de jugadores (Tab) con el estilo de RataLand: un panel arriba con la cara, el nombre, la
 * puntuación (si el servidor usa una) y el ping de cada uno, y encima y debajo lo que mande el servidor.
 */
public final class TablaJugadores {
	private TablaJugadores() {}

	/** Un jugador de la lista. `puntos` es null si el servidor no muestra puntuación. */
	public record Fila(Component nombre, PlayerSkin skin, int ping, boolean espectador, boolean yo, @Nullable Component puntos) {}

	private static final int ALTO_FILA = 12;
	private static final int POR_COLUMNA = 10;
	private static final int ENTRE_COLUMNAS = 6;

	public static void dibujar(GuiGraphics g, Font fuente, int anchoPantalla, @Nullable Component cabecera, @Nullable Component pie, List<Fila> filas) {
		int columnas = Math.max(1, Math.min(4, (filas.size() + POR_COLUMNA - 1) / POR_COLUMNA));
		int porColumna = Math.max(1, (filas.size() + columnas - 1) / columnas);
		int anchoNombre = 0;
		int anchoPuntos = 0;
		int anchoTu = fuente.width(" tú");
		for (Fila f : filas) {
			anchoNombre = Math.max(anchoNombre, fuente.width(f.nombre()) + (f.yo() ? anchoTu : 0));
			if (f.puntos() != null) anchoPuntos = Math.max(anchoPuntos, fuente.width(f.puntos()));
		}
		int anchoPing = 8 + 3 + fuente.width("999 ms");
		int extra = 19 + (anchoPuntos > 0 ? 8 + anchoPuntos : 0) + 8 + anchoPing + 6;
		int anchoColumna = Math.max(170, extra + anchoNombre);
		int maximo = anchoPantalla - 20;
		// Si no cabe, se recortan los nombres
		anchoColumna = Math.min(anchoColumna, (maximo - 12 - (columnas - 1) * ENTRE_COLUMNAS) / columnas);
		int anchoLista = columnas * anchoColumna + (columnas - 1) * ENTRE_COLUMNAS;

		List<FormattedCharSequence> arriba = cabecera == null || cabecera.getString().isBlank() ? List.of() : fuente.split(cabecera, maximo - 16);
		List<FormattedCharSequence> abajo = pie == null || pie.getString().isBlank() ? List.of() : fuente.split(pie, maximo - 16);
		int anchoTextos = 0;
		for (FormattedCharSequence linea : arriba) anchoTextos = Math.max(anchoTextos, fuente.width(linea));
		for (FormattedCharSequence linea : abajo) anchoTextos = Math.max(anchoTextos, fuente.width(linea));
		String cuantos = filas.size() == 1 ? "1 conectado" : filas.size() + " conectados";
		int anchoTitulo = fuente.width("En el servidor") + 16 + fuente.width(cuantos) + 16;
		int ancho = Math.min(maximo, Math.max(Math.max(anchoLista + 12, anchoTextos + 16), anchoTitulo));

		int alto = 7 + 9 + 7 + (arriba.isEmpty() ? 0 : arriba.size() * 10 + 6) + porColumna * ALTO_FILA + (abajo.isEmpty() ? 0 : 6 + abajo.size() * 10) + 7;
		int x = (anchoPantalla - ancho) / 2;
		int y = 8;
		Estilo.panel(g, x, y, ancho, alto);

		int ty = y + 7;
		g.drawString(fuente, "En el servidor", x + 8, ty, Estilo.TEXTO);
		g.drawString(fuente, cuantos, x + ancho - 8 - fuente.width(cuantos), ty, Estilo.TENUE);
		ty += 9 + 7;

		for (FormattedCharSequence linea : arriba) {
			g.drawString(fuente, linea, x + (ancho - fuente.width(linea)) / 2, ty, Estilo.CLARO);
			ty += 10;
		}
		if (!arriba.isEmpty()) {
			g.fill(x + 8, ty + 1, x + ancho - 8, ty + 2, Estilo.LINEA);
			ty += 6;
		}

		int xLista = x + (ancho - anchoLista) / 2;
		for (int i = 0; i < filas.size(); i++) {
			int columna = i / porColumna;
			int fila = i % porColumna;
			dibujarFila(g, fuente, filas.get(i), xLista + columna * (anchoColumna + ENTRE_COLUMNAS), ty + fila * ALTO_FILA, anchoColumna, anchoPuntos, anchoPing, anchoTu);
		}
		ty += porColumna * ALTO_FILA;

		if (!abajo.isEmpty()) {
			g.fill(x + 8, ty + 2, x + ancho - 8, ty + 3, Estilo.LINEA);
			ty += 6;
			for (FormattedCharSequence linea : abajo) {
				g.drawString(fuente, linea, x + (ancho - fuente.width(linea)) / 2, ty, Estilo.CLARO);
				ty += 10;
			}
		}
	}

	private static void dibujarFila(GuiGraphics g, Font fuente, Fila f, int x, int y, int ancho, int anchoPuntos, int anchoPing, int anchoTu) {
		if (f.yo()) Estilo.escalon(g, x, y, ancho, ALTO_FILA, 0x22F6C445);
		PlayerFaceRenderer.draw(g, f.skin(), x + 6, y + 2, 8);
		if (f.espectador()) g.fill(x + 6, y + 2, x + 14, y + 10, 0x990D1424);

		int xPing = x + ancho - 6 - anchoPing;
		int xPuntos = xPing - 8 - anchoPuntos;
		int libre = (anchoPuntos > 0 ? xPuntos : xPing) - 8 - (x + 19) - (f.yo() ? anchoTu : 0);
		int color = f.espectador() ? Estilo.MUY_TENUE : Estilo.TEXTO;
		int finNombre;
		if (fuente.width(f.nombre()) <= libre) {
			g.drawString(fuente, f.nombre(), x + 19, y + 2, color);
			finNombre = x + 19 + fuente.width(f.nombre());
		} else {
			String corto = Estilo.recortar(fuente, f.nombre().getString(), libre);
			g.drawString(fuente, corto, x + 19, y + 2, color);
			finNombre = x + 19 + fuente.width(corto);
		}
		if (f.yo()) g.drawString(fuente, "tú", finNombre + fuente.width(" "), y + 2, Estilo.QUESO);

		if (f.puntos() != null) g.drawString(fuente, f.puntos(), xPuntos + anchoPuntos - fuente.width(f.puntos()), y + 2, Estilo.QUESO);

		int colorPing = f.ping() < 0 ? Estilo.MUY_TENUE : f.ping() < 150 ? Estilo.HIERBA : f.ping() < 300 ? Estilo.QUESO : Estilo.ERROR;
		Estilo.icono(g, IconosPixel.SENAL, xPing, y + 2, 1, colorPing);
		String ms = f.ping() < 0 ? "?" : f.ping() + " ms";
		g.drawString(fuente, ms, xPing + anchoPing - fuente.width(ms), y + 2, Estilo.TENUE);
	}
}
