/**

 * Copas nacionales y redistribución de plazas continentales.

 */



import { getZone, isContinentalQualificationZone } from './leagueClassification';

import { getLeagueConfig } from './leagueRules';



function mapZoneToFinalCompetition(zone) {

  if (zone === 'relegation' || isContinentalQualificationZone(zone)) {

    return zone;

  }

  return 'none';

}



export function applyLeagueZones(standings, leagueId) {

  const totalTeams = standings.length;



  return standings.map((team) => {

    const position = team.posicion || team.position || team.rank;

    const zone = getZone(position, leagueId, totalTeams);

    const finalCompetition = mapZoneToFinalCompetition(zone);



    return {

      teamId: team.equipoId || team.teamId || team.team?.id || team.id,

      teamName: team.equipo || team.teamName || team.team?.name || team.name,

      position,

      points: team.puntos || team.points || 0,

      goalsDiff: team.diferencia || team.goalsDiff || 0,

      played: team.jugados || team.played || 0,

      won: team.ganados || team.won || 0,

      drawn: team.empatados || team.drawn || 0,

      lost: team.perdidos || team.lost || 0,

      goalsFor: team.golesFavor || team.goalsFor || 0,

      goalsAgainst: team.golesContra || team.goalsAgainst || 0,

      form: team.forma || team.form || '',

      logo: team.logo || team.team?.logo || null,

      finalCompetition,

      qualificationSource: finalCompetition !== 'none' ? 'league' : null,

      zone,

    };

  });

}



function hasContinentalSlot(team) {

  return isContinentalQualificationZone(team.finalCompetition);

}



export function applyCupAllocation(standings, cupWinnerTeamId, leagueId) {

  const base = applyLeagueZones(standings, leagueId);

  const config = getLeagueConfig(leagueId);

  const cupZone = config?.cupSpots?.domesticCup;



  if (!cupZone || !cupWinnerTeamId) {

    return base;

  }



  const cupWinner = base.find((t) => t.teamId === cupWinnerTeamId);

  if (!cupWinner) {

    return base;

  }



  if (!hasContinentalSlot(cupWinner)) {

    return base.map((t) =>

      t.teamId === cupWinnerTeamId

        ? {

            ...t,

            finalCompetition: cupZone,

            qualificationSource: 'cup',

            zone: cupZone,

          }

        : t

    );

  }



  const used = new Set(base.filter(hasContinentalSlot).map((t) => t.teamId));



  const candidate = base

    .filter((t) => !used.has(t.teamId) && t.finalCompetition === 'none')

    .sort((a, b) => a.position - b.position)[0];



  if (!candidate) {

    return base;

  }



  return base.map((t) =>

    t.teamId === candidate.teamId

      ? {

          ...t,

          finalCompetition: cupZone,

          qualificationSource: 'inherited',

          zone: cupZone,

        }

      : t

  );

}


