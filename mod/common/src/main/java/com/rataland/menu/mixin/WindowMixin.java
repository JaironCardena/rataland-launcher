package com.rataland.menu.mixin;

import com.mojang.blaze3d.platform.IconSet;
import com.mojang.blaze3d.platform.Window;
import com.rataland.menu.Iconos;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import java.io.InputStream;
import java.util.List;
import net.minecraft.server.packs.PackResources;
import net.minecraft.server.packs.resources.IoSupplier;

/** La ventana del juego usa el icono de RataLand en lugar del bloque de hierba. */
@Mixin(Window.class)
public abstract class WindowMixin {
	@Redirect(method = "setIcon", at = @At(value = "INVOKE",
			target = "Lcom/mojang/blaze3d/platform/IconSet;getStandardIcons(Lnet/minecraft/server/packs/PackResources;)Ljava/util/List;"))
	private List<IoSupplier<InputStream>> rataland$icono(IconSet icons, PackResources pack) {
		return Iconos.lista();
	}
}
