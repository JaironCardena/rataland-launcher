package com.rataland.menu.mixin;

import com.rataland.menu.MuertesTab;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.world.scores.Objective;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** El sidebar solo transporta las muertes: el contador se ve al pulsar Tab. */
@Mixin(Gui.class)
public abstract class GuiMixin {
	@Inject(method = "displayScoreboardSidebar", at = @At("HEAD"), cancellable = true)
	private void rataland$muertesSoloEnTab(GuiGraphics g, Objective objetivo, CallbackInfo ci) {
		if (MuertesTab.esObjetivo(objetivo)) ci.cancel();
	}
}
