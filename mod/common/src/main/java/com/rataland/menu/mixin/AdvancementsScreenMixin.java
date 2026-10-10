package com.rataland.menu.mixin;

import com.mojang.blaze3d.systems.RenderSystem;
import com.rataland.menu.Estilo;
import com.rataland.menu.IconosPixel;
import com.rataland.menu.Prueba;
import com.rataland.menu.RataLand;
import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.advancements.AdvancementTab;
import net.minecraft.client.gui.screens.advancements.AdvancementsScreen;
import net.minecraft.network.chat.Component;
import org.jetbrains.annotations.Nullable;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.Map;

/**
 * Progresos con el estilo de RataLand: la ventana es un panel oscuro con un filo de queso alrededor
 * del árbol de logros, el trofeo y el título en claro. El árbol, las pestañas (AdvancementTabTypeMixin)
 * y el recuadro al pasar el ratón (AdvancementWidgetMixin) van aparte.
 */
@Mixin(AdvancementsScreen.class)
public abstract class AdvancementsScreenMixin extends Screen {
	@Unique
	private static final int RATALAND_VENTANA = 0xFF101828;

	@Shadow
	@Final
	private Map<AdvancementHolder, AdvancementTab> tabs;
	@Shadow
	@Nullable
	private AdvancementTab selectedTab;

	@Unique
	private int rataland$fotogramas;

	protected AdvancementsScreenMixin(Component titulo) {
		super(titulo);
	}

	@Inject(method = "renderWindow", at = @At("HEAD"), cancellable = true)
	private void rataland$ventana(GuiGraphics g, int x, int y, CallbackInfo ci) {
		ci.cancel();
		// Solo el marco: el árbol de logros ya está dibujado dentro (9, 18, 234×113)
		g.fill(x + 1, y, x + 251, y + 18, RATALAND_VENTANA);
		g.fill(x + 1, y + 131, x + 251, y + 140, RATALAND_VENTANA);
		g.fill(x, y + 1, x + 9, y + 139, RATALAND_VENTANA);
		g.fill(x + 243, y + 1, x + 252, y + 139, RATALAND_VENTANA);
		Estilo.bordeEscalon(g, x, y, 252, 140, Estilo.LINEA);
		g.renderOutline(x + 8, y + 17, 236, 115, 0x66F6C445);

		RenderSystem.enableBlend();
		if (this.tabs.size() > 1) {
			for (AdvancementTab pestana : this.tabs.values()) pestana.drawTab(g, x, y, pestana == this.selectedTab);
			for (AdvancementTab pestana : this.tabs.values()) pestana.drawIcon(g, x, y);
		}
		Estilo.icono(g, IconosPixel.TROFEO, x + 8, y + 5, 1, Estilo.QUESO);
		Component titulo = this.selectedTab != null ? this.selectedTab.getTitle() : this.title;
		g.drawString(this.font, titulo, x + 21, y + 5, Estilo.TEXTO, false);

		if (RataLand.MODO_CAPTURA && ++this.rataland$fotogramas == 40) {
			Prueba.alSiguienteTick("rataland-progresos.png", Prueba::estadisticas);
		}
	}
}
