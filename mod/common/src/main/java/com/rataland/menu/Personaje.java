package com.rataland.menu;

import net.minecraft.client.renderer.RenderPipelines;
import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.world.entity.player.PlayerModelType;
import net.minecraft.world.entity.player.PlayerSkin;
import net.minecraft.resources.Identifier;
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
			textura = Identifier.fromNamespaceAndPath(RataLand.MOD_ID, "personaje");
			client.getTextureManager().register(textura, new DynamicTexture(() -> "Personaje de RataLand", imagen));
		} catch (Exception e) {
			RataLand.LOG.warn("No se pudo leer la skin del launcher: {}", e.toString());
		}
	}

	/**
	 * Dibuja el personaje con la esquina de arriba a la izquierda en (x, y): mide 16×32 por la escala.
	 * Encima, su nombre como en el juego.
	 */
	public static void dibujar(GuiGraphicsExtractor context, Minecraft client, Font fuente, int x, int y, float escala, String nombre) {
		cargar(client);
		Identifier tex;
		int alto;
		boolean delgado;
		if (textura != null) {
			tex = textura;
			alto = altoTextura;
			delgado = "slim".equals(RataLand.skinModelo);
		} else {
			PlayerSkin skin = client.getSkinManager().createLookup(client.getGameProfile(), false).get();
			tex = skin.body().texturePath();
			alto = 64;
			delgado = skin.model() == PlayerModelType.SLIM;
		}
		boolean moderna = alto == 64;
		int brazo = delgado ? 3 : 4;

		// Sombra en el suelo
		int ancho = Math.round(16 * escala);
		int pie = y + Math.round(32 * escala);
		context.fill(x + ancho / 8, pie - 2, x + ancho - ancho / 8, pie + 2, 0x55000000);
		context.fill(x + ancho / 4, pie + 2, x + ancho - ancho / 4, pie + 4, 0x33000000);
		context.pose().pushMatrix();
		context.pose().translate(x, y);
		context.pose().scale(escala, escala);
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
		context.pose().popMatrix();

		// El nombre, como lo ves sobre los jugadores
		int anchoNombre = fuente.width(nombre);
		int nx = x + ancho / 2 - anchoNombre / 2;
		int ny = y - 14;
		context.fill(nx - 3, ny - 2, nx + anchoNombre + 2, ny + 9, 0x60000000);
		context.text(fuente, nombre, nx, ny, 0xFFFFFFFF, false);
	}

	/** Tu cara (con el gorro de la capa exterior) de `tam`×`tam`, para la barra de abajo del menú. */
	public static void cara(GuiGraphicsExtractor context, Minecraft client, int x, int y, int tam) {
		cargar(client);
		Identifier tex;
		int alto;
		if (textura != null) {
			tex = textura;
			alto = altoTextura;
		} else {
			tex = client.getSkinManager().createLookup(client.getGameProfile(), false).get().body().texturePath();
			alto = 64;
		}
		context.blit(RenderPipelines.GUI_TEXTURED, tex, x, y, 8, 8, tam, tam, 8, 8, 64, alto);
		context.blit(RenderPipelines.GUI_TEXTURED, tex, x, y, 40, 8, tam, tam, 8, 8, 64, alto);
	}

	private static void pieza(GuiGraphicsExtractor context, Identifier tex, int altoTextura, int u, int v, int w, int h, int dx, int dy) {
		context.blit(RenderPipelines.GUI_TEXTURED, tex, dx, dy, u, v, w, h, 64, altoTextura);
	}
}
