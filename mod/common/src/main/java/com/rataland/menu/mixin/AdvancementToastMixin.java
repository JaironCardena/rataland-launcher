package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.advancements.DisplayInfo;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.AdvancementToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.world.item.ItemStack;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Los avisos de logros de Minecraft con el aspecto de los avisos de RataLand (y su mismo ancho, para
 * que se apilen alineados). Cuánto duran y el sonido de los desafíos son los de Minecraft.
 */
@Mixin(AdvancementToast.class)
public abstract class AdvancementToastMixin implements Toast {
	@Shadow
	@Final
	private AdvancementHolder advancement;
	@Shadow
	@Final
	private ItemStack iconItem;

	@Override
	public int width() {
		return AvisoRataLand.ANCHO;
	}

	@Inject(method = "extractRenderState", at = @At("HEAD"), cancellable = true)
	private void rataland$logro(GuiGraphicsExtractor g, Font fuente, long tiempo, CallbackInfo ci) {
		ci.cancel();
		DisplayInfo info = this.advancement.value().display().orElse(null);
		if (info != null) AvisoRataLand.dibujarLogro(g, info.type(), info.title(), this.iconItem);
	}
}
