package com.rataland.menu.fondo;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * El motor de Java tiene que dibujar exactamente lo mismo que el de JavaScript (launcher y panel).
 * fondos-esperado.json lo genera "node tools/comprobar-fondos.js --guardar" con el motor de JavaScript.
 */
class MotorFondoTest {
	private static JsonObject leer(String ruta) throws Exception {
		try (InputStream entrada = MotorFondoTest.class.getResourceAsStream(ruta)) {
			assertNotNull(entrada, "Falta " + ruta + ": ejecuta node tools/comprobar-fondos.js --guardar");
			return JsonParser.parseReader(new InputStreamReader(entrada, StandardCharsets.UTF_8)).getAsJsonObject();
		}
	}

	@Test
	void dibujaLoMismoQueElLauncher() throws Exception {
		JsonObject esperado = leer("/fondos-esperado.json");
		for (Map.Entry<String, JsonElement> entrada : esperado.entrySet()) {
			String clave = entrada.getKey();
			JsonObject datos = entrada.getValue().getAsJsonObject();
			MotorFondo motor = new MotorFondo(leer("/assets/rataland/escenas/" + clave + ".json"));

			JsonArray tiempos = datos.getAsJsonArray("tiempos");
			JsonArray fotogramas = datos.getAsJsonArray("fotogramas");
			for (int i = 0; i < tiempos.size(); i++) {
				double t = tiempos.get(i).getAsDouble();
				List<Object[]> ops = new ArrayList<>();
				motor.dibujar(new Pincel() {
					@Override
					public void rect(int x, int y, int w, int h, int rgb, double alfa) {
						ops.add(new Object[] {x, y, w, h, String.format("#%06x", rgb), alfa});
					}

					@Override
					public void capa(String nombre, int x, int y, int w, int h) {
						ops.add(new Object[] {nombre, x, y, w, h});
					}
				}, t);
				comparar(clave, t, fotogramas.get(i).getAsJsonArray(), ops);
			}
		}
	}

	private static void comparar(String clave, double t, JsonArray esperados, List<Object[]> obtenidos) {
		int n = Math.min(esperados.size(), obtenidos.size());
		for (int i = 0; i < n; i++) {
			JsonArray e = esperados.get(i).getAsJsonArray();
			Object[] o = obtenidos.get(i);
			boolean igual = e.size() == o.length;
			for (int k = 0; igual && k < o.length; k++) {
				if (o[k] instanceof Double alfa) igual = Math.abs(e.get(k).getAsDouble() - alfa) < 1e-9;
				else if (o[k] instanceof Integer num) igual = e.get(k).getAsDouble() == num;
				else igual = e.get(k).getAsString().equals(o[k]);
			}
			if (!igual) fail(clave + " en t=" + t + ", trazo " + i + ": JavaScript " + e + " y Java " + java.util.Arrays.toString(o));
		}
		assertEquals(esperados.size(), obtenidos.size(), clave + " en t=" + t + ": número de trazos");
	}
}
