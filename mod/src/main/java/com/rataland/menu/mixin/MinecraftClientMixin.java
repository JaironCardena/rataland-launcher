package com.rataland.menu.mixin;

import com.rataland.menu.MenuRataLand;
import com.rataland.menu.PausaRataLand;
import com.rataland.menu.RataLand;
import net.minecraft.client.gui.screen.GameMenuScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(MinecraftClient.class)
public abstract class MinecraftClientMixin {
	/**
	 * Cada vez que el juego quiere mostrar la pantalla de título o la lista de servidores
	 * (por ejemplo al salir del servidor o al pulsar Volver), mostramos el menú de RataLand.
	 */
	@ModifyVariable(method = "setScreen", at = @At("HEAD"), argsOnly = true)
	private Screen rataland$cambiarMenu(Screen pantalla) {
		if (pantalla instanceof TitleScreen || pantalla instanceof MultiplayerScreen) return new MenuRataLand();
		// El menú de pausa (Esc). Con F3+Esc el juego se pausa sin menú: ese se deja como está.
		if (pantalla instanceof GameMenuScreen pausa && pausa.shouldShowMenu()) return new PausaRataLand();
		return pantalla;
	}

	@Inject(method = "getWindowTitle", at = @At("HEAD"), cancellable = true)
	private void rataland$tituloVentana(CallbackInfoReturnable<String> cir) {
		cir.setReturnValue(RataLand.nombre);
	}
}
