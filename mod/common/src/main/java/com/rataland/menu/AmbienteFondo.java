package com.rataland.menu;

import net.minecraft.Util;
import net.minecraft.client.Minecraft;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.client.resources.sounds.SoundInstance;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.sounds.SoundSource;

/**
 * Sonido ambiente del fondo (grillos y agua, goteo en las cloacas…) mientras se ve en los menús.
 * Va en la categoría «Ambiente» del juego, así que cada jugador lo sube, lo baja o lo quita en
 * Opciones > Música y sonido. Los sonidos están en assets/rataland/sounds/fondo (los genera tools/sonidos.js).
 */
public final class AmbienteFondo {
	private AmbienteFondo() {}

	private static long vistoHasta;
	private static SoundInstance sonando;
	private static String escenaSonando;
	private static long ultimoIntento;

	/** Lo llama Fondo cada vez que dibuja el fondo. */
	public static void visible() {
		vistoHasta = Util.getMillis() + 500;
	}

	/** Un sonido suelto de la escena, como el «plop» cuando pica el pez. */
	public static void evento(String nombre) {
		Minecraft.getInstance().getSoundManager().play(sonido("fondo." + nombre, false, 0.7f));
	}

	/** Cada tick: empieza o para el ambiente según se vea el fondo. */
	public static void tick(Minecraft juego) {
		boolean seVe = Util.getMillis() < vistoHasta && juego.level == null;
		if (!seVe) {
			parar(juego);
			return;
		}
		// Si cambió la escena o el juego cortó el sonido (al recargar recursos), vuelve a empezar.
		// Con el volumen «Ambiente» a cero el juego no lo toca: se reintenta cada 5 s, no en cada tick.
		boolean cortado = sonando != null && !juego.getSoundManager().isActive(sonando) && Util.getMillis() - ultimoIntento > 5000;
		if (sonando == null || !RataLand.escena.equals(escenaSonando) || cortado) {
			parar(juego);
			ultimoIntento = Util.getMillis();
			escenaSonando = RataLand.escena;
			sonando = sonido("fondo." + escenaSonando, true, 0.6f);
			juego.getSoundManager().play(sonando);
			if (RataLand.MODO_CAPTURA) {
				RataLand.LOG.info("Prueba: ambiente {} ({})", escenaSonando,
						juego.getSoundManager().getSoundEvent(sonando.getLocation()) != null ? "encontrado" : "NO encontrado");
			}
		}
	}

	private static void parar(Minecraft juego) {
		if (sonando == null) return;
		juego.getSoundManager().stop(sonando);
		sonando = null;
		escenaSonando = null;
	}

	private static SoundInstance sonido(String nombre, boolean bucle, float volumen) {
		return new SimpleSoundInstance(ResourceLocation.fromNamespaceAndPath(RataLand.MOD_ID, nombre), SoundSource.AMBIENT, volumen, 1f,
				SoundInstance.createUnseededRandom(), bucle, 0, SoundInstance.Attenuation.NONE, 0, 0, 0, true);
	}
}
