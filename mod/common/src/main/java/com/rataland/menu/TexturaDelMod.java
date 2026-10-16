package com.rataland.menu;

import com.mojang.blaze3d.platform.NativeImage;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import net.minecraft.client.renderer.texture.MipmapStrategy;
import net.minecraft.client.renderer.texture.SimpleTexture;
import net.minecraft.client.renderer.texture.TextureContents;
import net.minecraft.client.renderer.texture.TextureManager;
import net.minecraft.client.resources.metadata.texture.TextureMetadataSection;
import net.minecraft.resources.Identifier;
import net.minecraft.server.packs.resources.ResourceManager;

/**
 * Textura leída directamente del jar del mod. Así el mod no necesita Fabric API
 * (sin ella, Minecraft no carga los recursos de los mods) y el logo de la pantalla
 * de carga está disponible antes de que se carguen los paquetes de recursos.
 */
public class TexturaDelMod extends SimpleTexture {
	private final String ruta;
	private final boolean suave;

	public TexturaDelMod(Identifier id, String ruta, boolean suave) {
		super(id);
		this.ruta = ruta;
		this.suave = suave;
	}

	@Override
	public TextureContents loadContents(ResourceManager resourceManager) throws IOException {
		try (InputStream entrada = TexturaDelMod.class.getResourceAsStream(ruta)) {
			if (entrada == null) throw new FileNotFoundException(ruta);
			return new TextureContents(NativeImage.read(entrada), new TextureMetadataSection(suave, true, MipmapStrategy.AUTO, 0f));
		}
	}

	/** Registra las texturas de RataLand. La de carga sustituye al logo de Mojang Studios. */
	public static void registrar(TextureManager texturas, Identifier logoCarga) {
		texturas.registerAndLoad(logoCarga, new TexturaDelMod(logoCarga, "/assets/rataland/textures/gui/carga.png", true));
		for (Identifier id : RataLand.FONDOS.values()) registrarPropia(texturas, id);
		for (Identifier id : new Identifier[] {RataLand.LOGO, RataLand.RATA, RataLand.BOTON_TIERRA, RataLand.BOTON_HIERBA}) {
			registrarPropia(texturas, id);
		}
	}

	/** Las texturas propias se llaman como su archivo: rataland:textures/gui/x.png → /assets/rataland/textures/gui/x.png */
	public static void registrarPropia(TextureManager texturas, Identifier id) {
		texturas.registerAndLoad(id, new TexturaDelMod(id, "/assets/" + id.getNamespace() + "/" + id.getPath(), false));
	}
}
