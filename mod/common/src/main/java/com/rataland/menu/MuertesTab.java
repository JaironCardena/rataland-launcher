package com.rataland.menu;

import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.ReadOnlyScoreInfo;
import net.minecraft.world.scores.ScoreHolder;
import net.minecraft.world.scores.Scoreboard;
import org.jetbrains.annotations.Nullable;

/** Muertes que comparte el servidor: se dibujan únicamente en la lista de Tab. */
public final class MuertesTab {

	/** El servidor lo comparte en sidebar; el mod oculta su dibujo normal. */
	public static final String OBJETIVO = "rataland_muertes";

	private MuertesTab() {}

	public static boolean esObjetivo(@Nullable Objective objetivo) {
		return objetivo != null && OBJETIVO.equals(objetivo.getName());
	}

	/** null = el servidor no comparte el contador; sin puntuación aún = ninguna muerte. */
	@Nullable
	public static Integer deJugador(Scoreboard marcador, ScoreHolder jugador) {
		Objective objetivo = marcador.getObjective(OBJETIVO);
		if (objetivo == null) return null;
		ReadOnlyScoreInfo valor = marcador.getPlayerScoreInfo(jugador, objetivo);
		return valor == null ? 0 : Math.max(0, valor.value());
	}
}
