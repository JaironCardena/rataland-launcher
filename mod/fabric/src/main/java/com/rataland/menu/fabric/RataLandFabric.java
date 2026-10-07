package com.rataland.menu.fabric;

import com.rataland.menu.RataLand;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.loader.api.FabricLoader;

/** Punto de entrada en Fabric: todo lo demás está en el código común. */
public class RataLandFabric implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		RataLand.iniciar(FabricLoader.getInstance().getConfigDir(), "Fabric");
	}
}
