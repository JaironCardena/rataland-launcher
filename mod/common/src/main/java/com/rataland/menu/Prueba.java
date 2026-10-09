package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.resources.DefaultPlayerSkin;
import net.minecraft.core.UUIDUtil;
import net.minecraft.network.chat.Component;

import java.util.List;

/**
 * Solo para pruebas (-Drataland.captura=true): después de la pausa, la pantalla de muerte y la lista
 * de jugadores (Tab) con jugadores de ejemplo; luego prueba «Entrando en RataLand» con una dirección
 * que no contesta y, tras cancelar, «No se pudo entrar» con una que rechaza.
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

	/** La lista de jugadores (Tab) con jugadores de ejemplo, sobre el fondo; tras capturarla sigue con la conexión. */
	public static final class Tabla extends Screen {
		private int fotogramas;

		public Tabla() {
			super(Component.literal("Prueba de la lista de jugadores"));
		}

		@Override
		protected void init() {
			// Sin los avisos de ejemplo de la pausa, que taparían la lista
			this.minecraft.getToasts().clear();
		}

		@Override
		public void render(GuiGraphics g, int mouseX, int mouseY, float delta) {
			super.render(g, mouseX, mouseY, delta);
			List<TablaJugadores.Fila> filas = List.of(
					fila("Probador", 32, false, true, null),
					fila("Rata_Gamer", 85, false, false, null),
					fila("Ratoncita", 210, false, false, null),
					fila("Supansinho", 420, false, false, null),
					fila("QuesoMaster", 64, true, false, null));
			TablaJugadores.dibujar(g, this.font, this.width, Component.literal("¡Bienvenidos a RataLand!"), Component.literal("Episodio 2 este domingo"), filas);
			if (++this.fotogramas == 40) alSiguienteTick("rataland-tab.png", () -> despuesDeLaPausa());
		}

		private static TablaJugadores.Fila fila(String nombre, int ping, boolean espectador, boolean yo, Component puntos) {
			return new TablaJugadores.Fila(Component.literal(nombre), DefaultPlayerSkin.get(UUIDUtil.createOfflinePlayerUUID(nombre)), ping, espectador, yo, puntos);
		}
	}

	public static void despuesDeLaPausa() {
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
