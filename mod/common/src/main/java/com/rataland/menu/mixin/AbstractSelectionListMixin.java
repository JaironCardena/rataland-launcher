package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractSelectionList;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.achievement.StatsScreen;
import net.minecraft.client.gui.screens.options.OptionsSubScreen;
import net.minecraft.client.gui.screens.packs.PackSelectionScreen;
import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Las listas de Opciones (Gráficos, Controles, Música y sonido, Idioma, Chat, Accesibilidad…), de
 * Paquetes de recursos y de Estadísticas con el estilo de RataLand: fondo oscuro liso en vez de la
 * textura de Minecraft, filos claros arriba y abajo, la elegida con borde de queso y la barra de
 * desplazamiento de queso. Las listas de otras pantallas no cambian.
 */
@Mixin(AbstractSelectionList.class)
public abstract class AbstractSelectionListMixin {
	@Unique
	private static boolean rataland$conEstilo() {
		Screen pantalla = Minecraft.getInstance().screen;
		return pantalla instanceof OptionsSubScreen || pantalla instanceof PackSelectionScreen || pantalla instanceof StatsScreen;
	}

	@Unique
	private AbstractSelectionList<?> rataland$lista() {
		return (AbstractSelectionList<?>) (Object) this;
	}

	@Inject(method = "renderListBackground", at = @At("HEAD"), cancellable = true)
	private void rataland$fondo(GuiGraphics g, CallbackInfo ci) {
		if (!rataland$conEstilo()) return;
		ci.cancel();
		AbstractSelectionList<?> lista = rataland$lista();
		g.fill(lista.getX(), lista.getY(), lista.getRight(), lista.getBottom(), 0x99080D1A);
	}

	@Inject(method = "renderListSeparators", at = @At("HEAD"), cancellable = true)
	private void rataland$filos(GuiGraphics g, CallbackInfo ci) {
		if (!rataland$conEstilo()) return;
		ci.cancel();
		AbstractSelectionList<?> lista = rataland$lista();
		g.fill(lista.getX(), lista.getY() - 1, lista.getRight(), lista.getY(), Estilo.LINEA);
		g.fill(lista.getX(), lista.getBottom(), lista.getRight(), lista.getBottom() + 1, Estilo.LINEA);
	}

	/** La fila elegida (el idioma, un paquete…): borde de queso si la lista tiene el foco, gris si no. */
	@Inject(method = "renderSelection", at = @At("HEAD"), cancellable = true)
	private void rataland$elegida(GuiGraphics g, int arriba, int ancho, int alto, int borde, int relleno, CallbackInfo ci) {
		if (!rataland$conEstilo()) return;
		ci.cancel();
		AbstractSelectionList<?> lista = rataland$lista();
		int x0 = lista.getX() + (lista.getWidth() - ancho) / 2;
		int x1 = lista.getX() + (lista.getWidth() + ancho) / 2;
		g.fill(x0, arriba - 2, x1, arriba + alto + 2, borde == -1 ? Estilo.QUESO : Estilo.MUY_TENUE);
		g.fill(x0 + 1, arriba - 1, x1 - 1, arriba + alto + 1, 0xF00D1424);
	}

	@Redirect(method = "renderWidget", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/GuiGraphics;blitSprite(Lnet/minecraft/resources/ResourceLocation;IIII)V"))
	private void rataland$barra(GuiGraphics g, ResourceLocation sprite, int x, int y, int w, int h) {
		if (!rataland$conEstilo()) {
			g.blitSprite(sprite, x, y, w, h);
			return;
		}
		if (sprite.getPath().endsWith("scroller_background")) {
			g.fill(x + 1, y, x + w - 1, y + h, 0xCC0A0F1C);
		} else {
			g.fill(x + 1, y, x + w - 1, y + h, Estilo.QUESO_SOMBRA);
			g.fill(x + 1, y, x + 2, y + h, Estilo.QUESO);
		}
	}
}
