package com.rataland.menu;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.PoseStack;
import com.rataland.menu.fondo.MotorFondo;
import com.rataland.menu.fondo.Pincel;
import net.minecraft.Util;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.resources.ResourceLocation;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Lo que se mueve en los fondos animados (estrellas, nubes, agua, farol…), encima de la imagen fija.
 * La escena viene de assets/rataland/escenas/<escena>.json y la dibuja MotorFondo, el mismo motor
 * que usa el launcher.
 */
public final class FondoAnimado {
	private FondoAnimado() {}

	private static final long INICIO = Util.getMillis();
	private static String clave;
	private static MotorFondo motor;

	/** Motor de la escena actual, o null si esa escena no se mueve. */
	public static MotorFondo motor() {
		if (!RataLand.escena.equals(clave)) {
			clave = RataLand.escena;
			motor = cargar(clave);
		}
		return motor;
	}

	private static MotorFondo cargar(String escena) {
		try (InputStream entrada = FondoAnimado.class.getResourceAsStream("/assets/rataland/escenas/" + escena + ".json")) {
			if (entrada == null) return null;
			JsonObject json = JsonParser.parseReader(new InputStreamReader(entrada, StandardCharsets.UTF_8)).getAsJsonObject();
			MotorFondo nuevo = new MotorFondo(json);
			for (String capa : nuevo.capas().keySet()) TexturaDelMod.registrarPropia(Minecraft.getInstance().getTextureManager(), textura(escena, capa));
			return nuevo;
		} catch (Exception e) {
			RataLand.LOG.warn("No se pudo cargar la escena animada {}: {}", escena, e.toString());
			return null;
		}
	}

	/** rataland:textures/gui/fondo_pesca_nubes.png */
	private static ResourceLocation textura(String escena, String capa) {
		return ResourceLocation.fromNamespaceAndPath(RataLand.MOD_ID, "textures/gui/fondo_" + escena + "_" + capa + ".png");
	}

	/** Dibuja lo que se mueve sobre el fondo, que ocupa (x, y, ancho, alto) en la pantalla. */
	public static void dibujar(GuiGraphics context, int x, int y, int ancho, int alto) {
		MotorFondo m = motor();
		if (m == null) return;
		double t = (Util.getMillis() - INICIO) / 1000.0;

		PoseStack matrices = context.pose();
		matrices.pushPose();
		matrices.translate(x, y, 0);
		matrices.scale(ancho / (float) m.ancho(), alto / (float) m.alto(), 1);
		PincelJuego pincel = new PincelJuego(context, m);
		m.dibujar(pincel, t);
		pincel.terminar();
		matrices.popPose();
	}

	/**
	 * Pinta en el juego. Los rectángulos se juntan y se dibujan de una vez (mucho más rápido que
	 * uno a uno); antes de cada capa de imagen se vacían para respetar el orden.
	 */
	private static final class PincelJuego implements Pincel {
		private final GuiGraphics context;
		private final MotorFondo motor;
		private final List<int[]> pendientes = new ArrayList<>();

		PincelJuego(GuiGraphics context, MotorFondo motor) {
			this.context = context;
			this.motor = motor;
		}

		@Override
		public void rect(int x, int y, int w, int h, int rgb, double alfa) {
			int a = (int) Math.round(Math.min(1, alfa) * 255);
			if (a <= 0) return;
			pendientes.add(new int[] {x, y, x + w, y + h, (a << 24) | rgb});
		}

		@Override
		public void capa(String nombre, int x, int y, int w, int h) {
			terminar();
			int tw = w * motor.escala();
			int th = h * motor.escala();
			RenderSystem.enableBlend();
			RenderSystem.defaultBlendFunc();
			context.blit(textura(motor.clave(), nombre), x, y, w, h, 0, 0, tw, th, tw, th);
			RenderSystem.disableBlend();
		}

		@SuppressWarnings("deprecation")
		void terminar() {
			if (pendientes.isEmpty()) return;
			List<int[]> lote = new ArrayList<>(pendientes);
			pendientes.clear();
			context.drawManaged(() -> {
				for (int[] r : lote) context.fill(r[0], r[1], r[2], r[3], r[4]);
			});
		}
	}
}
