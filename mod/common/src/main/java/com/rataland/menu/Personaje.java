package com.rataland.menu;

import com.mojang.blaze3d.platform.NativeImage;
import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.resources.PlayerSkin;
import net.minecraft.resources.ResourceLocation;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tu personaje de frente, como en el launcher: cabeza, cuerpo, brazos y piernas, y encima la capa
 * exterior. La skin la deja el launcher en config/rataland-personaje.png (también sin premium, la que
 * pondrá SkinRestorer); si no está, se usa la que conoce el juego.
 */
public final class Personaje {
	private static ResourceLocation textura;
	private static int altoTextura = 64;
	private static boolean cargada;

	private Personaje() {
	}

	private static void cargar(Minecraft client) {
		if (cargada) return;
		cargada = true;
		Path png = RataLand.config("rataland-personaje.png");
		if (!Files.exists(png)) return;
		try (InputStream entrada = Files.newInputStream(png)) {
			NativeImage imagen = NativeImage.read(entrada);
			if (imagen.getWidth() != 64 || (imagen.getHeight() != 64 && imagen.getHeight() != 32)) {
				imagen.close();
				return;
			}
			altoTextura = imagen.getHeight();
			textura = client.getTextureManager().register("rataland_personaje", new DynamicTexture(imagen));
		} catch (Exception e) {
			RataLand.LOG.warn("No se pudo leer la skin del launcher: {}", e.toString());
		}
	}

	/**
	 * Dibuja el personaje con la esquina de arriba a la izquierda en (x, y): mide 16×32 por la escala.
	 * Encima, su nombre como en el juego.
	 */
	public static void dibujar(GuiGraphics context, Minecraft client, Font fuente, int x, int y, float escala, String nombre) {
		cargar(client);
		ResourceLocation tex;
		int alto;
		boolean delgado;
		if (textura != null) {
			tex = textura;
			alto = altoTextura;
			delgado = "slim".equals(RataLand.skinModelo);
		} else {
			PlayerSkin skin = client.getSkinManager().getInsecureSkin(client.getGameProfile());
			tex = skin.texture();
			alto = 64;
			delgado = skin.model() == PlayerSkin.Model.SLIM;
		}
		boolean moderna = alto == 64;
		int brazo = delgado ? 3 : 4;

		// Sombra en el suelo
		int ancho = Math.round(16 * escala);
		int pie = y + Math.round(32 * escala);
		context.fill(x + ancho / 8, pie - 2, x + ancho - ancho / 8, pie + 2, 0x55000000);
		context.fill(x + ancho / 4, pie + 2, x + ancho - ancho / 4, pie + 4, 0x33000000);

		RenderSystem.enableBlend();
		context.pose().pushPose();
		context.pose().translate(x, y, 0f);
		context.pose().scale(escala, escala, 1f);
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
		context.pose().popPose();
		RenderSystem.disableBlend();

		// El nombre, como lo ves sobre los jugadores
		int anchoNombre = fuente.width(nombre);
		int nx = x + ancho / 2 - anchoNombre / 2;
		int ny = y - 14;
		context.fill(nx - 3, ny - 2, nx + anchoNombre + 2, ny + 9, 0x60000000);
		context.drawString(fuente, nombre, nx, ny, 0xFFFFFFFF, false);
	}

	/** Tu cara (con el gorro de la capa exterior) de `tam`×`tam`, para la barra de abajo del menú. */
	public static void cara(GuiGraphics context, Minecraft client, int x, int y, int tam) {
		cargar(client);
		ResourceLocation tex;
		int alto;
		if (textura != null) {
			tex = textura;
			alto = altoTextura;
		} else {
			tex = client.getSkinManager().getInsecureSkin(client.getGameProfile()).texture();
			alto = 64;
		}
		RenderSystem.enableBlend();
		context.blit(tex, x, y, tam, tam, 8, 8, 8, 8, 64, alto);
		context.blit(tex, x, y, tam, tam, 40, 8, 8, 8, 64, alto);
		RenderSystem.disableBlend();
	}

	private static void pieza(GuiGraphics context, ResourceLocation tex, int altoTextura, int u, int v, int w, int h, int dx, int dy) {
		context.blit(tex, dx, dy, u, v, w, h, 64, altoTextura);
	}
}
