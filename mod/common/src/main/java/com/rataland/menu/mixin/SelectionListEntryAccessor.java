package com.rataland.menu.mixin;

import net.minecraft.client.gui.components.AbstractSelectionList;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** La lista a la que pertenece una fila (para saber si es par o impar en Estadísticas). */
@Mixin(targets = "net.minecraft.client.gui.components.AbstractSelectionList$Entry")
public interface SelectionListEntryAccessor {
	@Accessor("list")
	AbstractSelectionList<?> rataland$lista();
}
