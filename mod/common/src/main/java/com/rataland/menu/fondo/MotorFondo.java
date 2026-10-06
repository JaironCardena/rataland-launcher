package com.rataland.menu.fondo;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

/**
 * Motor de los fondos animados: dibuja una escena descrita en assets/rataland/escenas/*.json
 * (la genera tools/arte.js). Es el mismo motor que src/renderer/fondo-animado.js en el launcher;
 * la prueba MotorFondoTest comprueba que los dos dibujan exactamente lo mismo.
 *
 * Usa StrictMath para que las cuentas den los mismos decimales que en JavaScript.
 */
public final class MotorFondo {
	private static final double VUELTA = 6.283;

	private final String clave;
	private final int ancho;
	private final int alto;
	private final int escala;
	private final String sonido;
	private final Map<String, int[]> capas = new LinkedHashMap<>();
	private final Map<String, double[]> vaivenes = new LinkedHashMap<>();
	private final List<Elemento> elementos = new ArrayList<>();

	public MotorFondo(JsonObject escena) {
		clave = escena.get("clave").getAsString();
		ancho = escena.get("ancho").getAsInt();
		alto = escena.get("alto").getAsInt();
		escala = escena.has("escala") ? escena.get("escala").getAsInt() : 1;
		sonido = escena.has("sonido") ? escena.get("sonido").getAsString() : null;
		for (Map.Entry<String, JsonElement> c : escena.getAsJsonObject("capas").entrySet()) {
			JsonObject capa = c.getValue().getAsJsonObject();
			capas.put(c.getKey(), new int[] {capa.get("ancho").getAsInt(), capa.get("alto").getAsInt()});
		}
		if (escena.has("vaivenes")) {
			for (Map.Entry<String, JsonElement> v : escena.getAsJsonObject("vaivenes").entrySet()) {
				JsonObject vaiven = v.getValue().getAsJsonObject();
				vaivenes.put(v.getKey(), new double[] {vaiven.get("velocidad").getAsDouble(), vaiven.get("umbral").getAsDouble()});
			}
		}
		for (JsonElement e : escena.getAsJsonArray("elementos")) elementos.add(new Elemento(e.getAsJsonObject()));
	}

	public String clave() {
		return clave;
	}

	public int ancho() {
		return ancho;
	}

	public int alto() {
		return alto;
	}

	/** Las capas están guardadas a esta escala (2 = el doble de píxeles que la escena). */
	public int escala() {
		return escala;
	}

	/** Sonido ambiente de la escena (null = ninguno). */
	public String sonido() {
		return sonido;
	}

	/** Capas de imagen con su tamaño en píxeles de la escena. */
	public Map<String, int[]> capas() {
		return capas;
	}

	/** Dibuja lo que se mueve en el instante t (segundos). */
	public void dibujar(Pincel p, double t) {
		for (Elemento e : elementos) e.dibujar(p, t);
	}

	/** Sonidos que tocan entre t0 (sin incluir) y t1: por ahora, el «plop» cuando pica el pez. */
	public void eventos(double t0, double t1, Consumer<String> alEvento) {
		for (Elemento e : elementos) {
			if (!e.tipo.equals("corcho") || !e.d.has("evento")) continue;
			double cada = num(e.d, "cada");
			double desfase = num(e.d, "desfase");
			for (double k = StrictMath.floor((t0 + desfase) / cada) + 1; k * cada - desfase <= t1; k++) alEvento.accept(e.d.get("evento").getAsString());
		}
	}

	/* ---------- Utilidades (las mismas que en JavaScript) ---------- */

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

	private static double azar(double n) {
		double x = StrictMath.sin(n * 12.9898) * 43758.5453;
		return x - StrictMath.floor(x);
	}

	private static int redondear(double x) {
		return (int) Math.round(x);
	}

	private static double num(JsonObject o, String clave) {
		return o.get(clave).getAsDouble();
	}

	private static int entero(JsonObject o, String clave) {
		return o.get(clave).getAsInt();
	}

	private static int color(JsonObject o, String clave) {
		return color(o.get(clave).getAsString());
	}

	private static int color(String hex) {
		return Integer.parseInt(hex.substring(1), 16);
	}

	private static double[] lista(JsonObject o, String clave) {
		JsonArray a = o.getAsJsonArray(clave);
		double[] r = new double[a.size()];
		for (int i = 0; i < r.length; i++) r[i] = a.get(i).getAsDouble();
		return r;
	}

	private int vaiven(String nombre, double t) {
		double[] v = nombre == null ? null : vaivenes.get(nombre);
		return v != null && StrictMath.sin(t * v[0]) > v[1] ? 1 : 0;
	}

	private static void circulo(Pincel p, int cx, int cy, int r, int rgb, double alfa) {
		for (int dy = -r; dy <= r; dy++) {
			int m = (int) StrictMath.floor(StrictMath.sqrt(r * r - dy * dy));
			p.rect(cx - m, cy + dy, m * 2 + 1, 1, rgb, alfa);
		}
	}

	/* ---------- Elementos de la escena ---------- */

	private final class Elemento {
		final JsonObject d;
		final String tipo;
		final String mece;
		/** Posiciones fijas: estrellas {x, y, v, f, grande}, destellos {x, y, w, v, f}, luciérnagas {x, y, v, f0..f3}. */
		final List<double[]> datos = new ArrayList<>();

		Elemento(JsonObject d) {
			this.d = d;
			tipo = d.get("tipo").getAsString();
			mece = d.has("mece") ? d.get("mece").getAsString() : null;
			Aleatorio rnd = new Aleatorio(d.has("semilla") ? d.get("semilla").getAsLong() : 1);
			double[] zona = d.has("zona") ? lista(d, "zona") : new double[4];
			int n = d.has("n") ? entero(d, "n") : 0;
			switch (tipo) {
				case "estrellas" -> {
					double[] evitar = d.has("evitar") ? lista(d, "evitar") : null;
					for (int intento = 0; datos.size() < n && intento < n * 50; intento++) {
						double x = zona[0] + StrictMath.floor(rnd.siguiente() * zona[2]);
						double y = zona[1] + StrictMath.floor(rnd.siguiente() * zona[3]);
						double v = 0.6 + rnd.siguiente() * 1.4;
						double f = rnd.siguiente() * VUELTA;
						boolean grande = rnd.siguiente() < num(d, "grandes");
						if (evitar != null && (x - evitar[0]) * (x - evitar[0]) + (y - evitar[1]) * (y - evitar[1]) < evitar[2] * evitar[2]) continue;
						datos.add(new double[] {x, y, v, f, grande ? 1 : 0});
					}
				}
				case "destellos" -> {
					List<double[]> evitar = new ArrayList<>();
					if (d.has("evitar")) {
						for (JsonElement r : d.getAsJsonArray("evitar")) {
							JsonArray a = r.getAsJsonArray();
							evitar.add(new double[] {a.get(0).getAsDouble(), a.get(1).getAsDouble(), a.get(2).getAsDouble(), a.get(3).getAsDouble()});
						}
					}
					for (int intento = 0; datos.size() < n && intento < n * 50; intento++) {
						double x = zona[0] + StrictMath.floor(rnd.siguiente() * zona[2]);
						double y = zona[1] + StrictMath.floor(rnd.siguiente() * zona[3]);
						double w = 2 + StrictMath.floor(rnd.siguiente() * 4);
						double v = 0.5 + rnd.siguiente();
						double f = rnd.siguiente() * VUELTA;
						boolean tapado = false;
						for (double[] r : evitar) tapado |= x < r[0] + r[2] && x + w > r[0] && y >= r[1] && y < r[1] + r[3];
						if (!tapado) datos.add(new double[] {x, y, w, v, f});
					}
				}
				case "luciernagas" -> {
					for (int i = 0; i < n; i++) {
						double x = zona[0] + rnd.siguiente() * zona[2];
						double y = zona[1] + rnd.siguiente() * zona[3];
						double v = 0.7 + rnd.siguiente() * 0.6;
						double f0 = rnd.siguiente() * VUELTA;
						double f1 = rnd.siguiente() * VUELTA;
						double f2 = rnd.siguiente() * VUELTA;
						double f3 = rnd.siguiente() * VUELTA;
						datos.add(new double[] {x, y, v, f0, f1, f2, f3});
					}
				}
				default -> { }
			}
		}

		void dibujar(Pincel p, double t) {
			switch (tipo) {
				case "estrellas" -> estrellas(p, t);
				case "fugaz" -> fugaz(p, t);
				case "capa" -> capa(p, t);
				case "reflejo" -> reflejo(p, t);
				case "destellos" -> destellos(p, t);
				case "sombra" -> sombra(p, t);
				case "corcho" -> corcho(p, t);
				case "farol" -> farol(p, t);
				case "luciernagas" -> luciernagas(p, t);
				default -> { }
			}
		}

		private void estrellas(Pincel p, double t) {
			int rgb = color(d, "color");
			for (double[] s : datos) {
				int x = (int) s[0];
				int y = (int) s[1];
				double k = 0.5 + 0.5 * StrictMath.sin(t * s[2] + s[3]);
				p.rect(x, y, 1, 1, rgb, 0.15 + 0.85 * k * k);
				if (s[4] > 0 && k > 0.85) {
					double a = (k - 0.85) / 0.15 * 0.5;
					p.rect(x - 1, y, 1, 1, rgb, a);
					p.rect(x + 1, y, 1, 1, rgb, a);
					p.rect(x, y - 1, 1, 1, rgb, a);
					p.rect(x, y + 1, 1, 1, rgb, a);
				}
			}
		}

		private void fugaz(Pincel p, double t) {
			double cada = num(d, "cada");
			double desfase = num(d, "desfase");
			double n = StrictMath.floor((t + desfase) / cada);
			double u = ((t + desfase) - n * cada) / num(d, "dura");
			if (u >= 1) return;
			double[] zona = lista(d, "zona");
			double[] recorrido = lista(d, "recorrido");
			double largo = StrictMath.sqrt(recorrido[0] * recorrido[0] + recorrido[1] * recorrido[1]);
			double cx = zona[0] + azar(n) * zona[2] + u * recorrido[0];
			double cy = zona[1] + azar(n + 0.5) * zona[3] + u * recorrido[1];
			double brillo = StrictMath.sin(Math.PI * u);
			int estela = entero(d, "estela");
			int rgb = color(d, "color");
			for (int i = 0; i < estela; i++) {
				p.rect(redondear(cx - recorrido[0] / largo * i), redondear(cy - recorrido[1] / largo * i), 1, 1, rgb, brillo * (1 - i / (double) estela));
			}
		}

		private void capa(Pincel p, double t) {
			String nombre = d.get("nombre").getAsString();
			int[] tam = capas.get(nombre);
			int x = entero(d, "x");
			int y = entero(d, "y");
			if (d.has("desliza")) {
				int desp = (int) StrictMath.floor(t * num(d, "desliza")) % ancho;
				p.capa(nombre, x - desp, y, tam[0], tam[1]);
				p.capa(nombre, x - desp + ancho, y, tam[0], tam[1]);
			} else {
				p.capa(nombre, x, y + vaiven(mece, t), tam[0], tam[1]);
			}
		}

		private void reflejo(Pincel p, double t) {
			int desde = entero(d, "desde");
			int hasta = entero(d, "hasta");
			int x = entero(d, "x");
			double medida = num(d, "ancho");
			int rgb = color(d, "color");
			int brillo = color(d, "brillo");
			for (int y = desde; y < hasta; y += 2) {
				if (StrictMath.sin(t * 1.9 + y * 1.7) > 0.8) continue;
				double dd = (y - desde) / (double) (hasta - desde);
				int media = Math.max(1, redondear(medida - dd * 4 + 1.6 * StrictMath.sin(t * 1.6 + y * 0.8)));
				int cx = x + redondear(1.5 * StrictMath.sin(t * 1.1 + y * 0.45));
				double a = 0.5 * (1 - dd * 0.75);
				p.rect(cx - media, y, media * 2, 1, rgb, a);
				if (media > 3) p.rect(cx - 1 + redondear(StrictMath.sin(t * 2.3 + y)), y, 2, 1, brillo, a);
			}
		}

		private void destellos(Pincel p, double t) {
			int rgb = color(d, "color");
			for (double[] g : datos) {
				double k = 0.5 + 0.5 * StrictMath.sin(t * g[3] + g[4]);
				p.rect((int) g[0] + redondear(StrictMath.sin(t * 0.6 + g[4]) * 1.5), (int) g[1], (int) g[2], 1, rgb, 0.1 + 0.35 * k);
			}
		}

		private void sombra(Pincel p, double t) {
			int baja = vaiven(mece, t);
			int filas = entero(d, "filas");
			int rgb = color(d, "color");
			for (int k = 0; k < filas; k++) {
				int x = entero(d, "x") + k + redondear(StrictMath.sin(t * 1.5 + k * 1.3));
				p.rect(x, entero(d, "y") + baja + k, entero(d, "ancho") - k * 2, 1, rgb, 0.3 * (1 - k / (double) filas));
			}
		}

		private void corcho(Pincel p, double t) {
			int x = entero(d, "x");
			int agua = entero(d, "agua");
			boolean pica = (t + num(d, "desfase")) % num(d, "cada") < num(d, "pica");
			int baja = pica ? 2 : StrictMath.sin(t * 2.4) > 0.4 ? 1 : 0;

			JsonObject o = d.getAsJsonObject("ondas");
			double cadaOnda = num(o, "cada");
			int rgbOnda = color(o, "color");
			Set<Double> vistos = new HashSet<>();
			for (double desfase : new double[] {0, cadaOnda / 2}) {
				double edad = ((t + desfase) % cadaOnda) / cadaOnda;
				double r = 2 + edad * num(o, "radio");
				long pasos = Math.round(r * 5);
				for (int i = 0; i < pasos; i++) {
					int px = redondear(x + 0.5 + r * StrictMath.cos(i / (double) pasos * VUELTA));
					int py = redondear(agua + r * num(o, "aplasta") * StrictMath.sin(i / (double) pasos * VUELTA));
					if (!vistos.add(desfase * 100000 + px * 1000 + py)) continue;
					p.rect(px, py, 1, 1, rgbOnda, (1 - edad) * num(o, "alfa"));
				}
			}

			JsonObject s = d.getAsJsonObject("sedal");
			double[] desde = lista(s, "desde");
			int px = (int) desde[0];
			int py = (int) desde[1] + vaiven(s.has("mece") ? s.get("mece").getAsString() : null, t);
			int fy = entero(d, "y") + baja;
			int tramos = Math.max(Math.abs(x - px), Math.abs(fy - py));
			int rgbSedal = color(s, "color");
			for (int i = 1; i < tramos; i++) {
				p.rect(redondear(px + (x - px) * i / (double) tramos), redondear(py + (fy - py) * i / (double) tramos), 1, 1, rgbSedal, num(s, "alfa"));
			}
			JsonArray colores = d.getAsJsonArray("colores");
			if (fy < agua) p.rect(x, fy, 2, 1, color(colores.get(0).getAsString()), 1);
			if (fy + 1 < agua) p.rect(x, fy + 1, 2, 1, color(colores.get(1).getAsString()), 1);
		}

		private void farol(Pincel p, double t) {
			int baja = vaiven(mece, t);
			int x = entero(d, "x");
			int y = entero(d, "y");
			int rgb = color(d, "color");
			double[] radios = lista(d, "radios");
			JsonArray llamas = d.getAsJsonArray("llama");
			double llama = 0.5 + 0.25 * StrictMath.sin(t * 7.3) + 0.25 * StrictMath.sin(t * 11.1 + 1);
			circulo(p, x + 1, y + 2 + baja, (int) radios[0], rgb, 0.04 + 0.03 * llama);
			circulo(p, x + 1, y + 2 + baja, (int) radios[1], rgb, 0.06 + 0.05 * llama);
			p.rect(x, y + baja, 2, 4, color(llamas.get(llama > 0.6 ? 1 : 0).getAsString()), 1);
			double[] reflejo = lista(d, "reflejo");
			int desde = (int) reflejo[0];
			int hasta = (int) reflejo[1];
			for (int yy = desde; yy < hasta; yy += 2) {
				int w = StrictMath.sin(t * 2 + yy) > 0 ? 3 : 2;
				p.rect(x + redondear(StrictMath.sin(t * 1.7 + yy * 0.9)), yy, w, 1, rgb,
						0.3 * (1 - (yy - desde) / (double) (hasta - desde)) * (0.6 + 0.4 * llama));
			}
		}

		private void luciernagas(Pincel p, double t) {
			int rgb = color(d, "color");
			int brillo = color(d, "brillo");
			for (double[] l : datos) {
				int x = redondear(l[0] + 7 * StrictMath.sin(t * 0.37 * l[2] + l[3]) + 3 * StrictMath.sin(t * 0.9 * l[2] + l[4]));
				int y = redondear(l[1] + 4 * StrictMath.sin(t * 0.53 * l[2] + l[5]));
				double s = Math.max(0, StrictMath.sin(t * 1.1 * l[2] + l[6]));
				double b = s * s;
				p.rect(x - 1, y - 1, 3, 3, rgb, 0.22 * b);
				p.rect(x, y, 1, 1, brillo, 0.12 + 0.88 * b);
			}
		}
	}
}
