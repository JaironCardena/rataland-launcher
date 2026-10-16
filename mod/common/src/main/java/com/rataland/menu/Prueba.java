package com.rataland.menu;

import net.minecraft.advancements.Advancement;
import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.advancements.AdvancementNode;
import net.minecraft.advancements.AdvancementProgress;
import net.minecraft.advancements.AdvancementTree;
import net.minecraft.advancements.AdvancementType;
import net.minecraft.advancements.DisplayInfo;
import net.minecraft.advancements.TreeNodePosition;
import net.minecraft.advancements.triggers.CriteriaTriggers;
import net.minecraft.advancements.triggers.Criterion;
import net.minecraft.advancements.triggers.ImpossibleTrigger;
import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.core.ClientAsset;
import net.minecraft.world.item.ItemStackTemplate;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.components.toasts.TutorialToast;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.achievement.StatsScreen;
import net.minecraft.client.gui.screens.advancements.AdvancementsScreen;
import net.minecraft.client.multiplayer.ClientAdvancements;
import net.minecraft.client.telemetry.TelemetryEventSender;
import net.minecraft.client.telemetry.WorldSessionTelemetryManager;
import net.minecraft.network.protocol.game.ClientboundUpdateAdvancementsPacket;
import net.minecraft.resources.Identifier;
import net.minecraft.stats.StatsCounter;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.ItemLike;
import net.minecraft.client.resources.DefaultPlayerSkin;
import net.minecraft.core.UUIDUtil;
import net.minecraft.network.chat.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Solo para pruebas (-Drataland.captura=true): después de la pausa, la pantalla de muerte y la lista
 * de jugadores (Tab) con jugadores de ejemplo, Progresos con logros de ejemplo y Estadísticas; luego
 * prueba «Entrando en RataLand» con una dirección que no contesta; tras cancelar, una que rechaza (como
 * el servidor dormido: lleva a la sala de espera), el reintento solo desde la sala, «Volver al menú» y
 * «No se pudo entrar» tras esperar sin que abra.
 */
public final class Prueba {
	private Prueba() {}

	/** Captura solo Tab, sin seguir hacia las pruebas de conexión. */
	public static final boolean SOLO_TAB = Boolean.getBoolean("rataland.captura.tab");

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
		Screenshot.grab(juego.gameDirectory, capturaPendiente, juego.gameRenderer.mainRenderTarget(), 1, t -> {});
		capturaPendiente = null;
		Runnable despues = despuesDeCapturar;
		despuesDeCapturar = null;
		if (despues != null) despues.run();
	}

	/** ¿Aún no ha empezado la parte de la conexión? (el menú solo se captura la primera vez) */
	public static boolean alPrincipio() {
		return fase == 0;
	}

	/**
	 * La lista de jugadores (Tab) con jugadores de ejemplo, sobre el fondo: primero unos pocos (con sus
	 * corazones) y luego muchos (en dos columnas, con la vida en corto); tras capturarlas sigue con Progresos.
	 */
	public static final class Tabla extends Screen {
		private final List<TablaJugadores.Fila> filas;
		private final String captura;
		private final Runnable despues;
		private int fotogramas;

		public Tabla() {
			this(List.of(
					fila("Probador", 32, false, true, 20),
					fila("Rata_Gamer", 85, false, false, 13),
					fila("Ratoncita", 210, false, false, 5),
					fila("Supansinho", 420, false, false, 24),
					fila("QuesoMaster", 64, true, false, 20),
					fila("Ratatouille", 140, false, false, -1)),
					"rataland-tab.png", () -> Minecraft.getInstance().gui.setScreen(new Tabla(muchos(), "rataland-tab-lleno.png",
							SOLO_TAB ? () -> Minecraft.getInstance().stop() : () -> Minecraft.getInstance().gui.setScreen(new Logro()))));
		}

		private Tabla(List<TablaJugadores.Fila> filas, String captura, Runnable despues) {
			super(Component.literal("Prueba de la lista de jugadores"));
			this.filas = filas;
			this.captura = captura;
			this.despues = despues;
		}

		@Override
		protected void init() {
			// Sin los avisos de ejemplo de la pausa, que taparían la lista; con pocos, un consejo de jugador nuevo
			this.minecraft.gui.toastManager().clear();
			if (this.filas.size() > 10) return;
			TutorialToast consejo = new TutorialToast(this.font, TutorialToast.Icons.MOVEMENT_KEYS, Component.literal("Muévete"), Component.literal("Usa W, A, S y D"), true);
			consejo.updateProgress(0.4f);
			this.minecraft.gui.toastManager().addToast(consejo);
		}

		@Override
		public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
			super.extractRenderState(g, mouseX, mouseY, delta);
			TablaJugadores.dibujar(g, this.font, this.width, Component.literal("¡Bienvenidos a RataLand!"), Component.literal("Episodio 2 este domingo"), this.filas);
			if (++this.fotogramas == 40) alSiguienteTick(this.captura, this.despues);
		}

		private static List<TablaJugadores.Fila> muchos() {
			String[] nombres = {"Probador", "Rata_Gamer", "Ratoncita", "Supansinho", "QuesoMaster", "Ratatouille", "MilTon", "SrChrisGamer",
					"Ra1n", "QuesoAzul", "La_Madriguera", "Bigotes", "Roedor99", "Colita", "Gruyere", "Pinky_Rat"};
			int[] vidas = {20, 13, 5, 24, 20, -1, 18, 9, 20, 16, 1, 0, 11, 20, 7, 14};
			List<TablaJugadores.Fila> lista = new java.util.ArrayList<>();
			for (int i = 0; i < nombres.length; i++) lista.add(fila(nombres[i], 30 + i * 23, i == 4, i == 0, vidas[i]));
			return lista;
		}

		private static TablaJugadores.Fila fila(String nombre, int ping, boolean espectador, boolean yo, int vida) {
			Integer muertes = vida < 0 ? null : yo ? 7 : espectador ? 0 : ping / 20;
			return new TablaJugadores.Fila(Component.literal(nombre), DefaultPlayerSkin.get(UUIDUtil.createOfflinePlayerUUID(nombre)), ping, espectador, yo, null, vida, muertes);
		}
	}

	/** El cartel de logros del centro, con un desafío de otro jugador llegado por el chat, sobre el paisaje. */
	public static final class Logro extends Screen {
		private int fotogramas;

		public Logro() {
			super(Component.literal("Prueba del cartel de logros"));
		}

		@Override
		protected void init() {
			this.minecraft.gui.toastManager().clear();
			Logros.ejemplo();
		}

		@Override
		public void extractBackground(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
			// Como en el juego: el mundo detrás, sin desenfocar
			Fondo.dibujar(g, this.width, this.height);
		}

		@Override
		public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
			super.extractRenderState(g, mouseX, mouseY, delta);
			Logros.dibujar(g, this.width, this.height, true);
			if (++this.fotogramas == 50) alSiguienteTick("rataland-logro.png", Prueba::progresos);
		}
	}

	/** Progresos con logros de ejemplo: dos pestañas, unos conseguidos y otros no. */
	public static void progresos() {
		try {
			progresosDeEjemplo();
		} catch (RuntimeException e) {
			// Desde 26.1 los objetos (los iconos de los logros) solo existen dentro de un mundo: sin él,
			// al menos se cargan las clases, para ver que los mixins de Progresos encajan
			RataLand.LOG.info("Prueba: Progresos necesita un mundo; se cargan {}, {} y {} sin dibujarlos", AdvancementsScreen.class.getSimpleName(),
					net.minecraft.client.gui.screens.advancements.AdvancementWidget.class.getSimpleName(),
					net.minecraft.client.gui.screens.advancements.AdvancementTab.class.getSimpleName());
			estadisticas();
		}
	}

	private static void progresosDeEjemplo() {
		Minecraft juego = Minecraft.getInstance();
		Criterion<ImpossibleTrigger.TriggerInstance> nunca = CriteriaTriggers.IMPOSSIBLE.createCriterion(new ImpossibleTrigger.TriggerInstance());
		AdvancementHolder raiz = logro(null, "raiz", Items.GOLDEN_PICKAXE, "RataLand", "La temporada 1", "stone", AdvancementType.TASK, nunca);
		AdvancementHolder queso = logro(raiz, "queso", Items.GOLD_NUGGET, "Primer queso", "Encuentra una veta de queso", null, AdvancementType.TASK, nunca);
		AdvancementHolder mina = logro(queso, "mina", Items.MINECART, "Minero de queso", "Saca una vagoneta llena", null, AdvancementType.GOAL, nunca);
		AdvancementHolder rey = logro(mina, "rey", Items.GOLD_BLOCK, "Rey del queso", "Guarda mil quesos", null, AdvancementType.CHALLENGE, nunca);
		AdvancementHolder casa = logro(raiz, "casa", Items.OAK_DOOR, "Una madriguera", "Construye tu casa", null, AdvancementType.TASK, nunca);
		AdvancementHolder cloacas = logro(null, "cloacas", Items.MOSSY_COBBLESTONE, "Las cloacas", "Lo que hay bajo la ciudad", "nether", AdvancementType.TASK, nunca);
		AdvancementHolder rata = logro(cloacas, "rata", Items.RABBIT_HIDE, "Rata de cloaca", "Baja a las cloacas", null, AdvancementType.TASK, nunca);
		List<AdvancementHolder> todos = List.of(raiz, queso, mina, rey, casa, cloacas, rata);
		// Las posiciones en el árbol las calcula Minecraft como en el servidor
		AdvancementTree arbol = new AdvancementTree();
		arbol.addAll(todos);
		for (AdvancementNode nodo : arbol.roots()) TreeNodePosition.run(nodo);
		List<ClientboundUpdateAdvancementsPacket.PositionedAdvancement> colocados = todos.stream()
				.map((h) -> ClientboundUpdateAdvancementsPacket.PositionedAdvancement.fromNode(arbol.get(h))).toList();
		Map<Identifier, AdvancementProgress> progreso = new HashMap<>();
		for (AdvancementHolder hecho : List.of(raiz, queso, mina, casa, cloacas)) {
			AdvancementProgress p = new AdvancementProgress();
			p.update(hecho.value().requirements());
			p.grantProgress("hecho");
			progreso.put(hecho.id(), p);
		}
		ClientAdvancements avances = new ClientAdvancements(juego, new WorldSessionTelemetryManager(TelemetryEventSender.DISABLED, false, null, null, UUID.randomUUID()));
		avances.update(new ClientboundUpdateAdvancementsPacket(true, colocados, Set.of(), progreso, false));
		juego.gui.setScreen(new AdvancementsScreen(avances));
	}

	private static AdvancementHolder logro(AdvancementHolder padre, String id, ItemLike icono, String titulo, String texto, String fondo,
			AdvancementType tipo, Criterion<?> criterio) {
		Advancement.Builder b = Advancement.Builder.advancement();
		if (padre != null) b.parent(padre);
		b.display(new DisplayInfo(new ItemStackTemplate(icono.asItem()), Component.literal(titulo), Component.literal(texto),
				fondo == null ? Optional.empty() : Optional.of(new ClientAsset.ResourceTexture(Identifier.withDefaultNamespace("gui/advancements/backgrounds/" + fondo))),
				tipo, true, false, false));
		b.addCriterion("hecho", criterio);
		return b.build(Identifier.fromNamespaceAndPath(RataLand.MOD_ID, "prueba/" + id));
	}

	/** Estadísticas (sin servidor, con todo a cero); tras capturarla sigue con la conexión. */
	public static void estadisticas() {
		StatsScreen pantalla = new StatsScreen(null, new StatsCounter());
		Minecraft.getInstance().gui.setScreen(pantalla);
		pantalla.onStatsUpdated();
	}

	public static void despuesDeLaPausa() {
		Minecraft juego = Minecraft.getInstance();
		MenuRataLand menu = new MenuRataLand();
		juego.gui.setScreen(menu);
		fase = 1;
		Conexion.conectar(menu, SIN_RESPUESTA);
	}

	/** Desde la pantalla de conexión, tras unos fotogramas. */
	public static void conectando(ConnectScreen pantalla) {
		Minecraft juego = Minecraft.getInstance();
		if (fase == 1) {
			fase = 2;
			Screenshot.grab(juego.gameDirectory, "rataland-conectando.png", juego.gameRenderer.mainRenderTarget(), 1, t -> {});
			RataLand.LOG.info("Prueba: al conectar se muestra la tarjeta «Entrando en {}»", RataLand.nombre);
			// Cancelar (como el jugador) y probar una dirección que rechaza la conexión
			cancelar(pantalla);
			if (juego.gui.screen() instanceof MenuRataLand menu) Conexion.conectar(menu, RECHAZA);
		} else if (fase == 3) {
			fase = 4;
			Screenshot.grab(juego.gameDirectory, "rataland-espera-intento.png", juego.gameRenderer.mainRenderTarget(), 1, t -> {});
			RataLand.LOG.info("Prueba: el reintento desde la sala de espera se ve como la sala (esperando: {})", SalaEspera.activa());
			cancelar(pantalla);
			RataLand.LOG.info("Prueba: «Volver al menú» durante el reintento lleva a {} (esperando: {})",
					juego.gui.screen() == null ? "nada" : juego.gui.screen().getClass().getSimpleName(), SalaEspera.activa());
			// Y si tras esperar el máximo no abre, se explica
			juego.gui.setScreen(new PantallaDesconectado(Component.translatable("multiplayer.disconnect.server_full"), true));
		}
	}

	private static void cancelar(Screen pantalla) {
		for (GuiEventListener hijo : pantalla.children()) {
			if (hijo instanceof Button boton) boton.onPress(new KeyEvent(InputConstants.KEY_RETURN, 0, 0));
		}
	}

	/** Desde la sala de espera, tras unos fotogramas (solo la primera vez). */
	public static void esperando(PantallaEspera pantalla) {
		if (fase != 2) return;
		RataLand.LOG.info("Prueba: con la conexión rechazada al entrar se muestra la sala de espera");
		alSiguienteTick("rataland-espera.png", null);
	}

	/** El reintento de la sala de espera: a una dirección que no contesta, para ver cómo se ve. */
	public static void reintento(PantallaEspera pantalla) {
		RataLand.LOG.info("Prueba: la sala de espera vuelve a intentar entrar sola");
		fase = 3;
		Conexion.conectar(pantalla, SIN_RESPUESTA);
	}
}
