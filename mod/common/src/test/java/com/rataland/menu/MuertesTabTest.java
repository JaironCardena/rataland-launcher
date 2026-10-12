package com.rataland.menu;

import net.minecraft.SharedConstants;
import net.minecraft.network.chat.Component;
import net.minecraft.server.Bootstrap;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.ScoreHolder;
import net.minecraft.world.scores.Scoreboard;
import net.minecraft.world.scores.criteria.ObjectiveCriteria;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MuertesTabTest {

	@BeforeAll
	static void iniciarMinecraft() {
		SharedConstants.tryDetectVersion();
		Bootstrap.bootStrap();
	}

	private static Objective objetivo(Scoreboard marcador, String nombre) {
		// El cliente recibe el criterio dummy incluso si el servidor usa deathCount.
		return marcador.addObjective(nombre, ObjectiveCriteria.DUMMY, Component.literal(nombre),
				ObjectiveCriteria.RenderType.INTEGER, false, null);
	}

	@Test
	void sinObjetivoNoInventaUnCero() {
		Scoreboard marcador = new Scoreboard();
		objetivo(marcador, "vida");
		assertNull(MuertesTab.deJugador(marcador, ScoreHolder.forNameOnly("JaironEc")));
	}

	@Test
	void cuentaPorJugadorYReflejaActualizacionesDelServidor() {
		Scoreboard marcador = new Scoreboard();
		Objective muertes = objetivo(marcador, MuertesTab.OBJETIVO);
		ScoreHolder yo = ScoreHolder.forNameOnly("JaironEc");
		ScoreHolder otro = ScoreHolder.forNameOnly("Luna");
		assertEquals(0, MuertesTab.deJugador(marcador, yo));
		marcador.getOrCreatePlayerScore(yo, muertes).set(7);
		marcador.getOrCreatePlayerScore(otro, muertes).set(2);
		assertEquals(7, MuertesTab.deJugador(marcador, yo));
		assertEquals(2, MuertesTab.deJugador(marcador, otro));
		marcador.getOrCreatePlayerScore(yo, muertes).set(8);
		assertEquals(8, MuertesTab.deJugador(marcador, yo));
	}

	@Test
	void desapareceElDatoSiElServidorRetiraElObjetivo() {
		Scoreboard marcador = new Scoreboard();
		Objective muertes = objetivo(marcador, MuertesTab.OBJETIVO);
		ScoreHolder yo = ScoreHolder.forNameOnly("JaironEc");
		marcador.getOrCreatePlayerScore(yo, muertes).set(7);
		marcador.removeObjective(muertes);
		assertNull(MuertesTab.deJugador(marcador, yo));
	}

	@Test
	void ocultaSoloElSidebarReservadoYRespetaVidaYOtrosMarcadores() {
		Scoreboard marcador = new Scoreboard();
		assertTrue(MuertesTab.esObjetivo(objetivo(marcador, MuertesTab.OBJETIVO)));
		assertFalse(MuertesTab.esObjetivo(objetivo(marcador, "vida")));
		assertFalse(MuertesTab.esObjetivo(objetivo(marcador, "misiones")));
		assertFalse(MuertesTab.esObjetivo(null));
	}
}
