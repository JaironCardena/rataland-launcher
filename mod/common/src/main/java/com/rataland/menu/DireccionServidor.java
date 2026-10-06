package com.rataland.menu;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import javax.naming.directory.Attribute;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Hashtable;
import java.util.Locale;

/**
 * Busca dónde está el servidor ahora mismo con su registro SRV (_minecraft._tcp.&lt;ip&gt;).
 * Aternos lo usa para su puerto "dinámico", que cambia al reiniciar el servidor. Hay routers que
 * rechazan estas consultas, así que si falla el DNS del equipo se pregunta a uno público por HTTPS.
 */
public final class DireccionServidor {
	private static final String[] DNS_HTTPS = {
			"https://dns.google/resolve?name=%s&type=SRV",
			"https://cloudflare-dns.com/dns-query?name=%s&type=SRV"
	};

	private DireccionServidor() {
	}

	/** "host:puerto" según el registro SRV, o null si no tiene o no se pudo consultar. */
	public static String buscar(String host) {
		if (host == null || host.isEmpty() || host.contains(":") || host.matches("[0-9.]+")) return null;
		String nombre = "_minecraft._tcp." + host;
		String encontrado = porSistema(nombre);
		if (encontrado != null) return encontrado;
		for (String plantilla : DNS_HTTPS) {
			encontrado = porHttps(String.format(plantilla, URLEncoder.encode(nombre, StandardCharsets.UTF_8)));
			// "" = el DNS respondió que no hay registro
			if (encontrado != null) return encontrado.isEmpty() ? null : encontrado;
		}
		return null;
	}

	private static String porSistema(String nombre) {
		try {
			Hashtable<String, String> entorno = new Hashtable<>();
			entorno.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
			entorno.put("java.naming.provider.url", "dns:");
			entorno.put("com.sun.jndi.dns.timeout.initial", "2000");
			entorno.put("com.sun.jndi.dns.timeout.retries", "1");
			DirContext contexto = new InitialDirContext(entorno);
			try {
				Attribute srv = contexto.getAttributes(nombre, new String[] {"SRV"}).get("srv");
				return srv == null || srv.size() == 0 ? null : desdeRegistro(srv.get(0).toString());
			} finally {
				contexto.close();
			}
		} catch (Throwable e) {
			return null;
		}
	}

	private static String porHttps(String url) {
		try {
			HttpURLConnection conexion = (HttpURLConnection) URI.create(url).toURL().openConnection();
			conexion.setConnectTimeout(3000);
			conexion.setReadTimeout(4000);
			conexion.setRequestProperty("Accept", "application/dns-json");
			if (conexion.getResponseCode() != 200) return null;
			JsonObject json;
			try (Reader lector = new InputStreamReader(conexion.getInputStream(), StandardCharsets.UTF_8)) {
				json = JsonParser.parseReader(lector).getAsJsonObject();
			}
			if (json.get("Status").getAsInt() != 0 || !json.has("Answer")) return "";
			JsonArray respuestas = json.getAsJsonArray("Answer");
			for (JsonElement e : respuestas) {
				JsonObject registro = e.getAsJsonObject();
				if (registro.get("type").getAsInt() == 33) {
					String direccion = desdeRegistro(registro.get("data").getAsString());
					return direccion == null ? "" : direccion;
				}
			}
			return "";
		} catch (Throwable e) {
			return null;
		}
	}

	/** "1 1 47702 rataland-8rn6.aternos.me." → "rataland-8rn6.aternos.me:47702" */
	private static String desdeRegistro(String registro) {
		String[] partes = registro.trim().split("\\s+");
		if (partes.length < 4) return null;
		int puerto = Integer.parseInt(partes[2]);
		String destino = partes[3].replaceAll("\\.$", "").toLowerCase(Locale.ROOT);
		return destino.isEmpty() || puerto <= 0 ? null : destino + ":" + puerto;
	}
}
