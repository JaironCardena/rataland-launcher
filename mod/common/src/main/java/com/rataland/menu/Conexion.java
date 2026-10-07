package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.resolver.ServerAddress;

import java.util.concurrent.CompletableFuture;

/** Entrar al servidor de la serie: desde el botón Jugar del menú y desde «Reintentar». */
public final class Conexion {
	private Conexion() {}

	private static boolean buscando;
	/** Desde que se pulsa Jugar hasta estar dentro del mundo (o fallar): las pantallas de carga usan el estilo de RataLand. */
	public static boolean entrando;

	/** ¿Está buscando la dirección del servidor (antes de abrir la pantalla de conexión)? */
	public static boolean buscando() {
		return buscando;
	}

	/** Busca la dirección actual del servidor (sin congelar el juego) y se conecta desde `desde`. */
	public static void entrar(Screen desde) {
		if (buscando) return;
		buscando = true;
		Minecraft juego = Minecraft.getInstance();
		CompletableFuture.supplyAsync(RataLand::direccionParaConectar).whenComplete((encontrada, error) -> juego.execute(() -> {
			buscando = false;
			if (juego.screen != desde) return;
			conectar(desde, encontrada != null ? encontrada : RataLand.direccion());
		}));
	}

	/** Se conecta ya a esa dirección («host:puerto»). */
	public static void conectar(Screen desde, String direccion) {
		RataLand.LOG.info("Conectando a {}", direccion);
		entrando = true;
		TarjetaEntrando.nuevoConsejo();
		ServerData info = new ServerData(RataLand.nombre, direccion, ServerData.Type.OTHER);
		ConnectScreen.startConnecting(desde, Minecraft.getInstance(), ServerAddress.parseString(direccion), info, false, null);
	}

	/** Cada tick: ya dentro del mundo (sin pantallas de carga), deja de estar «entrando». */
	public static void tick(Minecraft juego) {
		if (entrando && juego.level != null && juego.screen == null) entrando = false;
	}
}
