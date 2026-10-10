package com.rataland.menu.mixin;

import net.minecraft.client.gui.components.ObjectSelectionList;
import net.minecraft.client.gui.screens.achievement.StatsScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** La lista que se ve ahora en Estadísticas (General, Objetos o Criaturas). */
@Mixin(StatsScreen.class)
public interface StatsScreenAccessor {
	@Accessor("activeList")
	ObjectSelectionList<?> rataland$listaActiva();
}
