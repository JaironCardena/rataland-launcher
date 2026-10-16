package com.rataland.menu.mixin;

import com.rataland.menu.Avisos;
import com.rataland.menu.Conexion;
import com.rataland.menu.EstadoServidor;
import com.rataland.menu.Prueba;
import com.rataland.menu.RataLand;
import com.rataland.menu.SkinPendiente;
import net.minecraft.client.Minecraft;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(Minecraft.class)
public abstract class MinecraftClientMixin {
	@Inject(method = "tick", at = @At("TAIL"))
	private void rataland$tick(CallbackInfo ci) {
		Minecraft juego = (Minecraft) (Object) this;
		SkinPendiente.tick(juego);
		EstadoServidor.tick();
		Conexion.tick(juego);
		Avisos.tick(juego);
		if (RataLand.MODO_CAPTURA) Prueba.tick(juego);
	}

	@Inject(method = "createTitle", at = @At("HEAD"), cancellable = true)
	private void rataland$tituloVentana(CallbackInfoReturnable<String> cir) {
		cir.setReturnValue(RataLand.nombre);
	}
}
