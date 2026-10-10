package com.rataland.menu.mixin;

import com.rataland.menu.Estadisticas;
import com.rataland.menu.Estilo;
import com.rataland.menu.Fondo;
import com.rataland.menu.Prueba;
import com.rataland.menu.RataLand;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.ObjectSelectionList;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.gui.screens.achievement.StatsScreen;
import net.minecraft.client.gui.screens.advancements.AdvancementsScreen;
import net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.client.gui.screens.options.OptionsSubScreen;
import net.minecraft.client.gui.screens.options.VideoSettingsScreen;
import net.minecraft.client.gui.screens.packs.PackSelectionScreen;
import net.minecraft.client.gui.layouts.HeaderAndFooterLayout;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Opciones, conexión, desconexión…: en lugar del panorama de Minecraft se ve el paisaje de RataLand.
 * En Opciones y sus pantallas (Gráficos, Controles…), Progresos y Estadísticas, una franja oscura
 * arriba y abajo, como la cabecera y la barra del launcher.
 */
@Mixin(Screen.class)
public abstract class ScreenMixin {
	@Shadow
	public int width;
	@Shadow
	public int height;

	@Unique
	private int rataland$fotogramas;

	@Inject(method = "renderPanorama", at = @At("HEAD"), cancellable = true)
	private void rataland$fondo(GuiGraphics context, float delta, CallbackInfo ci) {
		Fondo.dibujar(context, this.width, this.height);
		ci.cancel();
	}

	@Inject(method = "renderBackground", at = @At("TAIL"))
	private void rataland$franjas(GuiGraphics g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		Object pantalla = this;
		int arriba = 0;
		int abajo = 0;
		if (pantalla instanceof OptionsSubScreen sub) {
			arriba = sub.layout.getHeaderHeight();
			abajo = sub.layout.getFooterHeight();
		} else if (pantalla instanceof OptionsScreen) {
			// La cabecera de Opciones también lleva el campo de visión: la franja, solo tras el título
			arriba = 26;
			abajo = 33;
		} else if (pantalla instanceof StatsScreen) {
			// Las alturas de su cabecera y su pie (con las pestañas General, Objetos y Criaturas)
			arriba = 33;
			abajo = 58;
		} else if (pantalla instanceof AdvancementsScreen) {
			arriba = 33;
			abajo = 33;
		} else if (pantalla instanceof PackSelectionScreen paquetes) {
			HeaderAndFooterLayout disposicion = ((PackSelectionScreenAccessor) paquetes).rataland$disposicion();
			arriba = disposicion.getHeaderHeight();
			abajo = disposicion.getFooterHeight();
			// Entre las dos listas queda un hueco: más oscuro, para que no destaque el paisaje
			g.fill(0, arriba, this.width, this.height - abajo, 0x8C080D1A);
		}
		if (arriba > 0) {
			g.fill(0, 0, this.width, arriba, 0xD9070C18);
			g.fill(0, arriba - 1, this.width, arriba, Estilo.LINEA);
		}
		if (abajo > 0) {
			g.fill(0, this.height - abajo, this.width, this.height, 0xD9070C18);
			g.fill(0, this.height - abajo, this.width, this.height - abajo + 1, Estilo.LINEA);
		}
	}

	@Inject(method = "render", at = @At("TAIL"))
	private void rataland$captura(GuiGraphics context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
		if ((Object) this instanceof StatsScreen estadisticas) {
			ObjectSelectionList<?> lista = ((StatsScreenAccessor) estadisticas).rataland$listaActiva();
			Estadisticas.marcarPestana(context, estadisticas, lista, lista == null ? 0 : ((AbstractSelectionListAccessor) lista).rataland$altoFila());
			if (RataLand.MODO_CAPTURA && lista != null && ++this.rataland$fotogramas == 40) {
				Prueba.alSiguienteTick("rataland-estadisticas.png", Prueba::despuesDeLaPausa);
			}
		}
		if (!RataLand.MODO_CAPTURA) return;
		Minecraft client = Minecraft.getInstance();
		if ((Object) this instanceof OptionsScreen opciones && ++this.rataland$fotogramas == 80) {
			// Opciones, luego una de sus listas (Gráficos) y Paquetes de recursos
			Prueba.alSiguienteTick("rataland-opciones.png", () -> client.setScreen(new VideoSettingsScreen(opciones, client, client.options)));
		} else if ((Object) this instanceof VideoSettingsScreen && ++this.rataland$fotogramas == 40) {
			Prueba.alSiguienteTick("rataland-graficos.png", () -> client.setScreen(new PackSelectionScreen(client.getResourcePackRepository(), (r) -> {},
					client.getResourcePackDirectory(), Component.translatable("resourcePack.title"))));
		} else if ((Object) this instanceof PackSelectionScreen && ++this.rataland$fotogramas == 40) {
			Prueba.alSiguienteTick("rataland-paquetes.png", () -> {
				client.setScreen(new JoinMultiplayerScreen(new TitleScreen()));
				RataLand.LOG.info("Prueba: al abrir Multijugador se muestra {}", client.screen.getClass().getSimpleName());
				// Sigue con el menú de pausa; PausaRataLand hace su captura y sigue con la conexión.
				client.setScreen(new PauseScreen(true));
				RataLand.LOG.info("Prueba: al pausar se muestra {}", client.screen.getClass().getSimpleName());
			});
		}
	}
}
