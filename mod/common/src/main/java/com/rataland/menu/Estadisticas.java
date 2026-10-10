package com.rataland.menu;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.ObjectSelectionList;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.Screen;
import org.jetbrains.annotations.Nullable;

/** Estadísticas: marca con queso la pestaña de abajo (General, Objetos o Criaturas) de la lista que se ve. */
public final class Estadisticas {
	private Estadisticas() {}

	/** Las tres pestañas de Minecraft miden 120 de ancho (Hecho, 200). */
	private static final int ANCHO_PESTANA = 120;

	/**
	 * `altoFila` dice qué lista es: General tiene filas de 14, Objetos de 22 y Criaturas de 36
	 * (Minecraft no guarda en ningún otro sitio cuál está abierta).
	 */
	public static void marcarPestana(GuiGraphics g, Screen pantalla, @Nullable ObjectSelectionList<?> lista, int altoFila) {
		if (lista == null) return;
		int elegida = altoFila == 14 ? 0 : altoFila == 22 ? 1 : 2;
		int n = 0;
		for (GuiEventListener hijo : pantalla.children()) {
			if (!(hijo instanceof Button boton) || boton.getWidth() != ANCHO_PESTANA) continue;
			if (n++ != elegida) continue;
			int x = boton.getX();
			int y = boton.getY();
			int w = boton.getWidth();
			int h = boton.getHeight();
			g.renderOutline(x - 1, y - 1, w + 2, h + 2, Estilo.QUESO);
			g.fill(x + 8, y + h + 2, x + w - 8, y + h + 3, Estilo.QUESO);
			return;
		}
	}
}
