package com.rataland.menu;

import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.advancements.AdvancementNode;
import net.minecraft.advancements.AdvancementType;
import net.minecraft.advancements.DisplayInfo;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.HoverEvent;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.minecraft.util.Util;
import net.minecraft.world.item.ItemStack;
import org.jetbrains.annotations.Nullable;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Los logros (progresos, objetivos y desafíos) de todos, como una tarjeta más de los avisos de
 * RataLand (arriba en el centro): el tipo en su color, quién lo ha conseguido, el nombre y el objeto
 * del logro. En vez de la línea del chat y del aviso de Minecraft.
 */
public final class Logros {
	private Logros() {}

	/** Un mismo logro de la misma persona que llega dos veces (el chat y tu propio aviso) es uno solo. */
	private static final long MISMO = 15_000;
	private static final String CLAVE = "chat.type.advancement.";
	private static final Map<String, Long> RECIENTES = new HashMap<>();

	/**
	 * Un mensaje del sistema: si es el de «X ha conseguido el logro [Y]», pasa a los avisos y devuelve
	 * true (no va al chat).
	 */
	public static boolean deChat(Component mensaje) {
		if (!(mensaje.getContents() instanceof TranslatableContents t) || !t.getKey().startsWith(CLAVE) || t.getArgs().length < 2) return false;
		AdvancementType tipo = switch (t.getKey().substring(CLAVE.length())) {
			case "goal" -> AdvancementType.GOAL;
			case "challenge" -> AdvancementType.CHALLENGE;
			default -> AdvancementType.TASK;
		};
		if (!(t.getArgs()[0] instanceof Component quien) || !(t.getArgs()[1] instanceof Component logro)) return false;

		// Quién: el nombre del jugador lleva su UUID (al pasar el ratón) y su nombre sin el del equipo
		UUID id = null;
		String jugador = quien.getString();
		if (quien.getStyle().getHoverEvent() instanceof HoverEvent.ShowEntity entidad) {
			id = entidad.entity().uuid;
			if (entidad.entity().name.isPresent()) jugador = entidad.entity().name.get().getString();
		}

		// El logro viene entre corchetes; dentro, su título
		Component dentro = logro;
		if (logro.getContents() instanceof TranslatableContents corchetes && corchetes.getArgs().length == 1 && corchetes.getArgs()[0] instanceof Component c) {
			dentro = c;
		}
		String titulo = dentro.getString();

		Minecraft juego = Minecraft.getInstance();
		boolean yo = juego.player != null && (id != null ? id.equals(juego.player.getUUID()) : jugador.equalsIgnoreCase(juego.player.getGameProfile().name()));
		poner(tipo, jugador, yo, titulo, icono(titulo));
		return true;
	}

	/** Tu propio logro (en vez del aviso de Minecraft). */
	public static void deAviso(AdvancementHolder logro) {
		DisplayInfo info = logro.value().display().orElse(null);
		Minecraft juego = Minecraft.getInstance();
		if (info == null || juego.player == null) return;
		poner(info.type(), juego.player.getGameProfile().name(), true, info.title().getString(), crear(info));
	}

	private static void poner(AdvancementType tipo, String jugador, boolean yo, String titulo, @Nullable ItemStack icono) {
		long ahora = Util.getMillis();
		RECIENTES.values().removeIf((cuando) -> ahora - cuando > MISMO);
		String clave = jugador.toLowerCase(Locale.ROOT) + "|" + titulo;
		if (RECIENTES.putIfAbsent(clave, ahora) != null) return;
		Minecraft.getInstance().gui.toastManager().addToast(AvisoRataLand.logro(tipo, jugador, yo, titulo, icono));
	}

	/** El objeto del logro: lo busca por su título entre los logros que conoce el juego. */
	@Nullable
	private static ItemStack icono(String titulo) {
		ClientPacketListener red = Minecraft.getInstance().getConnection();
		if (red == null) return null;
		for (AdvancementNode nodo : red.getAdvancements().tree().nodes()) {
			DisplayInfo info = nodo.holder().value().display().orElse(null);
			if (info != null && info.title().getString().equals(titulo)) return crear(info);
		}
		return null;
	}

	@Nullable
	private static ItemStack crear(DisplayInfo info) {
		try {
			return info.icon().create();
		} catch (RuntimeException e) {
			return null;
		}
	}

	/** Solo en las pruebas: un logro tuyo y un desafío de otro jugador tal como lo manda el servidor por el chat. */
	public static void ejemplo() {
		RECIENTES.clear();
		Minecraft.getInstance().gui.toastManager().addToast(AvisoRataLand.logro(AdvancementType.TASK, "Probador", true, "¿Quién necesita cohetes?", null));
		Component titulo = Component.literal("Cúbreme de netherita");
		Component ayuda = Component.literal("Cúbreme de netherita").withStyle(net.minecraft.ChatFormatting.DARK_PURPLE).append("\n")
				.append(Component.literal("Consigue una armadura completa de netherita"));
		Component logro = net.minecraft.network.chat.ComponentUtils.wrapInSquareBrackets(titulo.copy().withStyle((s) -> s.withHoverEvent(new HoverEvent.ShowText(ayuda))))
				.withStyle(net.minecraft.ChatFormatting.DARK_PURPLE);
		Component mensaje = Component.translatable(CLAVE + "challenge", Component.literal("SrChrisGamer"), logro);
		RataLand.LOG.info("Prueba: el mensaje de logro del chat {} va a los avisos", deChat(mensaje) ? "sí" : "NO");
		// Llega otra vez (como tu propio aviso tras la línea del chat): no se repite
		deChat(mensaje);
		RataLand.LOG.info("Prueba: logros recientes {} (repetido unido)", RECIENTES.size());
	}
}
