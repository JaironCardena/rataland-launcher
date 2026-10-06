package com.rataland.menu.mixin;

import com.rataland.menu.SkinPendiente;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.network.protocol.game.ClientboundLoginPacket;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Al entrar a un servidor se mira si hay una skin del launcher pendiente de poner. */
@Mixin(ClientPacketListener.class)
public abstract class ClientPlayNetworkHandlerMixin {
	@Inject(method = "handleLogin", at = @At("TAIL"))
	private void rataland$alEntrar(ClientboundLoginPacket paquete, CallbackInfo ci) {
		SkinPendiente.alEntrar();
	}
}
