package com.rataland.menu.mixin;

import net.minecraft.client.gui.components.toasts.ToastManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

import java.util.BitSet;

/** Los huecos de avisos ocupados, para poner el cartel de logros debajo. */
@Mixin(ToastManager.class)
public interface ToastManagerAccessor {
	@Accessor("occupiedSlots")
	BitSet rataland$huecos();
}
