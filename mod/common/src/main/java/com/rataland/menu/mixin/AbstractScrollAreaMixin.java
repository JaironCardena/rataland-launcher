package com.rataland.menu.mixin;

import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractScrollArea;
import net.minecraft.client.gui.components.AbstractSelectionList;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** La barra de desplazamiento de las listas con el estilo de RataLand (ver AbstractSelectionListMixin): de queso sobre oscuro. */
@Mixin(AbstractScrollArea.class)
public abstract class AbstractScrollAreaMixin extends AbstractWidget {
	public AbstractScrollAreaMixin(int x, int y, int ancho, int alto, Component texto) {
		super(x, y, ancho, alto, texto);
	}

	@Shadow
	protected abstract boolean scrollable();

	@Shadow
	protected abstract int scrollerHeight();

	@Shadow
	protected abstract int scrollBarX();

	@Shadow
	public abstract int scrollBarY();

	@Shadow
	public abstract int scrollbarWidth();

	@Inject(method = "extractScrollbar", at = @At("HEAD"), cancellable = true)
	private void rataland$barra(GuiGraphicsExtractor g, int mouseX, int mouseY, CallbackInfo ci) {
		if (!((Object) this instanceof AbstractSelectionList) || !Estilo.listaConEstilo()) return;
		ci.cancel();
		if (!this.scrollable()) return;
		int x = this.scrollBarX();
		int w = this.scrollbarWidth();
		g.fill(x + 1, this.getY(), x + w - 1, this.getBottom(), 0xCC0A0F1C);
		int y = this.scrollBarY();
		int h = this.scrollerHeight();
		g.fill(x + 1, y, x + w - 1, y + h, Estilo.QUESO_SOMBRA);
		g.fill(x + 1, y, x + 2, y + h, Estilo.QUESO);
	}
}
