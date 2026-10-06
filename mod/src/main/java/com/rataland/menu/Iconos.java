package com.rataland.menu;

import net.minecraft.resource.InputSupplier;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.List;

/** Iconos de la ventana del juego (barra de título y barra de tareas). */
public final class Iconos {
	private static final int[] TAMANOS = {32, 64, 128, 256};

	private Iconos() {}

	public static List<InputSupplier<InputStream>> lista() {
		return java.util.Arrays.stream(TAMANOS).<InputSupplier<InputStream>>mapToObj(tamano -> () -> {
			String ruta = "/assets/rataland/icons/icono_" + tamano + ".png";
			InputStream entrada = Iconos.class.getResourceAsStream(ruta);
			if (entrada == null) throw new FileNotFoundException(ruta);
			return entrada;
		}).toList();
	}
}
