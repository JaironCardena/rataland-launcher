package com.rataland.menu;

import net.minecraft.client.resource.metadata.TextureResourceMetadata;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.ResourceTexture;
import net.minecraft.client.texture.TextureManager;
import net.minecraft.resource.ResourceManager;
import net.minecraft.util.Identifier;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;

/**
 * Textura leída directamente del jar del mod. Así el mod no necesita Fabric API
 * (sin ella, Minecraft no carga los recursos de los mods) y el logo de la pantalla
 * de carga está disponible antes de que se carguen los paquetes de recursos.
 */
public class TexturaDelMod extends ResourceTexture {
	private final String ruta;
	private final boolean suave;

	public TexturaDelMod(Identifier id, String ruta, boolean suave) {
		super(id);
		this.ruta = ruta;
		this.suave = suave;
	}

	@Override
	protected TextureData loadTextureData(ResourceManager resourceManager) {
		try (InputStream entrada = TexturaDelMod.class.getResourceAsStream(ruta)) {
			if (entrada == null) return new TextureData(new FileNotFoundException(ruta));
			return new TextureData(new TextureResourceMetadata(suave, true), NativeImage.read(entrada));
		} catch (IOException e) {
			return new TextureData(e);
		}
	}

	/** Registra las texturas de RataLand. La de carga sustituye al logo de Mojang Studios. */
	public static void registrar(TextureManager texturas, Identifier logoCarga) {
		texturas.registerTexture(logoCarga, new TexturaDelMod(logoCarga, "/assets/rataland/textures/gui/carga.png", true));
		for (Identifier id : RataLand.FONDOS.values()) registrarPropia(texturas, id);
		registrarPropia(texturas, FondoAnimado.NUBES);
		registrarPropia(texturas, FondoAnimado.BARCA);
		for (Identifier id : new Identifier[] {RataLand.LOGO, RataLand.RATA, RataLand.BOTON_TIERRA, RataLand.BOTON_HIERBA}) {
			registrarPropia(texturas, id);
		}
	}

	/** Las texturas propias se llaman como su archivo: rataland:textures/gui/x.png → /assets/rataland/textures/gui/x.png */
	private static void registrarPropia(TextureManager texturas, Identifier id) {
		texturas.registerTexture(id, new TexturaDelMod(id, "/assets/" + id.getNamespace() + "/" + id.getPath(), false));
	}
}
