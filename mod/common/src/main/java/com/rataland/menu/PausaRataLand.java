package com.rataland.menu;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.PlayerFaceRenderer;
import net.minecraft.client.gui.screens.ConfirmLinkScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.achievement.StatsScreen;
import net.minecraft.client.gui.screens.advancements.AdvancementsScreen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.network.chat.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Menú de pausa de RataLand: un panel a la izquierda (Volver al juego, fichas con Progresos,
 * Estadísticas, Opciones y Discord, y abajo «Volver a RataLand»), y sobre el mundo, abajo a la
 * derecha, quién está en el servidor y la cuenta atrás del próximo episodio.
 */
public class PausaRataLand extends Screen {
	private static final int MARGEN = 16;
	private static final int SEPARACION = 4;
	private static final int ALTO_FICHA = 30;
	private static final int ANCHO_SERVIDOR = 150;

	private int fotogramas;
	private int anchoPanel;
	private int escalaLogo;
	private boolean conChip;

	public PausaRataLand() {
		super(Component.translatable("menu.game"));
	}

	private int altoLogo() {
		return RataLand.LOGO_ALTO * escalaLogo;
	}

	/** Alto de lo de arriba (logo, temporada y botones) para decidir si cabe a tamaño grande. */
	private int altoContenido() {
		int botones = 24 + SEPARACION + (ALTO_FICHA + SEPARACION) * 2;
		return 14 + altoLogo() + 8 + (conChip ? 15 + 12 : 4) + botones;
	}

	@Override
	protected void init() {
		boolean hayDiscord = !RataLand.discord.isEmpty();
		this.anchoPanel = Math.min(210, Math.max(176, (int) (this.width * 0.32f)));
		int anchoBoton = this.anchoPanel - MARGEN * 2;

		// Lo más grande que quepa: logo ×2 y la temporada; si no, logo ×1 y sin temporada
		this.escalaLogo = RataLand.LOGO_ANCHO * 2 <= anchoBoton ? 2 : 1;
		this.conChip = !RataLand.temporada.isEmpty();
		int abajo = this.height - 14 - 20;
		if (altoContenido() > abajo - 10) this.escalaLogo = 1;
		if (altoContenido() > abajo - 10) this.conChip = false;

		int x = MARGEN;
		int y = 14 + altoLogo() + 8 + (this.conChip ? 15 + 12 : 4);

		this.addRenderableWidget(new BotonRataLand(x, y, anchoBoton, 24, Component.translatable("menu.returnToGame"), b -> {
			this.minecraft.setScreen(null);
			this.minecraft.mouseHandler.grabMouse();
		}, BotonRataLand.Estilo.HIERBA, 1.5f));
		y += 24 + SEPARACION;

		// Fichas de dos en dos, con su icono encima
		int anchoFicha = (anchoBoton - SEPARACION) / 2;
		int x2 = x + anchoFicha + SEPARACION;
		this.addRenderableWidget(new BotonRataLand(x, y, anchoFicha, ALTO_FICHA, Component.translatable("gui.advancements"), b -> {
			if (this.minecraft.player != null) {
				this.minecraft.setScreen(new AdvancementsScreen(this.minecraft.player.connection.getAdvancements(), this));
			}
		}, BotonRataLand.Estilo.PIEDRA).conIcono(IconosPixel.TROFEO, Estilo.QUESO).comoFicha());
		this.addRenderableWidget(new BotonRataLand(x2, y, anchoFicha, ALTO_FICHA, Component.translatable("gui.stats"), b -> {
			if (this.minecraft.player != null) {
				this.minecraft.setScreen(new StatsScreen(this, this.minecraft.player.getStats()));
			}
		}, BotonRataLand.Estilo.PIEDRA).conIcono(IconosPixel.LISTA, Estilo.TENUE).comoFicha());
		y += ALTO_FICHA + SEPARACION;
		int anchoOpciones = hayDiscord ? anchoFicha : anchoBoton;
		this.addRenderableWidget(new BotonRataLand(x, y, anchoOpciones, ALTO_FICHA, Component.translatable("options.title"),
				b -> this.minecraft.setScreen(new OptionsScreen(this, this.minecraft.options)), BotonRataLand.Estilo.PIEDRA)
				.conIcono(IconosPixel.AJUSTES, Estilo.TENUE).comoFicha());
		if (hayDiscord) {
			this.addRenderableWidget(new BotonRataLand(x2, y, anchoFicha, ALTO_FICHA, Component.literal("Discord"),
					ConfirmLinkScreen.confirmLink(this, RataLand.discord), BotonRataLand.Estilo.DISCORD)
					.conIcono(IconosPixel.DISCORD, 0xFFFFFFFF).comoFicha());
		}

		this.addRenderableWidget(new BotonRataLand(x, abajo, anchoBoton, 20, Component.literal("Volver a " + RataLand.nombre),
				b -> volverAlMenu(), BotonRataLand.Estilo.PELIGRO).conIcono(IconosPixel.SALIR, 0xFFFF9A8A));

		if (RataLand.MODO_CAPTURA) Avisos.ejemplos();
	}

	private void volverAlMenu() {
		if (this.minecraft.level != null) this.minecraft.level.disconnect();
		this.minecraft.disconnect();
		this.minecraft.setScreen(new MenuRataLand());
	}

	@Override
	public void renderBackground(GuiGraphics context, int mouseX, int mouseY, float delta) {
		super.renderBackground(context, mouseX, mouseY, delta);
		// Panel de la izquierda: noche casi opaca y un filo de queso
		context.fill(0, 0, this.anchoPanel, this.height, Estilo.PANEL_FUERTE);
		context.fill(this.anchoPanel - 1, 0, this.anchoPanel, this.height, 0x80F6C445);
	}

	/** Un jugador para la tarjeta: nombre, su cara, si eres tú y su ping. */
	private record Jugador(String nombre, PlayerInfo info, boolean yo, int ping) {}

	private List<Jugador> jugadores() {
		List<Jugador> lista = new ArrayList<>();
		ClientPacketListener red = this.minecraft.getConnection();
		if (red != null) {
			UUID propio = this.minecraft.player != null ? this.minecraft.player.getUUID() : null;
			for (PlayerInfo info : red.getListedOnlinePlayers()) {
				boolean yo = info.getProfile().getId().equals(propio);
				lista.add(new Jugador(info.getProfile().getName(), info, yo, info.getLatency()));
			}
		} else if (RataLand.MODO_CAPTURA) {
			// En las pruebas no hay servidor: unos jugadores de ejemplo para ver la tarjeta
			lista.add(new Jugador(this.minecraft.getUser().getName(), null, true, 32));
			for (String n : List.of("Rata_Gamer", "Supansinho", "Ratoncita")) lista.add(new Jugador(n, null, false, 60));
		}
		lista.sort(Comparator.comparing((Jugador j) -> !j.yo()).thenComparing(j -> j.nombre().toLowerCase(Locale.ROOT)));
		return lista;
	}

	/** Quién está en el servidor, con su cara, y tu ping. Devuelve el alto que ocupa (0 si no hay nadie). */
	private int dibujarServidor(GuiGraphics g, int x, int abajo, int altoMaximo) {
		List<Jugador> lista = jugadores();
		if (lista.isEmpty()) return 0;
		int filas = Math.max(1, Math.min(lista.size(), (altoMaximo - 30) / 12));
		boolean sobran = filas < lista.size();
		int alto = 22 + filas * 12 + (sobran ? 10 : 0) + 4;
		int y = abajo - alto;
		Estilo.panel(g, x, y, ANCHO_SERVIDOR, alto);
		g.drawString(this.font, "En el servidor", x + 8, y + 8, Estilo.TEXTO);
		int ping = lista.get(0).yo() ? lista.get(0).ping() : -1;
		if (ping >= 0) {
			String texto = ping + " ms";
			int color = ping < 150 ? Estilo.HIERBA : ping < 300 ? Estilo.QUESO : Estilo.ERROR;
			int px = x + ANCHO_SERVIDOR - 8 - this.font.width(texto);
			g.drawString(this.font, texto, px, y + 8, Estilo.TENUE);
			Estilo.icono(g, IconosPixel.SENAL, px - 11, y + 8, 1, color);
		}
		int fy = y + 22;
		for (int i = 0; i < filas; i++) {
			Jugador j = lista.get(i);
			if (j.info() != null) PlayerFaceRenderer.draw(g, j.info().getSkin(), x + 8, fy, 10);
			else Cabezas.dibujar(g, j.nombre(), x + 8, fy, 10);
			String nombre = Estilo.recortar(this.font, j.nombre(), ANCHO_SERVIDOR - 8 - 22 - 24);
			g.drawString(this.font, nombre, x + 22, fy + 1, Estilo.TEXTO);
			if (j.yo()) g.drawString(this.font, "tú", x + 22 + this.font.width(nombre) + 5, fy + 1, Estilo.QUESO);
			fy += 12;
		}
		if (sobran) g.drawString(this.font, "y " + (lista.size() - filas) + " más", x + 22, fy + 1, Estilo.TENUE);
		return alto;
	}

	@Override
	public void render(GuiGraphics context, int mouseX, int mouseY, float delta) {
		super.render(context, mouseX, mouseY, delta);
		int w = RataLand.LOGO_ANCHO * this.escalaLogo;
		int h = altoLogo();
		context.blit(RataLand.LOGO, MARGEN, 14, w, h, 0, 0,
				RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO, RataLand.LOGO_ANCHO, RataLand.LOGO_ALTO);
		if (this.conChip) Cartel.chip(context, this.font, MARGEN, 14 + h + 8, RataLand.temporada);

		// Sobre el mundo, abajo a la derecha: quién está en el servidor y, encima, la cuenta atrás
		int x = this.width - ANCHO_SERVIDOR - 14;
		if (x > this.anchoPanel + 14) {
			int abajo = this.height - 14;
			int alto = dibujarServidor(context, x, abajo, this.height / 2);
			if (alto > 0) abajo -= alto + 8;
			if (Cartel.hayCuentaAtras()) {
				float escala = this.height >= 300 ? 2f : 1.5f;
				int ancho = Cartel.anchoCuentaAtras(this.font, escala);
				int altoCartel = Cartel.altoCuentaAtras(escala);
				int xc = this.width - ancho - 14;
				if (xc > this.anchoPanel + 14 && abajo - altoCartel > 14) Cartel.cuentaAtras(context, this.font, xc, abajo - altoCartel, escala);
			}
		}

		if (RataLand.MODO_CAPTURA && ++this.fotogramas == 80) Prueba.alSiguienteTick("rataland-pausa.png", () -> Prueba.despuesDeLaPausa(this));
	}
}
