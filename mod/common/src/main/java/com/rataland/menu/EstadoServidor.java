package com.rataland.menu;

import com.mojang.authlib.GameProfile;
import net.minecraft.Util;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.ServerStatusPinger;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * ¿Está abierto el servidor de la serie y quién hay dentro? Lo pregunta el propio juego mientras se ve
 * el menú principal, cada 30 segundos, igual que el launcher: en Aternos, un servidor apagado o
 * arrancando sigue respondiendo con un aviso en la descripción («Offline», «Starting…»).
 */
public final class EstadoServidor {
	private EstadoServidor() {}

	public enum Estado { CONSULTANDO, ENCENDIDO, ENCENDIENDO, APAGADO, SIN_RESPUESTA }

	private static final long CADA = 30_000;
	private static final long ESPERA_MAXIMA = 10_000;
	private static final Pattern APAGADO = Pattern.compile("offline|apagado|stopping|saving", Pattern.CASE_INSENSITIVE);
	private static final Pattern ENCENDIENDO = Pattern.compile("[●◌]|starting|loading|preparing|queue|waiting|restarting", Pattern.CASE_INSENSITIVE);

	private static final ServerStatusPinger PINGER = new ServerStatusPinger();
	private static volatile Estado estado = Estado.CONSULTANDO;
	private static volatile int conectados;
	private static volatile List<String> nombres = List.of();
	private static long ultimaConsulta;
	private static ServerData consulta;
	private static long inicioConsulta;
	private static volatile boolean respondio;

	public static Estado estado() {
		return estado;
	}

	public static int conectados() {
		return conectados;
	}

	/** Nombres de quien está dentro (los que el servidor enseña, normalmente hasta 12). */
	public static List<String> nombres() {
		return nombres;
	}

	/** Cada tick del juego: atiende las conexiones abiertas de la consulta. */
	public static void tick() {
		PINGER.tick();
		if (consulta != null && (respondio || Util.getMillis() - inicioConsulta > ESPERA_MAXIMA)) terminar();
	}

	/** Mientras se ve el menú: pregunta si hace falta (la primera vez y luego cada 30 s). */
	public static void mantener() {
		long ahora = Util.getMillis();
		if (consulta != null || (ultimaConsulta != 0 && ahora - ultimaConsulta < CADA)) return;
		ultimaConsulta = ahora;
		inicioConsulta = ahora;
		respondio = false;
		ServerData datos = new ServerData(RataLand.nombre, RataLand.direccion(), ServerData.Type.OTHER);
		consulta = datos;
		// La dirección (con el puerto real de Aternos) y el ping se buscan fuera del hilo del juego
		Util.backgroundExecutor().execute(() -> {
			try {
				datos.ip = RataLand.direccionParaConectar();
				PINGER.pingServer(datos, () -> {}, () -> respondio = true);
			} catch (Exception e) {
				RataLand.LOG.info("No se pudo consultar el servidor: {}", e.toString());
			}
		});
	}

	private static void terminar() {
		ServerData datos = consulta;
		consulta = null;
		if (!respondio || datos.motd == null) {
			estado = Estado.SIN_RESPUESTA;
			return;
		}
		String texto = datos.motd.getString().replaceAll("§.", "");
		if (datos.protocol < 0 || APAGADO.matcher(texto).find()) {
			estado = Estado.APAGADO;
		} else if (ENCENDIENDO.matcher(texto).find()) {
			estado = Estado.ENCENDIENDO;
		} else {
			estado = Estado.ENCENDIDO;
		}
		if (datos.players != null) {
			conectados = datos.players.online();
			List<String> lista = new ArrayList<>();
			for (GameProfile perfil : datos.players.sample()) {
				String nombre = perfil.getName();
				// Algunos servidores mandan líneas de texto en vez de jugadores: solo nombres válidos
				if (nombre != null && nombre.toLowerCase(Locale.ROOT).matches("[a-z0-9_]{2,16}")) lista.add(nombre);
			}
			nombres = List.copyOf(lista);
		} else {
			conectados = 0;
			nombres = List.of();
		}
	}
}
