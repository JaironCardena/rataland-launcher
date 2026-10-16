package com.rataland.menu;

import net.minecraft.client.renderer.RenderPipelines;
import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.util.Util;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.PlayerFaceExtractor;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.resources.DefaultPlayerSkin;
import net.minecraft.core.UUIDUtil;
import net.minecraft.resources.Identifier;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cabezas de jugadores por su nombre, para el menú principal (como en el launcher: de mc-heads.net).
 * Mientras llegan, o si no hay, se ve la cara por defecto de Minecraft para ese nombre.
 */
public final class Cabezas {
	private Cabezas() {}

	private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
	private static final Map<String, Identifier> LISTAS = new ConcurrentHashMap<>();
	private static final Map<String, Boolean> PEDIDAS = new ConcurrentHashMap<>();

	/** Dibuja la cabeza de `nombre` de `tam`×`tam`. */
	public static void dibujar(GuiGraphicsExtractor g, String nombre, int x, int y, int tam) {
		String clave = nombre.toLowerCase(Locale.ROOT);
		Identifier cara = LISTAS.get(clave);
		if (cara != null) {
			g.blit(RenderPipelines.GUI_TEXTURED, cara, x, y, 0, 0, tam, tam, 8, 8, 8, 8);
			return;
		}
		pedir(clave);
		PlayerFaceExtractor.extractRenderState(g, DefaultPlayerSkin.get(UUIDUtil.createOfflinePlayerUUID(nombre)), x, y, tam);
	}

	private static void pedir(String nombre) {
		if (!nombre.matches("[a-z0-9_]{2,16}") || PEDIDAS.putIfAbsent(nombre, true) != null) return;
		Util.backgroundExecutor().execute(() -> {
			try {
				HttpRequest pedido = HttpRequest.newBuilder(URI.create("https://mc-heads.net/avatar/" + nombre + "/8"))
						.timeout(Duration.ofSeconds(8)).header("User-Agent", "RataLand").build();
				HttpResponse<byte[]> respuesta = HTTP.send(pedido, HttpResponse.BodyHandlers.ofByteArray());
				if (respuesta.statusCode() != 200) return;
				NativeImage imagen = NativeImage.read(new ByteArrayInputStream(respuesta.body()));
				Minecraft juego = Minecraft.getInstance();
				Identifier id = Identifier.fromNamespaceAndPath(RataLand.MOD_ID, "cabeza/" + nombre);
				juego.execute(() -> {
					juego.getTextureManager().register(id, new DynamicTexture(() -> "Cabeza de " + nombre, imagen));
					LISTAS.put(nombre, id);
				});
			} catch (Exception e) {
				RataLand.LOG.debug("Sin cabeza para {}: {}", nombre, e.toString());
			}
		});
	}
}
