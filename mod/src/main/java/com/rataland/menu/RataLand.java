package com.rataland.menu;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Mod de RataLand: pantalla de carga con el logo de la serie y un menú principal
 * que solo deja jugar en el servidor, abrir opciones o salir.
 *
 * El launcher escribe config/rataland.json con el nombre y la IP del servidor.
 */
public class RataLand implements ClientModInitializer {
	public static final String MOD_ID = "rataland";
	public static final Logger LOG = LoggerFactory.getLogger("RataLand");

	public static final Identifier FONDO = Identifier.of(MOD_ID, "textures/gui/fondo.png");
	public static final int FONDO_ANCHO = 640;
	public static final int FONDO_ALTO = 360;
	public static final Identifier LOGO = Identifier.of(MOD_ID, "textures/gui/logo.png");
	public static final int LOGO_ANCHO = 67;
	public static final int LOGO_ALTO = 23;

	/** Color de fondo de la pantalla de carga (ARGB). */
	public static final int COLOR_CARGA = 0xFF0F1626;

	public static String nombre = "RataLand";
	public static String ip = "Rataland-8RN6.aternos.me";
	public static int puerto = 47702;
	/** Enlace de Discord para el menú de pausa ("" = sin botón). */
	public static String discord = "";

	/** Solo para pruebas: con -Drataland.captura=true guarda capturas del menú y la carga y cierra el juego. */
	public static final boolean MODO_CAPTURA = Boolean.getBoolean("rataland.captura");

	@Override
	public void onInitializeClient() {
		Path archivo = FabricLoader.getInstance().getConfigDir().resolve("rataland.json");
		if (!Files.exists(archivo)) return;
		try (Reader lector = Files.newBufferedReader(archivo, StandardCharsets.UTF_8)) {
			JsonObject json = JsonParser.parseReader(lector).getAsJsonObject();
			if (json.has("nombre")) nombre = json.get("nombre").getAsString();
			if (json.has("ip")) ip = json.get("ip").getAsString();
			if (json.has("puerto")) puerto = json.get("puerto").getAsInt();
			if (json.has("discord")) {
				String enlace = json.get("discord").getAsString();
				discord = enlace.startsWith("https://") || enlace.startsWith("http://") ? enlace : "";
			}
		} catch (Exception e) {
			LOG.warn("No se pudo leer {}: {}", archivo, e.toString());
		}
	}

	public static String direccion() {
		return puerto == 25565 ? ip : ip + ":" + puerto;
	}
}
