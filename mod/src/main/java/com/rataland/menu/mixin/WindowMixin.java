package com.rataland.menu.mixin;

import com.rataland.menu.Iconos;
import net.minecraft.client.util.Icons;
import net.minecraft.client.util.Window;
import net.minecraft.resource.InputSupplier;
import net.minecraft.resource.ResourcePack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import java.io.InputStream;
import java.util.List;

/** La ventana del juego usa el icono de RataLand en lugar del bloque de hierba. */
@Mixin(Window.class)
public abstract class WindowMixin {
	@Redirect(method = "setIcon", at = @At(value = "INVOKE",
			target = "Lnet/minecraft/client/util/Icons;getIcons(Lnet/minecraft/resource/ResourcePack;)Ljava/util/List;"))
	private List<InputSupplier<InputStream>> rataland$icono(Icons icons, ResourcePack pack) {
		return Iconos.lista();
	}
}
