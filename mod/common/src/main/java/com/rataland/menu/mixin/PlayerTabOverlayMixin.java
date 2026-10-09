package com.rataland.menu.mixin;

import com.rataland.menu.TablaJugadores;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.PlayerTabOverlay;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.numbers.StyledFormat;
import net.minecraft.world.level.GameType;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.ReadOnlyScoreInfo;
import net.minecraft.world.scores.ScoreHolder;
import net.minecraft.world.scores.Scoreboard;
import org.jetbrains.annotations.Nullable;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** La lista de jugadores (Tab) se dibuja con el estilo de RataLand (TablaJugadores). */
@Mixin(PlayerTabOverlay.class)
public abstract class PlayerTabOverlayMixin {
	@Shadow
	@Final
	private Minecraft minecraft;
	@Shadow
	@Nullable
	private Component header;
	@Shadow
	@Nullable
	private Component footer;

	@Shadow
	private List<PlayerInfo> getPlayerInfos() {
		throw new AssertionError();
	}

	@Shadow
	public abstract Component getNameForDisplay(PlayerInfo info);

	@Inject(method = "render", at = @At("HEAD"), cancellable = true)
	private void rataland$tabla(GuiGraphics g, int ancho, Scoreboard marcador, @Nullable Objective objetivo, CallbackInfo ci) {
		ci.cancel();
		UUID yo = this.minecraft.player != null ? this.minecraft.player.getUUID() : null;
		List<TablaJugadores.Fila> filas = new ArrayList<>();
		for (PlayerInfo info : this.getPlayerInfos()) {
			Component puntos = null;
			if (objetivo != null) {
				ReadOnlyScoreInfo valor = marcador.getPlayerScoreInfo(ScoreHolder.fromGameProfile(info.getProfile()), objetivo);
				puntos = ReadOnlyScoreInfo.safeFormatValue(valor, objetivo.numberFormatOrDefault(StyledFormat.PLAYER_LIST_DEFAULT));
			}
			filas.add(new TablaJugadores.Fila(this.getNameForDisplay(info), info.getSkin(), info.getLatency(),
					info.getGameMode() == GameType.SPECTATOR, info.getProfile().getId().equals(yo), puntos));
		}
		TablaJugadores.dibujar(g, this.minecraft.font, ancho, this.header, this.footer, filas);
	}
}
