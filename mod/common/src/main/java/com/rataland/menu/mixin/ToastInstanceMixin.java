package com.rataland.menu.mixin;

import com.rataland.menu.Avisos;
import net.minecraft.client.gui.components.toasts.Toast;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Los avisos (los de RataLand y los de Minecraft) salen arriba en el centro y bajan desde el borde,
 * en vez de entrar por la derecha: arriba a la derecha tapaban el minimapa.
 */
@Mixin(targets = "net.minecraft.client.gui.components.toasts.ToastManager$ToastInstance")
public abstract class ToastInstanceMixin {
	@Shadow
	private float visiblePortion;

	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/components/toasts/Toast;xPos(IF)F"))
	private float rataland$centro(Toast aviso, int anchoPantalla, float visible) {
		return (anchoPantalla - aviso.width()) / 2f;
	}

	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/components/toasts/Toast;yPos(I)F"))
	private float rataland$arriba(Toast aviso, int hueco) {
		float sitio = Avisos.arriba() + aviso.yPos(hueco);
		return sitio - (1f - this.visiblePortion) * (sitio + aviso.height());
	}
}
