package com.rataland.menu.neoforge;

import com.rataland.menu.RataLand;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLPaths;

/** Punto de entrada en NeoForge (solo en el cliente): todo lo demás está en el código común. */
@Mod(value = RataLand.MOD_ID, dist = Dist.CLIENT)
public class RataLandNeoForge {
	public RataLandNeoForge() {
		RataLand.iniciar(FMLPaths.CONFIGDIR.get());
	}
}
