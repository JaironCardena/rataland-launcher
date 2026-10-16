package com.rataland.menu.mixin;

import net.minecraft.advancements.AdvancementHolder;
import net.minecraft.client.gui.components.toasts.AdvancementToast;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** El logro de un aviso de logro, para mostrarlo en el cartel del centro. */
@Mixin(AdvancementToast.class)
public interface AdvancementToastAccessor {
	@Accessor("advancement")
	AdvancementHolder rataland$logro();
}
