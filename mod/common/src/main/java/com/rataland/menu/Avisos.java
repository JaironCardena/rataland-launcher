package com.rataland.menu;

import net.minecraft.util.Util;
import net.minecraft.advancements.Advancement;
import net.minecraft.advancements.AdvancementType;
import com.rataland.menu.mixin.BossHealthOverlayAccessor;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.toasts.AdvancementToast;
import net.minecraft.client.gui.components.toasts.RecipeToast;
import net.minecraft.client.gui.components.toasts.SystemToast;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundPlayerInfoUpdatePacket;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.Items;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cuándo sale cada aviso: la cuenta atrás del episodio (a falta de 5 minutos), quién entra al servidor
 * de la serie y la skin que se está poniendo.
 */
public final class Avisos {
	private Avisos() {}

	private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
	/** Al entrar, el servidor manda la lista de todos los que ya están: esos no son «nuevos». */
	private static final long CALMA_AL_ENTRAR = 8000;
	/**
	 * Para ponerle la skin a alguien (SkinRestorer), el servidor lo quita de la lista y lo vuelve a
	 * añadir al momento: eso no es que haya entrado otra vez.
	 */
	private static final long REAPARECE = 5000;
	private static final Map<UUID, Long> quitados = new HashMap<>();

	private static boolean avisadoEpisodio;
	private static long entradaEn;

	/** Cada tick del juego. */
	public static void tick(Minecraft juego) {
		if (avisadoEpisodio || RataLand.eventoInicio <= 0) return;
		long falta = RataLand.eventoInicio - System.currentTimeMillis();
		if (falta <= 0 || falta > 5 * 60_000) return;
		avisadoEpisodio = true;
		long minutos = Math.max(1, (falta + 59_999) / 60_000);
		String titulo = minutos == 1 ? "¡Falta 1 minuto!" : "¡Faltan " + minutos + " minutos!";
		String evento = RataLand.eventoTitulo.isEmpty() ? "El próximo evento" : RataLand.eventoTitulo;
		String hora = HORA.format(Instant.ofEpochMilli(RataLand.eventoInicio).atZone(ZoneId.systemDefault()));
		juego.gui.toastManager().addToast(AvisoRataLand.queso(titulo, evento + " a las " + hora));
	}

	/**
	 * Desde dónde se ponen los avisos, arriba en el centro: debajo de las barras de jefe (las hordas,
	 * por ejemplo) y de la lista del Tab si se está viendo.
	 */
	public static int arriba() {
		Minecraft juego = Minecraft.getInstance();
		int y = 4;
		int jefes = ((BossHealthOverlayAccessor) juego.gui.hud.getBossOverlay()).rataland$eventos().size();
		if (jefes > 0) y = Math.min(jefes * 19 + 2, juego.getWindow().getGuiScaledHeight() / 3 + 5);
		int tabla = TablaJugadores.abajoSiSeVe();
		if (tabla > 0) y = Math.max(y, tabla + 4);
		return y;
	}

	/** Al terminar de entrar a un servidor. */
	public static void alEntrar() {
		entradaEn = Util.getMillis();
	}

	/** Alguien sale de la lista (porque se va o para ponerle la skin). */
	public static void quitados(List<UUID> ids) {
		long ahora = Util.getMillis();
		quitados.values().removeIf((cuando) -> ahora - cuando > REAPARECE);
		for (UUID id : ids) quitados.put(id, ahora);
	}

	/** Llegan jugadores nuevos a la lista: aviso de quién entra (solo en el servidor de la serie). */
	public static void jugadores(ClientboundPlayerInfoUpdatePacket paquete, ClientPacketListener red) {
		if (!paquete.actions().contains(ClientboundPlayerInfoUpdatePacket.Action.ADD_PLAYER)) return;
		Minecraft juego = Minecraft.getInstance();
		if (Util.getMillis() - entradaEn < CALMA_AL_ENTRAR || !RataLand.esElServidor(juego.getCurrentServer())) return;
		for (ClientboundPlayerInfoUpdatePacket.Entry entrada : paquete.newEntries()) {
			if (entrada.profile() == null || (juego.player != null && entrada.profileId().equals(juego.player.getUUID()))) continue;
			Long quitado = quitados.remove(entrada.profileId());
			if (quitado != null && Util.getMillis() - quitado < REAPARECE) continue;
			String nombre = entrada.profile().name();
			int total = red.getListedOnlinePlayers().size();
			String texto = "Ya sois " + total + " en " + RataLand.nombre;
			juego.gui.toastManager().addToast(AvisoRataLand.jugador(nombre + " ha entrado", texto, entrada.profileId(), nombre));
		}
	}

	/** La skin elegida en el launcher se está poniendo (sin premium, con SkinRestorer). */
	public static void skin() {
		Minecraft.getInstance().gui.toastManager().addToast(AvisoRataLand.listo("Poniendo tu skin", "Los demás la verán en unos segundos"));
	}

	/** Solo en las pruebas: un aviso de cada tipo, para verlos en la captura de la pausa. */
	public static void ejemplos() {
		Minecraft juego = Minecraft.getInstance();
		juego.gui.toastManager().addToast(AvisoRataLand.queso("¡Faltan 5 minutos!", "Episodio 2 a las 20:30"));
		juego.gui.toastManager().addToast(AvisoRataLand.jugador("Rata_Gamer ha entrado", "Ya sois 5 en " + RataLand.nombre, null, "Rata_Gamer"));
		juego.gui.toastManager().addToast(AvisoRataLand.listo("Poniendo tu skin", "Los demás la verán en unos segundos"));
		try {
			juego.gui.toastManager().addToast(new AdvancementToast(Advancement.Builder.advancement()
					.display(Items.GOLDEN_PICKAXE, Component.literal("Minero de queso"), Component.empty(), AdvancementType.GOAL, true, false, false)
					.build(Identifier.fromNamespaceAndPath(RataLand.MOD_ID, "prueba"))));
		} catch (RuntimeException e) {
			// Desde 26.1 los objetos (el icono del logro) solo existen dentro de un mundo
			RataLand.LOG.info("Prueba: el aviso de logro necesita un mundo; se carga sin dibujarlo ({})", AdvancementToast.class.getSimpleName());
		}
		juego.gui.toastManager().addToast(new SystemToast(SystemToast.SystemToastId.PERIODIC_NOTIFICATION, Component.literal("Paquete de recursos"),
				Component.literal("El servidor recomienda uno")));
		// El de recetas necesita un mundo para dibujarse: al menos se carga, para ver que el mixin encaja
		RataLand.LOG.info("Prueba: aviso de recetas cargado ({})", RecipeToast.class.getSimpleName());
	}
}
