package com.rataland.menu.mixin;

import net.minecraft.client.gui.components.AbstractSelectionList;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** Alto de las filas de una lista: en Estadísticas dice cuál de las tres listas es. */
@Mixin(AbstractSelectionList.class)
public interface AbstractSelectionListAccessor {
	@Accessor("itemHeight")
	int rataland$altoFila();
}
