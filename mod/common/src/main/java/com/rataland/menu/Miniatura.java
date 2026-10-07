package com.rataland.menu;

import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.ResourceLocation;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/** Miniatura del último episodio, que el launcher deja en config/rataland-episodio.png (320×180). */
public final class Miniatura {
	private Miniatura() {}

	private static ResourceLocation textura;
	private static int ancho;
	private static int alto;
	private static boolean cargada;

	/** La textura, o null si no hay miniatura. */
	public static ResourceLocation textura() {
		if (!cargada) {
			cargada = true;
			Path png = RataLand.config("rataland-episodio.png");
			if (Files.exists(png)) {
				try (InputStream entrada = Files.newInputStream(png)) {
					NativeImage imagen = NativeImage.read(entrada);
					ancho = imagen.getWidth();
					alto = imagen.getHeight();
					textura = Minecraft.getInstance().getTextureManager().register("rataland_episodio", new DynamicTexture(imagen));
				} catch (Exception e) {
					RataLand.LOG.warn("No se pudo leer la miniatura del episodio: {}", e.toString());
				}
			}
		}
		return textura;
	}

	public static int ancho() {
		return ancho;
	}

	public static int alto() {
		return alto;
	}
}
