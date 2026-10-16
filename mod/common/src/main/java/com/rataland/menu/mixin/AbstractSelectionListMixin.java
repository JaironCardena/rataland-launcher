package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractSelectionList;
import net.minecraft.client.gui.layouts.LayoutElement;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Coerce;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Las listas de Opciones (Gráficos, Controles, Música y sonido, Idioma, Chat, Accesibilidad…), de
 * Paquetes de recursos y de Estadísticas con el estilo de RataLand: fondo oscuro liso en vez de la
 * textura de Minecraft, filos claros arriba y abajo y la elegida con borde de queso (la barra de
 * desplazamiento de queso va en AbstractScrollAreaMixin). Las listas de otras pantallas no cambian.
 */
@Mixin(AbstractSelectionList.class)
public abstract class AbstractSelectionListMixin {
	@Unique
	private AbstractSelectionList<?> rataland$lista() {
		return (AbstractSelectionList<?>) (Object) this;
	}

	@Inject(method = "extractListBackground", at = @At("HEAD"), cancellable = true)
	private void rataland$fondo(GuiGraphicsExtractor g, CallbackInfo ci) {
		if (!Estilo.listaConEstilo()) return;
		ci.cancel();
		AbstractSelectionList<?> lista = rataland$lista();
		g.fill(lista.getX(), lista.getY(), lista.getRight(), lista.getBottom(), 0x99080D1A);
	}

	@Inject(method = "extractListSeparators", at = @At("HEAD"), cancellable = true)
	private void rataland$filos(GuiGraphicsExtractor g, CallbackInfo ci) {
		if (!Estilo.listaConEstilo()) return;
		ci.cancel();
		AbstractSelectionList<?> lista = rataland$lista();
		g.fill(lista.getX(), lista.getY() - 1, lista.getRight(), lista.getY(), Estilo.LINEA);
		g.fill(lista.getX(), lista.getBottom(), lista.getRight(), lista.getBottom() + 1, Estilo.LINEA);
	}

	/** La fila elegida (el idioma, un paquete…): borde de queso si la lista tiene el foco, gris si no. */
	@Inject(method = "extractSelection", at = @At("HEAD"), cancellable = true)
	private void rataland$elegida(GuiGraphicsExtractor g, @Coerce LayoutElement fila, int borde, CallbackInfo ci) {
		if (!Estilo.listaConEstilo()) return;
		ci.cancel();
		int x0 = fila.getX();
		int y0 = fila.getY();
		int x1 = x0 + fila.getWidth();
		int y1 = y0 + fila.getHeight();
		g.fill(x0, y0, x1, y1, borde == -1 ? Estilo.QUESO : Estilo.MUY_TENUE);
		g.fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, 0xF00D1424);
	}
}
