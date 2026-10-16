package com.rataland.menu.mixin;

import com.rataland.menu.Logros;
import net.minecraft.client.multiplayer.chat.ChatListener;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** «X ha conseguido el progreso [Y]» no va al chat: sale en el cartel de logros del centro. */
@Mixin(ChatListener.class)
public abstract class ChatListenerMixin {
	@Inject(method = "handleSystemMessage", at = @At("HEAD"), cancellable = true)
	private void rataland$logros(Component mensaje, boolean remoto, CallbackInfo ci) {
		if (Logros.deChat(mensaje)) ci.cancel();
	}
}
