package com.rataland.menu.mixin;

import com.rataland.menu.Logros;
import com.rataland.menu.Muertes;
import com.rataland.menu.Reinicio;
import net.minecraft.client.multiplayer.chat.ChatListener;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Lo que no va al chat: «X ha conseguido el progreso [Y]» (sale en el aviso de logros), la muerte de
 * un jugador (sale en el cartel del centro) y los mensajes de World Reset; y encima de la barra de
 * objetos, su cuenta atrás (sale como aviso).
 */
@Mixin(ChatListener.class)
public abstract class ChatListenerMixin {
	@Inject(method = "handleSystemMessage", at = @At("HEAD"), cancellable = true)
	private void rataland$sistema(Component mensaje, boolean remoto, CallbackInfo ci) {
		if (Logros.deChat(mensaje) || Muertes.deChat(mensaje) || Reinicio.deChat(mensaje)) ci.cancel();
	}

	@Inject(method = "handleOverlay", at = @At("HEAD"), cancellable = true)
	private void rataland$encima(Component mensaje, CallbackInfo ci) {
		if (Reinicio.deEncima(mensaje)) ci.cancel();
	}
}
