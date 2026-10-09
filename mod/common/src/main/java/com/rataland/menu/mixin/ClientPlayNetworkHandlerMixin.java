package com.rataland.menu.mixin;

import com.rataland.menu.Avisos;
import com.rataland.menu.SkinPendiente;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.network.protocol.game.ClientboundLoginPacket;
import net.minecraft.network.protocol.game.ClientboundPlayerInfoRemovePacket;
import net.minecraft.network.protocol.game.ClientboundPlayerInfoUpdatePacket;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Al entrar a un servidor se mira si hay una skin del launcher pendiente de poner; y cuando llega
 * alguien nuevo, el aviso de quién ha entrado (sin contar a quien solo se quita y se vuelve a
 * añadir a la lista para ponerle la skin).
 */
@Mixin(ClientPacketListener.class)
public abstract class ClientPlayNetworkHandlerMixin {
	@Inject(method = "handleLogin", at = @At("TAIL"))
	private void rataland$alEntrar(ClientboundLoginPacket paquete, CallbackInfo ci) {
		SkinPendiente.alEntrar();
		Avisos.alEntrar();
	}

	@Inject(method = "handlePlayerInfoRemove", at = @At("TAIL"))
	private void rataland$quitados(ClientboundPlayerInfoRemovePacket paquete, CallbackInfo ci) {
		Avisos.quitados(paquete.profileIds());
	}

	@Inject(method = "handlePlayerInfoUpdate", at = @At("TAIL"))
	private void rataland$jugadores(ClientboundPlayerInfoUpdatePacket paquete, CallbackInfo ci) {
		Avisos.jugadores(paquete, (ClientPacketListener) (Object) this);
	}
}
