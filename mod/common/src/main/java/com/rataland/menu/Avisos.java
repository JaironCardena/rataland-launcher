package com.rataland.menu;

import net.minecraft.Util;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.network.protocol.game.ClientboundPlayerInfoUpdatePacket;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Cuándo sale cada aviso: la cuenta atrás del episodio (a falta de 5 minutos), quién entra al servidor
 * de la serie y la skin que se está poniendo.
 */
public final class Avisos {
	private Avisos() {}

	private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
	/** Al entrar, el servidor manda la lista de todos los que ya están: esos no son «nuevos». */
	private static final long CALMA_AL_ENTRAR = 8000;

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
		juego.getToasts().addToast(AvisoRataLand.queso(titulo, evento + " a las " + hora));
	}

	/** Al terminar de entrar a un servidor. */
	public static void alEntrar() {
		entradaEn = Util.getMillis();
	}

	/** Llegan jugadores nuevos a la lista: aviso de quién entra (solo en el servidor de la serie). */
	public static void jugadores(ClientboundPlayerInfoUpdatePacket paquete, ClientPacketListener red) {
		if (!paquete.actions().contains(ClientboundPlayerInfoUpdatePacket.Action.ADD_PLAYER)) return;
		Minecraft juego = Minecraft.getInstance();
		if (Util.getMillis() - entradaEn < CALMA_AL_ENTRAR || !RataLand.esElServidor(juego.getCurrentServer())) return;
		for (ClientboundPlayerInfoUpdatePacket.Entry entrada : paquete.newEntries()) {
			if (entrada.profile() == null || (juego.player != null && entrada.profileId().equals(juego.player.getUUID()))) continue;
			String nombre = entrada.profile().getName();
			PlayerInfo info = red.getPlayerInfo(entrada.profileId());
			int total = red.getListedOnlinePlayers().size();
			String texto = "Ya sois " + total + " en " + RataLand.nombre;
			juego.getToasts().addToast(AvisoRataLand.jugador(nombre + " ha entrado", texto, info != null ? info.getSkin() : null, nombre));
		}
	}

	/** La skin elegida en el launcher se está poniendo (sin premium, con SkinRestorer). */
	public static void skin() {
		Minecraft.getInstance().getToasts().addToast(AvisoRataLand.listo("Poniendo tu skin", "Los demás la verán en unos segundos"));
	}

	/** Solo en las pruebas: un aviso de cada tipo, para verlos en la captura de la pausa. */
	public static void ejemplos() {
		Minecraft juego = Minecraft.getInstance();
		juego.getToasts().addToast(AvisoRataLand.queso("¡Faltan 5 minutos!", "Episodio 2 a las 20:30"));
		juego.getToasts().addToast(AvisoRataLand.jugador("Rata_Gamer ha entrado", "Ya sois 5 en " + RataLand.nombre, null, "Rata_Gamer"));
		juego.getToasts().addToast(AvisoRataLand.listo("Poniendo tu skin", "Los demás la verán en unos segundos"));
	}
}
