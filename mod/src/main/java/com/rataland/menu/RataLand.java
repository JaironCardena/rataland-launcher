package com.rataland.menu;

import com.google.gson.JsonElement;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Mod de RataLand: pantalla de carga con el logo de la serie y menús propios
 * (principal y de pausa) con el paisaje de la temporada.
 *
 * El launcher escribe config/rataland.json con el servidor, la escena, la temporada,
 * las frases del menú y el enlace de Discord.
 */
public class RataLand implements ClientModInitializer {
	public static final String MOD_ID = "rataland";
	public static final Logger LOG = LoggerFactory.getLogger("RataLand");

	public static final int FONDO_ANCHO = 640;
	public static final int FONDO_ALTO = 360;
	public static final Identifier LOGO = Identifier.of(MOD_ID, "textures/gui/logo.png");
	public static final int LOGO_ANCHO = 67;
	public static final int LOGO_ALTO = 23;
	public static final Identifier RATA = Identifier.of(MOD_ID, "textures/gui/rata.png");
	public static final Identifier BOTON_TIERRA = Identifier.of(MOD_ID, "textures/gui/boton_tierra.png");
	public static final Identifier BOTON_HIERBA = Identifier.of(MOD_ID, "textures/gui/boton_hierba.png");

	/** Escenas de fondo: la que se use la elige el panel del modpack. */
	public static final Map<String, Identifier> FONDOS = Map.of(
			"noche", Identifier.of(MOD_ID, "textures/gui/fondo.png"),
			"cloacas", Identifier.of(MOD_ID, "textures/gui/fondo_cloacas.png"),
			"amanecer", Identifier.of(MOD_ID, "textures/gui/fondo_amanecer.png"),
			FondoAnimado.ESCENA, Identifier.of(MOD_ID, "textures/gui/fondo_pesca.png"));

	/** Color de fondo de la pantalla de carga (ARGB). */
	public static final int COLOR_CARGA = 0xFF0F1626;

	private static final List<String> FRASES_POR_DEFECTO = List.of(
			"¡Ahora con más queso!", "¡Squeak!", "¡Cuidado con las cloacas!", "¡Queso para todos!");

	public static String nombre = "RataLand";
	public static String ip = "Rataland-8RN6.aternos.me";
	public static int puerto = 25565;
	/** Dirección real ("host:puerto") que encontró el launcher al abrir el juego ("" = no la hay). */
	public static String destino = "";
	/** Enlace de Discord para los menús ("" = sin botón). */
	public static String discord = "";
	public static String escena = "noche";
	/** Texto como "Temporada 1" ("" = no se muestra). */
	public static String temporada = "";
	public static List<String> frases = FRASES_POR_DEFECTO;
	/** Próximo episodio o evento (cuenta atrás): título y cuándo empieza y acaba (ms; 0 = no hay). */
	public static String eventoTitulo = "";
	public static long eventoInicio = 0;
	public static long eventoFin = 0;
	/** Modelo de la skin que dejó el launcher en config/rataland-personaje.png: "classic" o "slim". */
	public static String skinModelo = "classic";

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
			if (json.has("destino")) destino = json.get("destino").getAsString().trim();
			if (json.has("discord")) {
				String enlace = json.get("discord").getAsString();
				discord = enlace.startsWith("https://") || enlace.startsWith("http://") ? enlace : "";
			}
			if (json.has("escena") && FONDOS.containsKey(json.get("escena").getAsString())) escena = json.get("escena").getAsString();
			if (json.has("temporada")) temporada = json.get("temporada").getAsString().trim();
			if (json.has("skinModelo")) skinModelo = json.get("skinModelo").getAsString();
			if (json.has("evento") && json.get("evento").isJsonObject()) {
				JsonObject evento = json.getAsJsonObject("evento");
				eventoTitulo = evento.has("titulo") ? evento.get("titulo").getAsString().trim() : "";
				eventoInicio = evento.has("inicio") ? evento.get("inicio").getAsLong() : 0;
				eventoFin = evento.has("fin") ? evento.get("fin").getAsLong() : 0;
			}
			if (json.has("frases") && json.get("frases").isJsonArray()) {
				List<String> lista = new ArrayList<>();
				for (JsonElement e : json.getAsJsonArray("frases")) {
					String frase = e.getAsString().trim();
					if (!frase.isEmpty()) lista.add(frase);
				}
				if (!lista.isEmpty()) frases = lista;
			}
		} catch (Exception e) {
			LOG.warn("No se pudo leer {}: {}", archivo, e.toString());
		}
		if (MODO_CAPTURA) {
			java.util.concurrent.CompletableFuture.runAsync(() -> LOG.info("Prueba: al pulsar Jugar se conectaría a {}", direccionParaConectar()));
		}
	}

	public static Identifier fondoActual() {
		return FONDOS.getOrDefault(escena, FONDOS.get("noche"));
	}

	/** ¿Es el servidor de la serie? (para no mandar comandos ni ocultar avisos en otros servidores) */
	public static boolean esElServidor(net.minecraft.client.network.ServerInfo servidor) {
		if (servidor == null || servidor.address == null) return false;
		String direccion = servidor.address.toLowerCase(java.util.Locale.ROOT);
		String propia = ip.toLowerCase(java.util.Locale.ROOT);
		return direccion.equals(propia) || direccion.startsWith(propia + ":");
	}

	public static String direccion() {
		return puerto == 25565 ? ip : ip + ":" + puerto;
	}

	/**
	 * Dónde conectarse al pulsar Jugar: lo que diga ahora el registro SRV (en Aternos el puerto
	 * cambia al reiniciar el servidor), o lo que encontró el launcher, o la dirección configurada.
	 * Consulta la red: no llamarlo desde el hilo del juego.
	 */
	public static String direccionParaConectar() {
		String srv = DireccionServidor.buscar(ip);
		if (srv != null) return srv;
		return destino.isEmpty() ? direccion() : destino;
	}
}
