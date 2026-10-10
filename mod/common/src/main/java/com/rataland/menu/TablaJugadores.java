package com.rataland.menu;

import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.PlayerFaceRenderer;
import net.minecraft.client.resources.PlayerSkin;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.FormattedCharSequence;
import org.jetbrains.annotations.Nullable;

import java.util.List;

/**
 * La lista de jugadores (Tab) con el estilo de RataLand: un panel arriba con la cara, el nombre, los
 * corazones, la puntuación (si el servidor usa una) y el ping de cada uno, y encima y debajo lo que
 * mande el servidor. Si no caben los diez corazones, la vida va en corto: un corazón y el número.
 */
public final class TablaJugadores {
	private TablaJugadores() {}

	/**
	 * Un jugador de la lista. `puntos` es null si el servidor no muestra puntuación; `vida`, en medios
	 * corazones como la cuenta Minecraft (20 = diez corazones; más, con absorción), o -1 si no se sabe.
	 */
	public record Fila(Component nombre, PlayerSkin skin, int ping, boolean espectador, boolean yo, @Nullable Component puntos, int vida) {}

	private static final ResourceLocation CORAZON_VACIO = ResourceLocation.withDefaultNamespace("hud/heart/container");
	private static final ResourceLocation CORAZON = ResourceLocation.withDefaultNamespace("hud/heart/full");
	private static final ResourceLocation MEDIO_CORAZON = ResourceLocation.withDefaultNamespace("hud/heart/half");
	private static final ResourceLocation CORAZON_DORADO = ResourceLocation.withDefaultNamespace("hud/heart/absorbing_full");
	/** Los diez corazones, de 8 en 8 (cada uno pisa un píxel del anterior, como en Minecraft). */
	private static final int ANCHO_CORAZONES = 10 * 8 + 1;
	/** Con menos sitio que esto para los nombres, la vida va en corto. */
	private static final int NOMBRE_MINIMO = 60;

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
		// La vida: los diez corazones (y el dorado de la absorción) o, en corto, un corazón y el número
		boolean hayVida = false;
		int anchoAbsorcion = 0;
		int anchoNumero = fuente.width("-");
		for (Fila f : filas) {
			if (f.vida() < 0 || f.espectador()) continue;
			hayVida = true;
			if (f.vida() > 20) anchoAbsorcion = Math.max(anchoAbsorcion, 3 + 9 + 2 + fuente.width("+" + corazones(f.vida() - 20)));
			anchoNumero = Math.max(anchoNumero, fuente.width(corazones(f.vida())));
		}
		int anchoVidaLarga = hayVida ? Math.max(ANCHO_CORAZONES + anchoAbsorcion, Math.max(fuente.width("mirando"), fuente.width("lejos"))) : 0;
		int anchoVidaCorta = hayVida ? 9 + 2 + anchoNumero : 0;

		int anchoPing = 8 + 3 + fuente.width("999 ms");
		int extra = 19 + (anchoPuntos > 0 ? 8 + anchoPuntos : 0) + 8 + anchoPing + 6;
		int maximo = anchoPantalla - 20;
		int cabe = (maximo - 12 - (columnas - 1) * ENTRE_COLUMNAS) / columnas;
		boolean corto = hayVida && cabe - extra - 8 - anchoVidaLarga < Math.min(anchoNombre, NOMBRE_MINIMO);
		int anchoVida = corto ? anchoVidaCorta : anchoVidaLarga;
		if (anchoVida > 0) extra += 8 + anchoVida;
		int anchoColumna = Math.max(170, extra + anchoNombre);
		// Si no cabe, se recortan los nombres
		anchoColumna = Math.min(anchoColumna, cabe);
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
			dibujarFila(g, fuente, filas.get(i), xLista + columna * (anchoColumna + ENTRE_COLUMNAS), ty + fila * ALTO_FILA, anchoColumna, anchoVida, corto,
					anchoPuntos, anchoPing, anchoTu);
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

	private static void dibujarFila(GuiGraphics g, Font fuente, Fila f, int x, int y, int ancho, int anchoVida, boolean corto, int anchoPuntos, int anchoPing,
			int anchoTu) {
		if (f.yo()) Estilo.escalon(g, x, y, ancho, ALTO_FILA, 0x22F6C445);
		PlayerFaceRenderer.draw(g, f.skin(), x + 6, y + 2, 8);
		if (f.espectador()) g.fill(x + 6, y + 2, x + 14, y + 10, 0x990D1424);

		int xPing = x + ancho - 6 - anchoPing;
		int xPuntos = xPing - 8 - anchoPuntos;
		int xVida = (anchoPuntos > 0 ? xPuntos : xPing) - 8 - anchoVida;
		int libre = (anchoVida > 0 ? xVida : anchoPuntos > 0 ? xPuntos : xPing) - 8 - (x + 19) - (f.yo() ? anchoTu : 0);
		int color = f.espectador() ? Estilo.MUY_TENUE : Estilo.TEXTO;
		int finNombre;
		if (fuente.width(f.nombre()) <= libre) {
			g.drawString(fuente, f.nombre(), x + 19, y + 2, color);
			finNombre = x + 19 + fuente.width(f.nombre());
		} else {
			String recortado = Estilo.recortar(fuente, f.nombre().getString(), libre);
			g.drawString(fuente, recortado, x + 19, y + 2, color);
			finNombre = x + 19 + fuente.width(recortado);
		}
		if (f.yo()) g.drawString(fuente, "tú", finNombre + fuente.width(" "), y + 2, Estilo.QUESO);

		if (anchoVida > 0) dibujarVida(g, fuente, f, xVida, y, corto);
		if (f.puntos() != null) g.drawString(fuente, f.puntos(), xPuntos + anchoPuntos - fuente.width(f.puntos()), y + 2, Estilo.QUESO);

		int colorPing = f.ping() < 0 ? Estilo.MUY_TENUE : f.ping() < 150 ? Estilo.HIERBA : f.ping() < 300 ? Estilo.QUESO : Estilo.ERROR;
		Estilo.icono(g, IconosPixel.SENAL, xPing, y + 2, 1, colorPing);
		String ms = f.ping() < 0 ? "?" : f.ping() + " ms";
		g.drawString(fuente, ms, xPing + anchoPing - fuente.width(ms), y + 2, Estilo.TENUE);
	}

	/** Los corazones de Minecraft (los del paquete de recursos que se use) o, en corto, uno y el número. */
	private static void dibujarVida(GuiGraphics g, Font fuente, Fila f, int x, int y, boolean corto) {
		if (f.espectador() || f.vida() < 0) {
			// Espectadores, y quien está lejos si el servidor no comparte la vida de todos
			g.drawString(fuente, corto ? "-" : f.espectador() ? "mirando" : "lejos", x, y + 2, Estilo.MUY_TENUE);
			return;
		}
		int vida = Math.min(f.vida(), 20);
		RenderSystem.enableBlend();
		if (corto) {
			g.blitSprite(CORAZON_VACIO, x, y + 1, 9, 9);
			if (f.vida() > 0) g.blitSprite(f.vida() > 20 ? CORAZON_DORADO : vida == 1 ? MEDIO_CORAZON : CORAZON, x, y + 1, 9, 9);
			g.drawString(fuente, corazones(f.vida()), x + 11, y + 2, f.vida() > 20 ? Estilo.QUESO : Estilo.TEXTO);
		} else {
			for (int i = 0; i < 10; i++) {
				int cx = x + i * 8;
				g.blitSprite(CORAZON_VACIO, cx, y + 1, 9, 9);
				if (vida >= i * 2 + 2) g.blitSprite(CORAZON, cx, y + 1, 9, 9);
				else if (vida == i * 2 + 1) g.blitSprite(MEDIO_CORAZON, cx, y + 1, 9, 9);
			}
			if (f.vida() > 20) {
				int ax = x + ANCHO_CORAZONES + 3;
				g.blitSprite(CORAZON_DORADO, ax, y + 1, 9, 9);
				g.drawString(fuente, "+" + corazones(f.vida() - 20), ax + 11, y + 2, Estilo.QUESO);
			}
		}
		RenderSystem.disableBlend();
	}

	/** Medios corazones en corazones, como se dicen: 13 → «6,5». */
	private static String corazones(int medios) {
		return medios % 2 == 0 ? String.valueOf(medios / 2) : medios / 2 + ",5";
	}
}
