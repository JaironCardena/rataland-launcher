package com.rataland.menu.mixin;

import net.minecraft.client.gui.layouts.HeaderAndFooterLayout;
import net.minecraft.client.gui.screens.packs.PackSelectionScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** La cabecera y el pie de Paquetes de recursos, para poner las franjas a su medida. */
@Mixin(PackSelectionScreen.class)
public interface PackSelectionScreenAccessor {
	@Accessor("layout")
	HeaderAndFooterLayout rataland$disposicion();
}
