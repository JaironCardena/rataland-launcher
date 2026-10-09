package com.rataland.menu.mixin;

import com.rataland.menu.AvisoRataLand;
import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.advancements.AdvancementType;
import net.minecraft.advancements.DisplayInfo;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.toasts.AdvancementToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastComponent;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.sounds.SoundEvents;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Los avisos de logros de Minecraft con el aspecto de los avisos de RataLand (y su mismo ancho, para
 * que se apilen alineados). El sonido de los desafíos se mantiene, como en Minecraft.
 */
@Mixin(AdvancementToast.class)
public abstract class AdvancementToastMixin implements Toast {
	@Shadow
	@Final
	private AdvancementHolder advancement;
	@Shadow
	private boolean playedSound;

	@Override
	public int width() {
		return AvisoRataLand.ANCHO;
	}

	@Inject(method = "render", at = @At("HEAD"), cancellable = true)
	private void rataland$logro(GuiGraphics g, ToastComponent avisos, long tiempo, CallbackInfoReturnable<Toast.Visibility> cir) {
		DisplayInfo info = this.advancement.value().display().orElse(null);
		if (info == null) {
			cir.setReturnValue(Toast.Visibility.HIDE);
			return;
		}
		if (!this.playedSound && tiempo > 0L) {
			this.playedSound = true;
			if (info.getType() == AdvancementType.CHALLENGE) {
				avisos.getMinecraft().getSoundManager().play(SimpleSoundInstance.forUI(SoundEvents.UI_TOAST_CHALLENGE_COMPLETE, 1.0F, 1.0F));
			}
		}
		AvisoRataLand.dibujarLogro(g, info.getType(), info.getTitle(), info.getIcon());
		cir.setReturnValue(tiempo >= 5000.0 * avisos.getNotificationDisplayTimeMultiplier() ? Toast.Visibility.HIDE : Toast.Visibility.SHOW);
	}
}
