package com.rataland.menu;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastManager;
import net.minecraft.util.Util;

/**
 * La cuenta atrás del temporizador de World Reset («El mundo se reinicia en 04:59») como un aviso de
 * RataLand: uno solo que se actualiza cada segundo, en rojo los últimos 10 segundos.
 */
public class AvisoCuentaAtras implements Toast {
	private static final Object TOKEN = new Object();
	private static final String TEXTO = "El mundo se reinicia en";
	private static final int ROJO = 0xFFFF8A7A;

	private int segundos;
	private int inicial;
	private long actualizado;
	private Visibility visibilidad = Visibility.SHOW;

	private AvisoCuentaAtras(int segundos) {
		this.segundos = segundos;
		this.inicial = Math.max(1, segundos);
		this.actualizado = Util.getMillis();
	}

	/** Llega un segundo nuevo de la cuenta atrás. */
	public static void poner(int segundos) {
		ToastManager avisos = Minecraft.getInstance().gui.toastManager();
		AvisoCuentaAtras actual = avisos.getToast(AvisoCuentaAtras.class, TOKEN);
		if (actual == null) {
			avisos.addToast(new AvisoCuentaAtras(segundos));
			return;
		}
		if (segundos > actual.inicial) actual.inicial = segundos;
		actual.segundos = segundos;
		actual.actualizado = Util.getMillis();
	}

	@Override
	public Object getToken() {
		return TOKEN;
	}

	@Override
	public int width() {
		return AvisoRataLand.anchoPara(Minecraft.getInstance().font, Minecraft.getInstance().font.width(TEXTO));
	}

	@Override
	public int height() {
		return AvisoRataLand.ALTO;
	}

	@Override
	public Visibility getWantedVisibility() {
		return this.visibilidad;
	}

	@Override
	public void update(ToastManager avisos, long tiempo) {
		// Sin segundos nuevos (se paró o ya se reinició), se va
		this.visibilidad = Util.getMillis() - this.actualizado > 2500 ? Visibility.HIDE : Visibility.SHOW;
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor g, Font fuente, long tiempo) {
		boolean final_ = this.segundos <= 10;
		int color = final_ ? ROJO : Estilo.QUESO;
		int w = width();
		AvisoRataLand.fondo(g, w, AvisoRataLand.ALTO, final_ ? ROJO : AvisoRataLand.BORDE);
		Estilo.icono(g, IconosPixel.RELOJ, 5, 4, 2, color);
		g.text(fuente, TEXTO, AvisoRataLand.TEXTO_X, 3, final_ ? Estilo.CLARO : Estilo.TENUE, false);
		g.text(fuente, String.format("%02d:%02d", this.segundos / 60, this.segundos % 60), AvisoRataLand.TEXTO_X, 13, color, false);
		g.fill(2, AvisoRataLand.ALTO - 2, 2 + Math.round((w - 4) * (this.segundos / (float) this.inicial)), AvisoRataLand.ALTO - 1, color);
	}
}
