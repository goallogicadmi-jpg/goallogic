import React from 'react';
import {
  buildFixtureMatchLabel,
  formatFixtureDate,
  getMatchColor,
} from '../utils/teamLastMatches';

/**
 * Lista de últimos partidos — misma UI que el módulo de Clubes (EquipoDetalle).
 */
export default function TeamLastMatchesList({ fixtures = [], teamId, teamName = 'Equipo', emptyMessage }) {
  const validFixtures = Array.isArray(fixtures)
    ? fixtures.filter((fixture) => fixture?.teams && fixture?.fixture && fixture?.goals)
    : [];

  if (validFixtures.length === 0) {
    return (
      <p className="predicciones-ultimos-partidos-empty">
        {emptyMessage || 'No hay partidos recientes disponibles.'}
      </p>
    );
  }

  return (
    <div className="team-last-matches-list">
      {validFixtures.map((fixture, idx) => {
        const isLocal = fixture.teams.home?.id === parseInt(teamId, 10);
        const goalsFor = isLocal ? (fixture.goals?.home ?? null) : (fixture.goals?.away ?? null);
        const goalsAgainst = isLocal ? (fixture.goals?.away ?? null) : (fixture.goals?.home ?? null);
        const bgColor = getMatchColor(fixture, teamId);
        const textoPartido = buildFixtureMatchLabel(fixture, teamId, teamName);
        const fechaFormateada = formatFixtureDate(fixture.fixture.date);
        const fixtureKey = fixture.fixture?.id ?? `${fixture.fixture?.date}-${idx}`;

        return (
          <div
            key={fixtureKey}
            className="fixture-row team-last-matches-list__row"
            style={{ backgroundColor: bgColor }}
          >
            <p className="team-last-matches-list__match">{textoPartido}</p>
            <p className="team-last-matches-list__score">
              Marcador:{' '}
              {goalsFor !== null && goalsAgainst !== null ? `${goalsFor} - ${goalsAgainst}` : 'N/D'}
            </p>
            <p className="fixture-time team-last-matches-list__date">Fecha: {fechaFormateada}</p>
          </div>
        );
      })}
    </div>
  );
}
