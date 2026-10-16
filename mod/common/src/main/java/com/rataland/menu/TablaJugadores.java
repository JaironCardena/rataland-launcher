package com.rataland.menu;

import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.PlayerFaceExtractor;
import net.minecraft.world.entity.player.PlayerSkin;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.util.FormattedCharSequence;
import org.jetbrains.annotations.Nullable;

import java.util.List;

/**
 * La lista de jugadores (Tab) con el estilo de RataLand: un panel arriba con la cara, el nombre, los
 * corazones, las muertes, la puntuación (si el servidor usa una) y el ping de cada uno, y encima y
 * debajo lo que mande el servidor. Si no caben los diez corazones, la vida va en corto.
 */
public final class TablaJugadores {
	private TablaJugadores() {}

	/**
	 * Un jugador de la lista. `puntos` es null si el servidor no muestra puntuación; `vida`, en medios
	 * corazones como la cuenta Minecraft (20 = diez corazones; más, con absorción), o -1 si no se sabe.
	 * `muertes` es null cuando el servidor no ha compartido el contador.
	 */
	public record Fila(Component nombre, PlayerSkin skin, int ping, boolean espectador, boolean yo, @Nullable Component puntos, int vida,
			@Nullable Integer muertes) {}

	private static final Identifier CORAZON_VACIO = Identifier.withDefaultNamespace("hud/heart/container");
	private static final Identifier CORAZON = Identifier.withDefaultNamespace("hud/heart/full");
	private static final Identifier MEDIO_CORAZON = Identifier.withDefaultNamespace("hud/heart/half");
	private static final Identifier CORAZON_DORADO = Identifier.withDefaultNamespace("hud/heart/absorbing_full");
	/** Los diez corazones, de 8 en 8 (cada uno pisa un píxel del anterior, como en Minecraft). */
	private static final int ANCHO_CORAZONES = 10 * 8 + 1;
	/** Con menos sitio que esto para los nombres, la vida va en corto. */
	private static final int NOMBRE_MINIMO = 60;
	private static final int NOMBRE_MAXIMO = 120;

	private static final int ALTO_FILA = 12;
	private static final int ALTO_CABECERA = 16;
	private static final int POR_COLUMNA = 10;
	private static final int ENTRE_COLUMNAS = 6;
	private static final int ENTRE_CAMPOS = 8;

	private record Medidas(int nombre, int vidaLarga, int vidaCorta, int puntos, int muertes, int ping, int tu) {
		int anchoColumna(int anchoNombre, int anchoVida) {
			return 19 + anchoNombre + ENTRE_CAMPOS + anchoVida + (puntos > 0 ? ENTRE_CAMPOS + puntos : 0)
					+ ENTRE_CAMPOS + muertes + ENTRE_CAMPOS + ping + 6;
		}
	}

	public static void dibujar(GuiGraphicsExtractor g, Font fuente, int anchoPantalla, @Nullable Component cabecera, @Nullable Component pie, List<Fila> filas) {
		Medidas m = medir(fuente, filas);
		int maximo = Math.max(1, anchoPantalla - 20);
		int altoMaximo = Math.max(1, g.guiHeight() - 16);
		String cuantos = filas.size() == 1 ? "1 conectado" : filas.size() + " conectados";
		int anchoTitulo = fuente.width("En el servidor") + 16 + fuente.width(cuantos) + 16;
		int anchoMinimoColumna = m.anchoColumna(Math.min(m.nombre(), NOMBRE_MINIMO), m.vidaCorta());
		int preferidas = Math.max(1, Math.min(4, (filas.size() + POR_COLUMNA - 1) / POR_COLUMNA));
		int columnas = 1;
		double escala = 0;
		// Se elige la distribución que conserve el texto más grande, teniendo en cuenta también la altura.
		for (int n = 1; n <= Math.min(4, Math.max(1, filas.size())); n++) {
			int anchoMinimo = Math.max(anchoTitulo, n * anchoMinimoColumna + (n - 1) * ENTRE_COLUMNAS + 12);
			int porColumna = Math.max(1, (filas.size() + n - 1) / n);
			int alto = alto(porColumna, lineas(fuente, cabecera, anchoMinimo).size(), lineas(fuente, pie, anchoMinimo).size());
			double candidata = Math.min(1, Math.min(maximo / (double) anchoMinimo, altoMaximo / (double) alto));
			if (candidata > escala + 1e-6 || (Math.abs(candidata - escala) < 1e-6 && Math.abs(n - preferidas) < Math.abs(columnas - preferidas))) {
				columnas = n;
				escala = candidata;
			}
		}
		int porColumna = Math.max(1, (filas.size() + columnas - 1) / columnas);
		int cabe = Math.max(anchoMinimoColumna, ((int) Math.floor(maximo / escala + 1e-7) - 12 - (columnas - 1) * ENTRE_COLUMNAS) / columnas);
		boolean corto = m.vidaLarga() == 0 || m.anchoColumna(Math.min(m.nombre(), NOMBRE_MINIMO), m.vidaLarga()) > cabe;
		int anchoVida = corto ? m.vidaCorta() : m.vidaLarga();
		int anchoColumna = Math.min(cabe, m.anchoColumna(m.nombre(), anchoVida));
		int anchoLista = columnas * anchoColumna + (columnas - 1) * ENTRE_COLUMNAS;
		int ancho = Math.max(anchoTitulo, anchoLista + 12);
		List<FormattedCharSequence> arriba = lineas(fuente, cabecera, ancho);
		List<FormattedCharSequence> abajo = lineas(fuente, pie, ancho);
		int alto = alto(porColumna, arriba.size(), abajo.size());

		g.pose().pushMatrix();
		g.pose().translate((float) ((anchoPantalla - ancho * escala) / 2), 8f);
		g.pose().scale((float) escala, (float) escala);
		Estilo.panel(g, 0, 0, ancho, alto);
		int ty = 7;
		g.text(fuente, "En el servidor", 8, ty, Estilo.TEXTO);
		g.text(fuente, cuantos, ancho - 8 - fuente.width(cuantos), ty, Estilo.TENUE);
		ty += 9 + 7;

		for (FormattedCharSequence linea : arriba) {
			g.text(fuente, linea, (ancho - fuente.width(linea)) / 2, ty, Estilo.CLARO);
			ty += 10;
		}
		if (!arriba.isEmpty()) {
			g.fill(8, ty + 1, ancho - 8, ty + 2, Estilo.LINEA);
			ty += 6;
		}

		int xLista = (ancho - anchoLista) / 2;
		for (int n = 0; n < columnas; n++) {
			dibujarCabecera(g, fuente, xLista + n * (anchoColumna + ENTRE_COLUMNAS), ty, anchoColumna, anchoVida, m);
		}
		ty += ALTO_CABECERA;
		for (int i = 0; i < filas.size(); i++) {
			int columna = i / porColumna;
			int fila = i % porColumna;
			dibujarFila(g, fuente, filas.get(i), xLista + columna * (anchoColumna + ENTRE_COLUMNAS), ty + fila * ALTO_FILA, anchoColumna, anchoVida, corto,
					m);
		}
		ty += porColumna * ALTO_FILA;

		if (!abajo.isEmpty()) {
			g.fill(8, ty + 2, ancho - 8, ty + 3, Estilo.LINEA);
			ty += 6;
			for (FormattedCharSequence linea : abajo) {
				g.text(fuente, linea, (ancho - fuente.width(linea)) / 2, ty, Estilo.CLARO);
				ty += 10;
			}
		}
		g.pose().popMatrix();
	}

	private static Medidas medir(Font fuente, List<Fila> filas) {
		int nombre = fuente.width("Jugador");
		int puntos = 0;
		int tu = fuente.width(" tú");
		int muertes = fuente.width("Muertes");
		int ping = fuente.width("Ping");
		int absorcion = 0;
		int vidaNumero = fuente.width("-");
		boolean hayVida = false;
		for (Fila f : filas) {
			nombre = Math.max(nombre, Math.min(NOMBRE_MAXIMO, fuente.width(f.nombre()) + (f.yo() ? tu : 0)));
			if (f.puntos() != null) puntos = Math.max(puntos, Math.max(fuente.width("Puntos"), Math.min(80, fuente.width(f.puntos()))));
			muertes = Math.max(muertes, 11 + fuente.width(textoMuertes(f)));
			ping = Math.max(ping, 11 + fuente.width(textoPing(f)));
			if (f.vida() < 0 || f.espectador()) continue;
			hayVida = true;
			if (f.vida() > 20) absorcion = Math.max(absorcion, 14 + fuente.width("+" + corazones(f.vida() - 20)));
			vidaNumero = Math.max(vidaNumero, fuente.width(corazones(f.vida())));
		}
		int vidaLarga = hayVida ? Math.max(ANCHO_CORAZONES + absorcion, fuente.width("mirando")) : 0;
		int vidaCorta = Math.max(fuente.width("Vida"), hayVida ? 11 + vidaNumero : fuente.width("-"));
		return new Medidas(nombre, vidaLarga, vidaCorta, puntos, muertes, ping, tu);
	}

	private static List<FormattedCharSequence> lineas(Font fuente, @Nullable Component texto, int ancho) {
		return texto == null || texto.getString().isBlank() ? List.of() : fuente.split(texto, Math.max(1, ancho - 16));
	}

	private static int alto(int filas, int arriba, int abajo) {
		return 7 + 9 + 7 + (arriba > 0 ? arriba * 10 + 6 : 0) + ALTO_CABECERA + filas * ALTO_FILA + (abajo > 0 ? 6 + abajo * 10 : 0) + 7;
	}

	private static void dibujarCabecera(GuiGraphicsExtractor g, Font fuente, int x, int y, int ancho, int anchoVida, Medidas m) {
		int xPing = x + ancho - 6 - m.ping();
		int xMuertes = xPing - ENTRE_CAMPOS - m.muertes();
		int xPuntos = xMuertes - ENTRE_CAMPOS - m.puntos();
		int xVida = (m.puntos() > 0 ? xPuntos : xMuertes) - ENTRE_CAMPOS - anchoVida;
		g.text(fuente, "Jugador", x + 6, y + 1, Estilo.TENUE);
		g.text(fuente, "Vida", xVida, y + 1, Estilo.TENUE);
		if (m.puntos() > 0) g.text(fuente, "Puntos", xPuntos, y + 1, Estilo.TENUE);
		g.text(fuente, "Muertes", xMuertes, y + 1, Estilo.QUESO);
		g.text(fuente, "Ping", xPing, y + 1, Estilo.TENUE);
		g.fill(x + 6, y + 12, x + ancho - 6, y + 13, Estilo.LINEA);
	}

	private static void dibujarFila(GuiGraphicsExtractor g, Font fuente, Fila f, int x, int y, int ancho, int anchoVida, boolean corto, Medidas m) {
		if (f.yo()) Estilo.escalon(g, x, y, ancho, ALTO_FILA, 0x22F6C445);
		PlayerFaceExtractor.extractRenderState(g, f.skin(), x + 6, y + 2, 8);
		if (f.espectador()) g.fill(x + 6, y + 2, x + 14, y + 10, 0x990D1424);

		int xPing = x + ancho - 6 - m.ping();
		int xMuertes = xPing - ENTRE_CAMPOS - m.muertes();
		int xPuntos = xMuertes - ENTRE_CAMPOS - m.puntos();
		int xVida = (m.puntos() > 0 ? xPuntos : xMuertes) - ENTRE_CAMPOS - anchoVida;
		int libre = Math.max(0, xVida - ENTRE_CAMPOS - (x + 19) - (f.yo() ? m.tu() : 0));
		int color = f.espectador() ? Estilo.MUY_TENUE : Estilo.TEXTO;
		int finNombre;
		if (fuente.width(f.nombre()) <= libre) {
			g.text(fuente, f.nombre(), x + 19, y + 2, color);
			finNombre = x + 19 + fuente.width(f.nombre());
		} else {
			String recortado = recortar(fuente, f.nombre().getString(), libre);
			g.text(fuente, recortado, x + 19, y + 2, color);
			finNombre = x + 19 + fuente.width(recortado);
		}
		if (f.yo()) g.text(fuente, "tú", finNombre + fuente.width(" "), y + 2, Estilo.QUESO);

		dibujarVida(g, fuente, f, xVida, y, corto);
		if (f.puntos() != null) {
			if (fuente.width(f.puntos()) <= m.puntos()) g.text(fuente, f.puntos(), xPuntos + m.puntos() - fuente.width(f.puntos()), y + 2, Estilo.QUESO);
			else {
				String puntos = recortar(fuente, f.puntos().getString(), m.puntos());
				g.text(fuente, puntos, xPuntos + m.puntos() - fuente.width(puntos), y + 2, Estilo.QUESO);
			}
		}

		boolean conocidas = f.muertes() != null && f.muertes() >= 0;
		Estilo.icono(g, IconosPixel.CALAVERA, xMuertes, y + 2, 1, conocidas ? Estilo.TENUE : Estilo.MUY_TENUE);
		String muertes = textoMuertes(f);
		g.text(fuente, muertes, xMuertes + m.muertes() - fuente.width(muertes), y + 2, conocidas ? Estilo.QUESO : Estilo.MUY_TENUE);

		int colorPing = f.ping() < 0 ? Estilo.MUY_TENUE : f.ping() < 150 ? Estilo.HIERBA : f.ping() < 300 ? Estilo.QUESO : Estilo.ERROR;
		Estilo.icono(g, IconosPixel.SENAL, xPing, y + 2, 1, colorPing);
		String ms = textoPing(f);
		g.text(fuente, ms, xPing + m.ping() - fuente.width(ms), y + 2, Estilo.TENUE);
	}

	private static String textoMuertes(Fila f) {
		return f.muertes() == null || f.muertes() < 0 ? "-" : f.muertes().toString();
	}

	private static String textoPing(Fila f) {
		return f.ping() < 0 ? "?" : f.ping() + " ms";
	}

	private static String recortar(Font fuente, String texto, int ancho) {
		return ancho < fuente.width("…") ? "" : Estilo.recortar(fuente, texto, ancho);
	}

	/** Los corazones de Minecraft (los del paquete de recursos que se use) o, en corto, uno y el número. */
	private static void dibujarVida(GuiGraphicsExtractor g, Font fuente, Fila f, int x, int y, boolean corto) {
		if (f.espectador() || f.vida() < 0) {
			// Espectadores, y quien está lejos si el servidor no comparte la vida de todos
			g.text(fuente, corto ? "-" : f.espectador() ? "mirando" : "lejos", x, y + 2, Estilo.MUY_TENUE);
			return;
		}
		int vida = Math.min(f.vida(), 20);
		if (corto) {
			g.blitSprite(RenderPipelines.GUI_TEXTURED, CORAZON_VACIO, x, y + 1, 9, 9);
			if (f.vida() > 0) g.blitSprite(RenderPipelines.GUI_TEXTURED, f.vida() > 20 ? CORAZON_DORADO : vida == 1 ? MEDIO_CORAZON : CORAZON, x, y + 1, 9, 9);
			g.text(fuente, corazones(f.vida()), x + 11, y + 2, f.vida() > 20 ? Estilo.QUESO : Estilo.TEXTO);
		} else {
			for (int i = 0; i < 10; i++) {
				int cx = x + i * 8;
				g.blitSprite(RenderPipelines.GUI_TEXTURED, CORAZON_VACIO, cx, y + 1, 9, 9);
				if (vida >= i * 2 + 2) g.blitSprite(RenderPipelines.GUI_TEXTURED, CORAZON, cx, y + 1, 9, 9);
				else if (vida == i * 2 + 1) g.blitSprite(RenderPipelines.GUI_TEXTURED, MEDIO_CORAZON, cx, y + 1, 9, 9);
			}
			if (f.vida() > 20) {
				int ax = x + ANCHO_CORAZONES + 3;
				g.blitSprite(RenderPipelines.GUI_TEXTURED, CORAZON_DORADO, ax, y + 1, 9, 9);
				g.text(fuente, "+" + corazones(f.vida() - 20), ax + 11, y + 2, Estilo.QUESO);
			}
		}
	}

	/** Medios corazones en corazones, como se dicen: 13 → «6,5». */
	private static String corazones(int medios) {
		return medios % 2 == 0 ? String.valueOf(medios / 2) : medios / 2 + ",5";
	}
}
