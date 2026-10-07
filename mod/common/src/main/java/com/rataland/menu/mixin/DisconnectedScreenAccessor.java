package com.rataland.menu.mixin;

import net.minecraft.client.gui.screens.DisconnectedScreen;
import net.minecraft.network.DisconnectionDetails;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** Para leer por qué se cortó la conexión y enseñarlo explicado en la pantalla de RataLand. */
@Mixin(DisconnectedScreen.class)
public interface DisconnectedScreenAccessor {
	@Accessor("details")
	DisconnectionDetails rataland$detalles();
}
