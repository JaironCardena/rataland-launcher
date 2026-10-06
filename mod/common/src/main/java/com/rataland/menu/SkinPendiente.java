package com.rataland.menu;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.ChatFormatting;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Skin elegida en el launcher por un jugador sin premium. El servidor la pone con SkinRestorer
 * ("/skin set web ..."), así que al entrar al servidor de la serie se manda ese comando una vez.
 *
 * El launcher escribe config/rataland-skin.json con {"id", "comando"}; aquí se añade
 * "aplicada" con el mismo id cuando ya se mandó, para no repetirlo en cada entrada.
 */
public final class SkinPendiente {
	/** Espera tras entrar (en ticks) para no pisarse con lo que hace SkinRestorer al conectar. */
	private static final int ESPERA = 60;
	private static int cuentaAtras = -1;

	private SkinPendiente() {
	}

	private static Path archivo() {
		return RataLand.config("rataland-skin.json");
	}

	/** Al terminar de entrar a un servidor. */
	public static void alEntrar() {
		cuentaAtras = ESPERA;
	}

	/** Cada tick del juego. */
	public static void tick(Minecraft client) {
		if (cuentaAtras < 0 || --cuentaAtras > 0) return;
		cuentaAtras = -1;
		if (client.player == null || client.getConnection() == null || !RataLand.esElServidor(client.getCurrentServer())) return;

		Path ruta = archivo();
		if (!Files.exists(ruta)) return;
		try {
			JsonObject json;
			try (Reader lector = Files.newBufferedReader(ruta, StandardCharsets.UTF_8)) {
				json = JsonParser.parseReader(lector).getAsJsonObject();
			}
			if (!json.has("id") || !json.has("comando")) return;
			String id = json.get("id").getAsString();
			if (json.has("aplicada") && id.equals(json.get("aplicada").getAsString())) return;
			String comando = json.get("comando").getAsString();
			// Solo se aceptan los comandos de skin: el archivo no puede hacer mandar otra cosa
			if (!comando.startsWith("skin ")) return;

			client.gui.getChat().addMessage(Component.literal("RataLand: poniendo la skin que elegiste en el launcher…").withStyle(ChatFormatting.GOLD));
			client.getConnection().sendCommand(comando);
			json.addProperty("aplicada", id);
			try (Writer escritor = Files.newBufferedWriter(ruta, StandardCharsets.UTF_8)) {
				escritor.write(json.toString());
			}
		} catch (Exception e) {
			RataLand.LOG.warn("No se pudo poner la skin pendiente: {}", e.toString());
		}
	}

}
