package com.rataland.menu;

import com.mojang.blaze3d.systems.RenderSystem;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.client.util.SkinTextures;
import net.minecraft.util.Identifier;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tu personaje de frente, como en el launcher: cabeza, cuerpo, brazos y piernas, y encima la capa
 * exterior. La skin la deja el launcher en config/rataland-personaje.png (también sin premium, la que
 * pondrá SkinRestorer); si no está, se usa la que conoce el juego.
 */
public final class Personaje {
	private static Identifier textura;
	private static int altoTextura = 64;
	private static boolean cargada;

	private Personaje() {
	}

	private static void cargar(MinecraftClient client) {
		if (cargada) return;
		cargada = true;
		Path png = FabricLoader.getInstance().getConfigDir().resolve("rataland-personaje.png");
		if (!Files.exists(png)) return;
		try (InputStream entrada = Files.newInputStream(png)) {
			NativeImage imagen = NativeImage.read(entrada);
			if (imagen.getWidth() != 64 || (imagen.getHeight() != 64 && imagen.getHeight() != 32)) {
				imagen.close();
				return;
			}
			altoTextura = imagen.getHeight();
			textura = client.getTextureManager().registerDynamicTexture("rataland_personaje", new NativeImageBackedTexture(imagen));
		} catch (Exception e) {
			RataLand.LOG.warn("No se pudo leer la skin del launcher: {}", e.toString());
		}
	}

	/**
	 * Dibuja el personaje con la esquina de arriba a la izquierda en (x, y): mide 16×32 por la escala.
	 * Encima, su nombre como en el juego.
	 */
	public static void dibujar(DrawContext context, MinecraftClient client, TextRenderer fuente, int x, int y, float escala, String nombre) {
		cargar(client);
		Identifier tex;
		int alto;
		boolean delgado;
		if (textura != null) {
			tex = textura;
			alto = altoTextura;
			delgado = "slim".equals(RataLand.skinModelo);
		} else {
			SkinTextures skin = client.getSkinProvider().getSkinTextures(client.getGameProfile());
			tex = skin.texture();
			alto = 64;
			delgado = skin.model() == SkinTextures.Model.SLIM;
		}
		boolean moderna = alto == 64;
		int brazo = delgado ? 3 : 4;

		// Sombra en el suelo
		int ancho = Math.round(16 * escala);
		int pie = y + Math.round(32 * escala);
		context.fill(x + ancho / 8, pie - 2, x + ancho - ancho / 8, pie + 2, 0x55000000);
		context.fill(x + ancho / 4, pie + 2, x + ancho - ancho / 4, pie + 4, 0x33000000);

		RenderSystem.enableBlend();
		context.getMatrices().push();
		context.getMatrices().translate(x, y, 0f);
		context.getMatrices().scale(escala, escala, 1f);
		pieza(context, tex, alto, 8, 8, 8, 8, 4, 0);
		pieza(context, tex, alto, 20, 20, 8, 12, 4, 8);
		pieza(context, tex, alto, 44, 20, brazo, 12, 4 - brazo, 8);
		pieza(context, tex, alto, moderna ? 36 : 44, moderna ? 52 : 20, brazo, 12, 12, 8);
		pieza(context, tex, alto, 4, 20, 4, 12, 4, 20);
		pieza(context, tex, alto, moderna ? 20 : 4, moderna ? 52 : 20, 4, 12, 8, 20);
		// Capa exterior (gorro, chaqueta, mangas y pantalón)
		pieza(context, tex, alto, 40, 8, 8, 8, 4, 0);
		if (moderna) {
			pieza(context, tex, alto, 20, 36, 8, 12, 4, 8);
			pieza(context, tex, alto, 44, 36, brazo, 12, 4 - brazo, 8);
			pieza(context, tex, alto, 52, 52, brazo, 12, 12, 8);
			pieza(context, tex, alto, 4, 36, 4, 12, 4, 20);
			pieza(context, tex, alto, 4, 52, 4, 12, 8, 20);
		}
		context.getMatrices().pop();
		RenderSystem.disableBlend();

		// El nombre, como lo ves sobre los jugadores
		int anchoNombre = fuente.getWidth(nombre);
		int nx = x + ancho / 2 - anchoNombre / 2;
		int ny = y - 14;
		context.fill(nx - 3, ny - 2, nx + anchoNombre + 2, ny + 9, 0x60000000);
		context.drawText(fuente, nombre, nx, ny, 0xFFFFFFFF, false);
	}

	private static void pieza(DrawContext context, Identifier tex, int altoTextura, int u, int v, int w, int h, int dx, int dy) {
		context.drawTexture(tex, dx, dy, u, v, w, h, 64, altoTextura);
	}
}
