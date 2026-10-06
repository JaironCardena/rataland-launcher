package com.rataland.menu;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.List;
import net.minecraft.server.packs.resources.IoSupplier;

/** Iconos de la ventana del juego (barra de título y barra de tareas). */
public final class Iconos {
	private static final int[] TAMANOS = {32, 64, 128, 256};

	private Iconos() {}

	public static List<IoSupplier<InputStream>> lista() {
		return java.util.Arrays.stream(TAMANOS).<IoSupplier<InputStream>>mapToObj(tamano -> () -> {
			String ruta = "/assets/rataland/icons/icono_" + tamano + ".png";
			InputStream entrada = Iconos.class.getResourceAsStream(ruta);
			if (entrada == null) throw new FileNotFoundException(ruta);
			return entrada;
		}).toList();
	}
}
