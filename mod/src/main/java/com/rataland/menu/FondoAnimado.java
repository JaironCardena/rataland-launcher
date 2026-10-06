package com.rataland.menu;

import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.Identifier;
import net.minecraft.util.Util;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Animación del fondo «Noche de pesca»: estrellas que titilan, alguna estrella fugaz, nubes,
 * el reflejo de la luna en el lago, la barca que se mece, el corcho con sus ondas, el farol y las luciérnagas.
 * Se dibuja a 320×180 encima del fondo fijo. Es la misma que src/renderer/fondo-animado.js
 * en el launcher: si cambias algo, cámbialo en los dos.
 */
public final class FondoAnimado {
	private FondoAnimado() {}

	public static final String ESCENA = "pesca";
	public static final Identifier NUBES = Identifier.of(RataLand.MOD_ID, "textures/gui/fondo_pesca_nubes.png");
	private static final int NUBES_ANCHO = 640;
	private static final int NUBES_ALTO = 96;
	public static final Identifier BARCA = Identifier.of(RataLand.MOD_ID, "textures/gui/fondo_pesca_barca.png");
	private static final int BARCA_ANCHO = 128;
	private static final int BARCA_ALTO = 80;

	private static final int W = 320;
	private static final int H = 180;
	private static final int ORILLA = 104;
	private static final int LUNA_X = 200;
	/** La capa de la barca mide 64×40 y se pinta aquí. */
	private static final int BARCA_X = 136;
	private static final int BARCA_Y = 78;
	private static final int AGUA_BARCA = 114;
	private static final int CORCHO_X = 128;
	private static final int CORCHO_Y = 109;
	private static final int AGUA_CORCHO = 112;
	/** Punta de la caña y luz del farol (se mecen con la barca). */
	private static final int PUNTA_X = 140;
	private static final int PUNTA_Y = 84;
	private static final int FAROL_X = 180;
	private static final int FAROL_Y = 97;
	private static final double VUELTA = 6.283;

	private record Estrella(int x, int y, double v, double f, boolean grande) {}
	private record Destello(int x, int y, int w, double v, double f) {}
	private record Luciernaga(double x, double y, double v, double[] f) {}

	private static final List<Estrella> ESTRELLAS = new ArrayList<>();
	private static final List<Destello> DESTELLOS = new ArrayList<>();
	private static final List<Luciernaga> LUCIERNAGAS = new ArrayList<>();
	private static final long INICIO = Util.getMeasuringTimeMs();

	/** Mismo generador y mismo orden que en el launcher, para que salgan las mismas posiciones. */
	private static final class Aleatorio {
		private long s;

		Aleatorio(long semilla) {
			s = semilla;
		}

		double siguiente() {
			s = (s * 16807) % 2147483647L;
			return (s - 1) / 2147483646.0;
		}
	}

	static {
		Aleatorio rnd = new Aleatorio(91);
		while (ESTRELLAS.size() < 28) {
			int x = (int) Math.floor(rnd.siguiente() * W);
			int y = 2 + (int) Math.floor(rnd.siguiente() * 84);
			double v = 0.6 + rnd.siguiente() * 1.4;
			double f = rnd.siguiente() * VUELTA;
			boolean grande = rnd.siguiente() > 0.75;
			if ((x - LUNA_X) * (x - LUNA_X) + (y - 40) * (y - 40) < 900) continue;
			ESTRELLAS.add(new Estrella(x, y, v, f, grande));
		}
		while (DESTELLOS.size() < 26) {
			int x = (int) Math.floor(rnd.siguiente() * W);
			int y = ORILLA + 3 + (int) Math.floor(rnd.siguiente() * (H - ORILLA - 4));
			int w = 2 + (int) Math.floor(rnd.siguiente() * 4);
			double v = 0.5 + rnd.siguiente();
			double f = rnd.siguiente() * VUELTA;
			if (y >= orilla(x) - 2 || y >= orilla(x + w) - 2) continue;
			if (x + w >= 264 && y <= 146) continue;
			if (x + w >= 148 && x <= 190 && y <= 124) continue;
			if (Math.abs(x - CORCHO_X) < 14 && y <= 118) continue;
			if (Math.abs(x - LUNA_X) < 14) continue;
			DESTELLOS.add(new Destello(x, y, w, v, f));
		}
		for (int i = 0; i < 12; i++) {
			double x = 8 + rnd.siguiente() * 150;
			double y = 112 + rnd.siguiente() * 52;
			double v = 0.7 + rnd.siguiente() * 0.6;
			double[] f = {rnd.siguiente() * VUELTA, rnd.siguiente() * VUELTA, rnd.siguiente() * VUELTA, rnd.siguiente() * VUELTA};
			LUCIERNAGAS.add(new Luciernaga(x, y, v, f));
		}
	}

	private static int orilla(int x) {
		return x < 140 ? 146 + (int) Math.floor(Math.pow(x / 140.0, 2) * 34) : 999;
	}

	private static double azar(double n) {
		double x = Math.sin(n * 12.9898) * 43758.5453;
		return x - Math.floor(x);
	}

	private static void rect(DrawContext context, int x, int y, int w, int h, int rgb, double alfa) {
		int a = (int) Math.round(Math.min(1, alfa) * 255);
		if (a <= 0) return;
		context.fill(x, y, x + w, y + h, (a << 24) | rgb);
	}

	private static void circulo(DrawContext context, int cx, int cy, int r, int rgb, double alfa) {
		for (int dy = -r; dy <= r; dy++) {
			int m = (int) Math.floor(Math.sqrt(r * r - dy * dy));
			rect(context, cx - m, cy + dy, m * 2 + 1, 1, rgb, alfa);
		}
	}

	/** Dibuja lo que se mueve sobre el fondo, que ocupa (x, y, ancho, alto) en la pantalla. */
	public static void dibujar(DrawContext context, int x, int y, int ancho, int alto) {
		double t = (Util.getMeasuringTimeMs() - INICIO) / 1000.0;
		MatrixStack matrices = context.getMatrices();
		matrices.push();
		matrices.translate(x, y, 0);
		matrices.scale(ancho / (float) W, alto / (float) H, 1);

		// Todo lo que va detrás de las nubes, en una sola tanda
		context.draw(() -> cielo(context, t));

		// Nubes que cruzan despacio (la capa se repite sin costuras)
		int desp = (int) Math.floor(t * 2.5) % W;
		RenderSystem.enableBlend();
		RenderSystem.defaultBlendFunc();
		context.drawTexture(NUBES, -desp, 6, W, 48, 0, 0, NUBES_ANCHO, NUBES_ALTO, NUBES_ANCHO, NUBES_ALTO);
		context.drawTexture(NUBES, W - desp, 6, W, 48, 0, 0, NUBES_ANCHO, NUBES_ALTO, NUBES_ANCHO, NUBES_ALTO);
		RenderSystem.disableBlend();

		int mece = Math.sin(t * 1.3) > 0.2 ? 1 : 0;
		context.draw(() -> lago(context, t, mece));

		RenderSystem.enableBlend();
		RenderSystem.defaultBlendFunc();
		context.drawTexture(BARCA, BARCA_X, BARCA_Y + mece, 64, 40, 0, 0, BARCA_ANCHO, BARCA_ALTO, BARCA_ANCHO, BARCA_ALTO);
		RenderSystem.disableBlend();

		context.draw(() -> luces(context, t, mece));
		matrices.pop();
	}

	private static void cielo(DrawContext context, double t) {
		// Estrellas que titilan
		for (Estrella e : ESTRELLAS) {
			double k = 0.5 + 0.5 * Math.sin(t * e.v() + e.f());
			rect(context, e.x(), e.y(), 1, 1, 0xE9EFFF, 0.15 + 0.85 * k * k);
			if (e.grande() && k > 0.85) {
				double a = (k - 0.85) / 0.15 * 0.5;
				rect(context, e.x() - 1, e.y(), 1, 1, 0xE9EFFF, a);
				rect(context, e.x() + 1, e.y(), 1, 1, 0xE9EFFF, a);
				rect(context, e.x(), e.y() - 1, 1, 1, 0xE9EFFF, a);
				rect(context, e.x(), e.y() + 1, 1, 1, 0xE9EFFF, a);
			}
		}

		// Una estrella fugaz cada 13 segundos, cada vez en un sitio
		double n = Math.floor((t + 4) / 13);
		double u = ((t + 4) - n * 13) / 1.1;
		if (u < 1) {
			double cx = 90 + azar(n) * 200 - u * 64;
			double cy = 4 + azar(n + 0.5) * 30 + u * 30;
			double brillo = Math.sin(Math.PI * u);
			for (int i = 0; i < 10; i++) {
				rect(context, (int) Math.round(cx + i * 0.905), (int) Math.round(cy - i * 0.424), 1, 1, 0xFFF3D6, brillo * (1 - i / 10.0));
			}
		}
	}

	private static void lago(DrawContext context, double t, int mece) {
		// Reflejo de la luna, roto por las olas
		for (int y = ORILLA + 2; y < 160; y += 2) {
			if (Math.sin(t * 1.9 + y * 1.7) > 0.8) continue;
			double d = (y - ORILLA) / 56.0;
			int media = (int) Math.max(1, Math.round(7 - d * 4 + 1.6 * Math.sin(t * 1.6 + y * 0.8)));
			int cx = LUNA_X + (int) Math.round(1.5 * Math.sin(t * 1.1 + y * 0.45));
			double a = 0.5 * (1 - d * 0.75);
			rect(context, cx - media, y, media * 2, 1, 0xF6C445, a);
			if (media > 3) rect(context, cx - 1 + (int) Math.round(Math.sin(t * 2.3 + y)), y, 2, 1, 0xFFF0A8, a);
		}

		// Destellos en el agua
		for (Destello g : DESTELLOS) {
			double k = 0.5 + 0.5 * Math.sin(t * g.v() + g.f());
			rect(context, g.x() + (int) Math.round(Math.sin(t * 0.6 + g.f()) * 1.5), g.y(), g.w(), 1, 0x5D6B9A, 0.1 + 0.35 * k);
		}

		// La barca se mece: su reflejo, tembloroso
		for (int k = 0; k < 5; k++) {
			int bx = 154 + k + (int) Math.round(Math.sin(t * 1.5 + k * 1.3));
			rect(context, bx, AGUA_BARCA + mece + k, 30 - k * 2, 1, 0x0A0F1C, 0.3 * (1 - k / 5.0));
		}

		// El corcho flota; de vez en cuando pica un pez y se hunde
		boolean pica = (t + 9) % 19 < 0.9;
		int baja = pica ? 2 : Math.sin(t * 2.4) > 0.4 ? 1 : 0;
		Set<Long> vistos = new HashSet<>();
		for (double desfase : new double[] {0, 1.5}) {
			double edad = ((t + desfase) % 3) / 3;
			double r = 2 + edad * 9;
			long pasos = Math.round(r * 5);
			for (int i = 0; i < pasos; i++) {
				int px = (int) Math.round(CORCHO_X + 0.5 + r * Math.cos(i / (double) pasos * VUELTA));
				int py = (int) Math.round(AGUA_CORCHO + r * 0.3 * Math.sin(i / (double) pasos * VUELTA));
				if (!vistos.add((long) (desfase * 100000) + px * 1000L + py)) continue;
				rect(context, px, py, 1, 1, 0x8FA0CC, (1 - edad) * 0.45);
			}
		}
		int puntaY = PUNTA_Y + mece;
		int finX = CORCHO_X;
		int finY = CORCHO_Y + baja;
		int tramos = Math.max(Math.abs(finX - PUNTA_X), Math.abs(finY - puntaY));
		for (int i = 1; i < tramos; i++) {
			rect(context, (int) Math.round(PUNTA_X + (finX - PUNTA_X) * i / (double) tramos),
					(int) Math.round(puntaY + (finY - puntaY) * i / (double) tramos), 1, 1, 0xC7CFE0, 0.4);
		}
		if (finY < AGUA_CORCHO) rect(context, finX, finY, 2, 1, 0xE0533F, 1);
		if (finY + 1 < AGUA_CORCHO) rect(context, finX, finY + 1, 2, 1, 0xF2F2F2, 1);
	}

	private static void luces(DrawContext context, double t, int mece) {
		// Farol que parpadea, con su reflejo en el agua
		double llama = 0.5 + 0.25 * Math.sin(t * 7.3) + 0.25 * Math.sin(t * 11.1 + 1);
		circulo(context, FAROL_X + 1, FAROL_Y + 2 + mece, 16, 0xF6C445, 0.04 + 0.03 * llama);
		circulo(context, FAROL_X + 1, FAROL_Y + 2 + mece, 8, 0xF6C445, 0.06 + 0.05 * llama);
		rect(context, FAROL_X, FAROL_Y + mece, 2, 4, llama > 0.6 ? 0xFFF0A8 : 0xFFD36B, 1);
		for (int y = AGUA_BARCA + 6; y < AGUA_BARCA + 22; y += 2) {
			int ancho = Math.sin(t * 2 + y) > 0 ? 3 : 2;
			rect(context, FAROL_X + (int) Math.round(Math.sin(t * 1.7 + y * 0.9)), y, ancho, 1, 0xF6C445,
					0.3 * (1 - (y - AGUA_BARCA - 6) / 16.0) * (0.6 + 0.4 * llama));
		}

		// Luciérnagas
		for (Luciernaga l : LUCIERNAGAS) {
			int lx = (int) Math.round(l.x() + 7 * Math.sin(t * 0.37 * l.v() + l.f()[0]) + 3 * Math.sin(t * 0.9 * l.v() + l.f()[1]));
			int ly = (int) Math.round(l.y() + 4 * Math.sin(t * 0.53 * l.v() + l.f()[2]));
			double b = Math.pow(Math.max(0, Math.sin(t * 1.1 * l.v() + l.f()[3])), 2);
			rect(context, lx - 1, ly - 1, 3, 3, 0xF6C445, 0.22 * b);
			rect(context, lx, ly, 1, 1, 0xFFF0A8, 0.12 + 0.88 * b);
		}
	}
}
