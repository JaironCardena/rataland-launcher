package com.rataland.menu;

import net.minecraft.Util;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/**
 * La sala de espera de RataLand (ver {@link SalaEspera}): cuánto falta para el siguiente intento,
 * cuánto llevas esperando y «Volver al menú». Cada intento que no deja entrar trae una nueva.
 */
public class PantallaEspera extends Screen {
	private final Component razon;
	/** Desde cuándo se cuenta para el siguiente intento. */
	private long desde;
	private long intentoDesde;
	private boolean intentando;
	private int fotogramas;

	public PantallaEspera(Component razon) {
		super(Component.literal("Despertando " + RataLand.nombre));
		this.razon = razon;
		this.desde = Util.getMillis();
		SalaEspera.empezar();
	}

	@Override
	protected void init() {
		Conexion.entrando = false;
		int[] b = SalaEspera.boton(this.font, this.width, this.height);
		this.addRenderableWidget(Button.builder(Component.literal("Volver al menú"), boton -> onClose()).bounds(b[0], b[1], b[2], b[3]).build());
	}

	@Override
	public void tick() {
		long ahora = Util.getMillis();
		if (this.intentando) {
			// Si el intento no llegó a salir (seguimos aquí sin buscar la dirección), se cuenta de nuevo
			if (!Conexion.buscando() && ahora - this.intentoDesde > 5000) {
				this.intentando = false;
				this.desde = ahora;
			}
			return;
		}
		if (SalaEspera.esperado() >= SalaEspera.MAXIMO) {
			SalaEspera.terminar();
			this.minecraft.setScreen(new PantallaDesconectado(this.razon, true));
		} else if (ahora - this.desde >= SalaEspera.CADA) {
			this.intentando = true;
			this.intentoDesde = ahora;
			if (RataLand.MODO_CAPTURA) Prueba.reintento(this);
			else Conexion.entrar(this);
		}
	}

	@Override
	public void renderBackground(GuiGraphics g, int mouseX, int mouseY, float delta) {
		super.renderBackground(g, mouseX, mouseY, delta);
		int falta = (int) Math.ceil((SalaEspera.CADA - (Util.getMillis() - this.desde)) / 1000.0);
		SalaEspera.dibujar(g, this.font, this.width, this.height, this.intentando ? -1 : Math.max(1, falta));
	}

	@Override
	public void render(GuiGraphics g, int mouseX, int mouseY, float delta) {
		super.render(g, mouseX, mouseY, delta);
		if (RataLand.MODO_CAPTURA && ++this.fotogramas == 80) Prueba.esperando(this);
	}

	@Override
	public void onClose() {
		SalaEspera.terminar();
		this.minecraft.setScreen(new MenuRataLand());
	}
}
