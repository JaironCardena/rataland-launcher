package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.ConnectScreen;

/**
 * Solo para pruebas (-Drataland.captura=true): después de la pausa, prueba «Entrando en RataLand»
 * con una dirección que no contesta y, tras cancelar, «No se pudo entrar» con una que rechaza.
 */
public final class Prueba {
	private Prueba() {}

	/** Una dirección que no contesta (la conexión se queda esperando) y otra que la rechaza. */
	private static final String SIN_RESPUESTA = "10.255.255.1:25565";
	private static final String RECHAZA = "127.0.0.1:1";

	private static int fase;
	private static String capturaPendiente;
	private static Runnable despuesDeCapturar;

	/**
	 * Captura entre dos fotogramas (en el tick del juego), con todo lo que se dibuja encima de la
	 * pantalla, como los avisos; luego sigue con `despues`.
	 */
	public static void alSiguienteTick(String nombre, Runnable despues) {
		capturaPendiente = nombre;
		despuesDeCapturar = despues;
	}

	/** Cada tick del juego (solo hace algo en las pruebas). */
	public static void tick(Minecraft juego) {
		if (capturaPendiente == null) return;
		Screenshot.grab(juego.gameDirectory, capturaPendiente, juego.getMainRenderTarget(), t -> {});
		capturaPendiente = null;
		Runnable despues = despuesDeCapturar;
		despuesDeCapturar = null;
		if (despues != null) despues.run();
	}

	/** ¿Aún no ha empezado la parte de la conexión? (el menú solo se captura la primera vez) */
	public static boolean alPrincipio() {
		return fase == 0;
	}

	public static void despuesDeLaPausa(PausaRataLand pausa) {
		Minecraft juego = Minecraft.getInstance();
		MenuRataLand menu = new MenuRataLand();
		juego.setScreen(menu);
		fase = 1;
		Conexion.conectar(menu, SIN_RESPUESTA);
	}

	/** Desde la pantalla de conexión, tras unos fotogramas. */
	public static void conectando(ConnectScreen pantalla) {
		if (fase != 1) return;
		fase = 2;
		Minecraft juego = Minecraft.getInstance();
		Screenshot.grab(juego.gameDirectory, "rataland-conectando.png", juego.getMainRenderTarget(), t -> {});
		RataLand.LOG.info("Prueba: al conectar se muestra la tarjeta «Entrando en {}»", RataLand.nombre);
		// Cancelar (como el jugador) y probar una dirección que rechaza la conexión
		for (GuiEventListener hijo : pantalla.children()) {
			if (hijo instanceof Button boton) boton.onPress();
		}
		if (juego.screen instanceof MenuRataLand menu) Conexion.conectar(menu, RECHAZA);
	}
}
