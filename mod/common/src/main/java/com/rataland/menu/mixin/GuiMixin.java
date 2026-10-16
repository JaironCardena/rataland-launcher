package com.rataland.menu.mixin;

import com.rataland.menu.MenuRataLand;
import com.rataland.menu.PantallaDesconectado;
import com.rataland.menu.PantallaEspera;
import com.rataland.menu.PausaRataLand;
import com.rataland.menu.SalaEspera;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.screens.DisconnectedScreen;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/** Las pantallas de Minecraft que RataLand cambia por las suyas (desde 26.1 las pone Gui, no Minecraft). */
@Mixin(Gui.class)
public abstract class GuiMixin {
	/**
	 * Cada vez que el juego quiere mostrar la pantalla de título o la lista de servidores
	 * (por ejemplo al salir del servidor o al pulsar Volver), mostramos el menú de RataLand; y si no se
	 * pudo entrar o te echan, la pantalla de RataLand que explica qué pasó.
	 */
	@ModifyVariable(method = "setScreen", at = @At("HEAD"), argsOnly = true)
	private Screen rataland$cambiarMenu(Screen pantalla) {
		if (pantalla instanceof TitleScreen || pantalla instanceof JoinMultiplayerScreen) return new MenuRataLand();
		// El menú de pausa (Esc). Con F3+Esc el juego se pausa sin menú: ese se deja como está.
		if (pantalla instanceof PauseScreen pausa && pausa.showsPauseMenu()) return new PausaRataLand();
		if (pantalla instanceof DisconnectedScreen desconectado) {
			Component razon = ((DisconnectedScreenAccessor) desconectado).rataland$detalles().reason();
			// Con el servidor despertándose no es un error: se espera y se vuelve a intentar solo
			if (SalaEspera.seEspera(razon)) return new PantallaEspera(razon);
			SalaEspera.terminar();
			return new PantallaDesconectado(razon);
		}
		return pantalla;
	}
}
