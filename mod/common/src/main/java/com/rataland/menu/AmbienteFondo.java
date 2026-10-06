package com.rataland.menu;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.Util;
import net.minecraft.client.Minecraft;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.client.resources.sounds.SoundInstance;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.sounds.SoundSource;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Random;

/**
 * Sonido ambiente del fondo mientras se ve en los menús, como en el launcher:
 *   - una base de 60 s (agua, viento…) en bucle; se carga entera en memoria, así que empalma sin cortes;
 *   - sonidos sueltos (grillos, gotas, pájaros…) a ratos al azar, con volumen y tono variables.
 * Qué suena en cada fondo está en assets/rataland/ambientes.json (lo genera tools/sonidos.js).
 * Va en la categoría «Ambiente» del juego: cada jugador lo sube, lo baja o lo quita en Opciones.
 */
public final class AmbienteFondo {
	private AmbienteFondo() {}

	/** Volumen de la base; los sueltos van a su volumen (de ambientes.json) por este mismo factor. */
	private static final float VOLUMEN = 0.6f;
	private static final Random AZAR = new Random();

	private static JsonObject datos;
	private static long vistoHasta;
	private static long ultimoIntento;
	private static SoundInstance base;
	private static String escenaSonando;
	private static JsonArray sueltos;
	private static long[] proximos;
	private static boolean sueltoComprobado;

	/** Lo llama Fondo cada vez que dibuja el fondo. */
	public static void visible() {
		vistoHasta = Util.getMillis() + 500;
	}

	/** Un sonido suelto de la escena, como el «plop» cuando pica el pez. */
	public static void evento(String nombre) {
		if (RataLand.sonido) tocar("fondo." + nombre, false, VOLUMEN, 1f);
	}

	/** Cada tick: empieza o para el ambiente según se vea el fondo, y toca los sueltos que tocan. */
	public static void tick(Minecraft juego) {
		long ahora = Util.getMillis();
		boolean seVe = RataLand.sonido && ahora < vistoHasta && juego.level == null;
		if (!seVe) {
			parar(juego);
			return;
		}
		// Si cambió el fondo o el juego cortó el sonido (al recargar recursos), vuelve a empezar.
		// Con el volumen «Ambiente» a cero el juego no lo toca: se reintenta cada 5 s, no en cada tick.
		boolean cortado = base != null && !juego.getSoundManager().isActive(base) && ahora - ultimoIntento > 5000;
		if (escenaSonando == null || !RataLand.escena.equals(escenaSonando) || cortado) empezar(juego, ahora);
		if (sueltos == null) return;
		for (int i = 0; i < sueltos.size(); i++) {
			if (ahora < proximos[i]) continue;
			JsonObject suelto = sueltos.get(i).getAsJsonObject();
			SoundInstance s = tocar("fondo." + suelto.get("grupo").getAsString(), false, VOLUMEN * (float) entre(suelto, "volumen"), (float) entre(suelto, "tono"));
			if (RataLand.MODO_CAPTURA && !sueltoComprobado) {
				sueltoComprobado = true;
				RataLand.LOG.info("Prueba: suelto {} ({})", s.getLocation(), juego.getSoundManager().getSoundEvent(s.getLocation()) != null ? "encontrado" : "NO encontrado");
			}
			proximos[i] = ahora + (long) (entre(suelto, "cada") * 1000);
		}
	}

	private static void empezar(Minecraft juego, long ahora) {
		parar(juego);
		ultimoIntento = ahora;
		escenaSonando = RataLand.escena;
		JsonObject todas = escenas();
		if (todas == null || !todas.has(escenaSonando)) return;
		JsonObject escena = todas.getAsJsonObject(escenaSonando);
		base = tocar("fondo." + escena.get("base").getAsString(), true, VOLUMEN, 1f);
		sueltos = escena.getAsJsonArray("sueltos");
		proximos = new long[sueltos.size()];
		// La primera vez, cada suelto suena antes de lo normal
		for (int i = 0; i < sueltos.size(); i++) {
			JsonArray cada = sueltos.get(i).getAsJsonObject().getAsJsonArray("cada");
			proximos[i] = ahora + (long) (AZAR.nextDouble() * cada.get(1).getAsDouble() * 1000);
		}
		if (RataLand.MODO_CAPTURA) {
			RataLand.LOG.info("Prueba: ambiente {} ({}), {} sueltos", escenaSonando,
					juego.getSoundManager().getSoundEvent(base.getLocation()) != null ? "encontrado" : "NO encontrado", sueltos.size());
		}
	}

	private static void parar(Minecraft juego) {
		if (base != null) juego.getSoundManager().stop(base);
		base = null;
		escenaSonando = null;
		sueltos = null;
	}

	/** Al azar entre los dos valores de la lista `clave` ("cada", "volumen" o "tono"). */
	private static double entre(JsonObject suelto, String clave) {
		JsonArray rango = suelto.getAsJsonArray(clave);
		double a = rango.get(0).getAsDouble();
		return a + AZAR.nextDouble() * (rango.get(1).getAsDouble() - a);
	}

	private static JsonObject escenas() {
		if (datos == null) {
			try (InputStream entrada = AmbienteFondo.class.getResourceAsStream("/assets/rataland/ambientes.json")) {
				datos = entrada == null ? new JsonObject() : JsonParser.parseReader(new InputStreamReader(entrada, StandardCharsets.UTF_8)).getAsJsonObject();
			} catch (Exception e) {
				RataLand.LOG.warn("No se pudo leer ambientes.json: {}", e.toString());
				datos = new JsonObject();
			}
		}
		return datos.has("escenas") ? datos.getAsJsonObject("escenas") : null;
	}

	private static SoundInstance tocar(String nombre, boolean bucle, float volumen, float tono) {
		SoundInstance sonido = new SimpleSoundInstance(ResourceLocation.fromNamespaceAndPath(RataLand.MOD_ID, nombre), SoundSource.AMBIENT,
				volumen, tono, SoundInstance.createUnseededRandom(), bucle, 0, SoundInstance.Attenuation.NONE, 0, 0, 0, true);
		Minecraft.getInstance().getSoundManager().play(sonido);
		return sonido;
	}
}
