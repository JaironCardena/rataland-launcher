package com.rataland.menu.mixin;

import net.minecraft.client.gui.layouts.HeaderAndFooterLayout;
import net.minecraft.client.gui.screens.achievement.StatsScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** Estadísticas: su cabecera (con las pestañas) y su pie, para las franjas oscuras. */
@Mixin(StatsScreen.class)
public interface StatsScreenAccessor {
	@Accessor("layout")
	HeaderAndFooterLayout rataland$disposicion();
}
