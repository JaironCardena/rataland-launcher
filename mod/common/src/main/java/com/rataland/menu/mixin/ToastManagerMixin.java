package com.rataland.menu.mixin;

import com.rataland.menu.Logros;
import com.rataland.menu.RataLand;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.AdvancementToast;
import net.minecraft.client.gui.components.toasts.SystemToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.client.gui.components.toasts.ToastManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Los avisos de Minecraft: en el servidor de la serie no sale el de "Mensajes de chat no verificados"
 * (el servidor admite cuentas sin premium, que no pueden firmar el chat, así que saldría siempre), y
 * tus logros no salen arriba a la derecha (tapaban el minimapa) sino en el cartel del centro (Logros),
 * que se dibuja aquí, encima de todo.
 */
@Mixin(ToastManager.class)
public abstract class ToastManagerMixin {
	@Inject(method = "addToast", at = @At("HEAD"), cancellable = true)
	private void rataland$avisos(Toast aviso, CallbackInfo ci) {
		if (aviso instanceof AdvancementToast logro) {
			Logros.deAviso(((AdvancementToastAccessor) logro).rataland$logro());
			ci.cancel();
			return;
		}
		if (aviso instanceof SystemToast sistema && sistema.getToken() == SystemToast.SystemToastId.UNSECURE_SERVER_WARNING
				&& RataLand.esElServidor(Minecraft.getInstance().getCurrentServer())) {
			RataLand.LOG.info("Aviso de chat no verificado oculto (servidor de la serie)");
			ci.cancel();
		}
	}

	@Inject(method = "extractRenderState", at = @At("TAIL"))
	private void rataland$cartelDeLogros(GuiGraphicsExtractor g, CallbackInfo ci) {
		Logros.dibujar(g, g.guiWidth(), g.guiHeight(), false);
	}
}
