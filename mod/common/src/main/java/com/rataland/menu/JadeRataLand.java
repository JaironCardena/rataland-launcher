package com.rataland.menu;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Jade (el nombre del bloque o la criatura que miras, su vida…) sale por defecto arriba en el centro,
 * justo donde van los avisos de RataLand y los logros. La primera vez se pasa arriba a la izquierda,
 * que está libre (el minimapa va a la derecha). Si después alguien lo cambia en las opciones de Jade,
 * se respeta. Sin Jade no hace nada.
 */
public final class JadeRataLand {
	private JadeRataLand() {}

	private static boolean hecho;

	public static void apartar() {
		if (hecho) return;
		hecho = true;
		Path marca = RataLand.config("rataland-jade.txt");
		if (Files.exists(marca)) return;
		try {
			Class<?> tipoConfig = Class.forName("snownee.jade.api.config.IWailaConfig");
			Class<?> tipoCapa = Class.forName("snownee.jade.api.config.IWailaConfig$Overlay");
			Object config = tipoConfig.getMethod("get").invoke(null);
			Object capa = tipoConfig.getMethod("overlay").invoke(config);
			float x = (float) tipoCapa.getMethod("getOverlayPosX").invoke(capa);
			float y = (float) tipoCapa.getMethod("getOverlayPosY").invoke(capa);
			float anclaX = (float) tipoCapa.getMethod("getAnchorX").invoke(capa);
			// Solo si sigue donde lo pone Jade (arriba en el centro)
			if (Math.abs(x - 0.5f) < 0.01f && y > 0.98f && Math.abs(anclaX - 0.5f) < 0.01f) {
				poner(tipoCapa, capa, "setOverlayPosX", 0.01f);
				poner(tipoCapa, capa, "setAnchorX", 0f);
				tipoConfig.getMethod("save").invoke(config);
				RataLand.LOG.info("Jade pasa arriba a la izquierda (arriba en el centro van los avisos)");
			}
			Files.writeString(marca, "Jade se pasó arriba a la izquierda una vez; cámbialo en sus opciones si lo prefieres en otro sitio.\n");
		} catch (ClassNotFoundException e) {
			// Sin Jade
		} catch (Exception e) {
			RataLand.LOG.warn("No se pudo mover Jade: {}", e.toString());
		}
	}

	private static void poner(Class<?> tipo, Object capa, String metodo, float valor) throws Exception {
		Method m = tipo.getMethod(metodo, float.class);
		m.invoke(capa, valor);
	}
}
