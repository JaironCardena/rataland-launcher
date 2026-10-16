package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.advancements.DisplayInfo;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.AdvancementToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.world.item.ItemStack;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Por si algún aviso de logro de Minecraft llega a verse (normalmente se cambia por el de Logros): con
 * la misma tarjeta que los logros de RataLand.
 */
@Mixin(AdvancementToast.class)
public abstract class AdvancementToastMixin implements Toast {
	@Shadow
	@Final
	private AdvancementHolder advancement;
	@Shadow
	@Final
	private ItemStack iconItem;

	@Unique
	private AvisoRataLand rataland$tarjeta() {
		DisplayInfo info = this.advancement.value().display().orElse(null);
		Minecraft juego = Minecraft.getInstance();
		String quien = juego.player != null ? juego.player.getGameProfile().name() : "";
		return info == null ? null : AvisoRataLand.logro(info.type(), quien, true, info.title().getString(), this.iconItem);
	}

	@Override
	public int width() {
		AvisoRataLand tarjeta = rataland$tarjeta();
		return tarjeta == null ? AvisoRataLand.ANCHO_MIN : tarjeta.width();
	}

	@Override
	public int height() {
		return AvisoRataLand.ALTO;
	}

	@Inject(method = "extractRenderState", at = @At("HEAD"), cancellable = true)
	private void rataland$logro(GuiGraphicsExtractor g, Font fuente, long tiempo, CallbackInfo ci) {
		ci.cancel();
		AvisoRataLand tarjeta = rataland$tarjeta();
		if (tarjeta != null) tarjeta.extractRenderState(g, fuente, tiempo);
	}
}
