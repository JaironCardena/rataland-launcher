package com.rataland.menu.mixin;

import com.rataland.menu.SkinPendiente;
import net.minecraft.client.network.ClientPlayNetworkHandler;
import net.minecraft.network.packet.s2c.play.GameJoinS2CPacket;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Al entrar a un servidor se mira si hay una skin del launcher pendiente de poner. */
@Mixin(ClientPlayNetworkHandler.class)
public abstract class ClientPlayNetworkHandlerMixin {
	@Inject(method = "onGameJoin", at = @At("TAIL"))
	private void rataland$alEntrar(GameJoinS2CPacket paquete, CallbackInfo ci) {
		SkinPendiente.alEntrar();
	}
}
