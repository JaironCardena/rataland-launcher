package com.rataland.menu.mixin;

import com.mojang.renderpearl.api.pipeline.RenderPipeline;
import com.rataland.menu.AvisoRataLand;
import com.rataland.menu.Estilo;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.toasts.RecipeToast;
import net.minecraft.client.gui.components.toasts.Toast;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * «¡Nuevas recetas!» con la tarjeta compacta de RataLand: el objeto nuevo, el título en queso y el
 * texto en tenue. Las recetas siguen pasando como en Minecraft.
 */
@Mixin(RecipeToast.class)
public abstract class RecipeToastMixin implements Toast {
	@Override
	public int width() {
		Font fuente = Minecraft.getInstance().font;
		return AvisoRataLand.anchoPara(fuente, Math.max(fuente.width(Component.translatable("recipe.toast.title")),
				fuente.width(Component.translatable("recipe.toast.description"))));
	}

	@Override
	public int height() {
		return AvisoRataLand.ALTO;
	}

	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;blitSprite(Lcom/mojang/renderpearl/api/pipeline/RenderPipeline;Lnet/minecraft/resources/Identifier;IIII)V"))
	private void rataland$fondo(GuiGraphicsExtractor g, RenderPipeline tuberia, Identifier sprite, int x, int y, int w, int h) {
		AvisoRataLand.fondo(g, this.width(), this.height(), AvisoRataLand.BORDE);
	}

	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", ordinal = 0,
			target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;text(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)V"))
	private void rataland$titulo(GuiGraphicsExtractor g, Font fuente, Component texto, int x, int y, int color, boolean sombra) {
		g.text(fuente, texto, AvisoRataLand.TEXTO_X, 3, Estilo.QUESO, false);
	}

	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", ordinal = 1,
			target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;text(Lnet/minecraft/client/gui/Font;Lnet/minecraft/network/chat/Component;IIIZ)V"))
	private void rataland$texto(GuiGraphicsExtractor g, Font fuente, Component texto, int x, int y, int color, boolean sombra) {
		g.text(fuente, texto, AvisoRataLand.TEXTO_X, 13, Estilo.TENUE, false);
	}

	/** El objeto pequeño de la categoría no se pinta: solo el de la receta nueva, como icono. */
	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", ordinal = 0, target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;fakeItem(Lnet/minecraft/world/item/ItemStack;II)V"))
	private void rataland$sinCategoria(GuiGraphicsExtractor g, ItemStack objeto, int x, int y) {
	}

	@Redirect(method = "extractRenderState", at = @At(value = "INVOKE", ordinal = 1, target = "Lnet/minecraft/client/gui/GuiGraphicsExtractor;fakeItem(Lnet/minecraft/world/item/ItemStack;II)V"))
	private void rataland$objeto(GuiGraphicsExtractor g, ItemStack objeto, int x, int y) {
		g.fakeItem(objeto, 5, 4);
	}
}
