package com.rataland.menu.mixin;

import net.minecraft.client.gui.screens.achievement.StatsScreen;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.network.protocol.Packet;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Estadísticas pide los datos al servidor al abrirse. En las pruebas del mod no hay servidor: sin
 * conexión no se pide nada (en el juego siempre la hay y no cambia nada).
 */
@Mixin(StatsScreen.class)
public abstract class StatsScreenMixin {
	@Redirect(method = "init", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/multiplayer/ClientPacketListener;send(Lnet/minecraft/network/protocol/Packet;)V"))
	private void rataland$pedirDatos(ClientPacketListener red, Packet<?> paquete) {
		if (red != null) red.send(paquete);
	}
}
