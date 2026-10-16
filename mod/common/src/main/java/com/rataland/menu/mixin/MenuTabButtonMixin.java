package com.rataland.menu.mixin;

import com.mojang.renderpearl.api.pipeline.RenderPipeline;
import com.rataland.menu.Estilo;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.TabButton;
import net.minecraft.client.gui.components.tabs.MenuTabBar;
import net.minecraft.client.gui.components.tabs.Tab;
import net.minecraft.client.gui.components.tabs.TabManager;
import net.minecraft.resources.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Las pestañas de arriba (Estadísticas: General, Objetos, Criaturas; también al crear un mundo) con
 * el estilo de las de Progresos: oscuras, la elegida con borde de queso y su raya de queso debajo.
 */
@Mixin(MenuTabBar.MenuTabButton.class)
public abstract class MenuTabButtonMixin extends TabButton {
	public MenuTabButtonMixin(TabManager pestanas, Tab pestana, int ancho, int alto) {
		super(pestanas, pestana, ancho, alto);
	}

	@Redirect(method = "extractWidgetRenderState", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;blitSprite(Lcom/mojang/renderpearl/api/pipeline/RenderPipeline;Lnet/minecraft/resources/Identifier;IIII)V"))
	private void rataland$pestana(GuiGraphicsExtractor g, RenderPipeline tuberia, Identifier sprite, int x, int y, int w, int h) {
		boolean elegida = this.isSelected();
		int arriba = elegida ? y : y + 3;
		Estilo.escalon(g, x, arriba, w, y + h - arriba, elegida ? 0xFF101828 : 0xFF0A0F1A);
		Estilo.bordeEscalon(g, x, arriba, w, y + h - arriba, elegida ? Estilo.QUESO : Estilo.LINEA);
		if (!elegida && this.isHoveredOrFocused() && this.active) g.fill(x + 1, arriba + 1, x + w - 1, y + h - 1, 0x18F6C445);
	}

	/** Dentro de la elegida, en vez de la textura de tierra de Minecraft, el mismo fondo oscuro. */
	@Inject(method = "renderMenuBackground", at = @At("HEAD"), cancellable = true)
	private void rataland$fondo(GuiGraphicsExtractor g, int x0, int y0, int x1, int y1, CallbackInfo ci) {
		ci.cancel();
		g.fill(x0, y0, x1, y1, 0xFF101828);
	}

	@ModifyArg(method = "extractWidgetRenderState", index = 2, at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/gui/components/tabs/MenuTabBar$MenuTabButton;renderFocusUnderline(Lnet/minecraft/client/gui/GuiGraphicsExtractor;Lnet/minecraft/client/gui/Font;I)V"))
	private int rataland$raya(int color) {
		return this.active ? Estilo.QUESO : Estilo.MUY_TENUE;
	}
}
