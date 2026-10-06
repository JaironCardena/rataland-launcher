package com.rataland.menu.fondo;

/** Lo que sabe pintar el motor de fondos: rectángulos de color y capas de imagen (en píxeles de la escena). */
public interface Pincel {
	void rect(int x, int y, int w, int h, int rgb, double alfa);

	void capa(String nombre, int x, int y, int w, int h);
}
