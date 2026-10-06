package com.rataland.menu.mixin;

import com.rataland.menu.RataLand;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.toast.SystemToast;
import net.minecraft.client.toast.Toast;
import net.minecraft.client.toast.ToastManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * En el servidor de la serie no sale el aviso de "Mensajes de chat no verificados": el servidor
 * admite cuentas sin premium, que no pueden firmar el chat, así que ese aviso saldría siempre.
 */
@Mixin(ToastManager.class)
public abstract class ToastManagerMixin {
	@Inject(method = "add", at = @At("HEAD"), cancellable = true)
	private void rataland$sinAvisoDeChat(Toast aviso, CallbackInfo ci) {
		if (aviso instanceof SystemToast sistema && sistema.getType() == SystemToast.Type.UNSECURE_SERVER_WARNING
				&& RataLand.esElServidor(MinecraftClient.getInstance().getCurrentServerEntry())) {
			RataLand.LOG.info("Aviso de chat no verificado oculto (servidor de la serie)");
			ci.cancel();
		}
	}
}
