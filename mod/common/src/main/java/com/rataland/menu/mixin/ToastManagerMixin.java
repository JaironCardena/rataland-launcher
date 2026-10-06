package com.rataland.menu.mixin;

import com.rataland.menu.RataLand;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.toasts.SystemToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastComponent;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * En el servidor de la serie no sale el aviso de "Mensajes de chat no verificados": el servidor
 * admite cuentas sin premium, que no pueden firmar el chat, así que ese aviso saldría siempre.
 */
@Mixin(ToastComponent.class)
public abstract class ToastManagerMixin {
	@Inject(method = "addToast", at = @At("HEAD"), cancellable = true)
	private void rataland$sinAvisoDeChat(Toast aviso, CallbackInfo ci) {
		if (aviso instanceof SystemToast sistema && sistema.getToken() == SystemToast.SystemToastId.UNSECURE_SERVER_WARNING
				&& RataLand.esElServidor(Minecraft.getInstance().getCurrentServer())) {
			RataLand.LOG.info("Aviso de chat no verificado oculto (servidor de la serie)");
			ci.cancel();
		}
	}
}
