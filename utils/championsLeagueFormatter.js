const LEAGUE_STAGE_PREFIX = "League Stage - ";

const ROUND_CONFIG = {
  "Knockout Round Play-offs": { key: "playoff", multiLeg: true },
  "Round of 16": { key: "roundOf16", multiLeg: true },
  "Quarter-finals": { key: "quarterFinals", multiLeg: true },
  "Semi-finals": { key: "semiFinals", multiLeg: true },
  Final: { key: "final", multiLeg: false },
};

function isChampionsLeague(leagueId, leagueName = "") {
  return Number(leagueId) === 2 || /champions league/i.test(leagueName);
}

function getCompetitionFormat() {
  return {
    type: "league_phase",
    stageLabel: "League phase",
    totalTeams: 36,
    directRoundOf16: {
      from: 1,
      to: 8,
    },
    playoff: {
      from: 9,
      to: 24,
      roundLabel: "Knockout Round Play-offs",
    },
    eliminated: {
      from: 25,
      to: 36,
    },
    rounds: {
      leaguePhaseMatchdays: 8,
      playoffMatches: 8,
      roundOf16Matches: 8,
      quarterFinalsMatches: 4,
      semiFinalsMatches: 2,
      finalMatches: 1,
    },
    awayGoalsRule: false,
  };
}

function buildChampionsLeaguePayload({ season, leagueName, standingsTable = [], fixtures = [] }) {
  const teamLookup = createTeamLookup(standingsTable);

  return {
    competitionFormat: getCompetitionFormat(),
    leaguePhase: buildLeaguePhase(fixtures, teamLookup),
    bracket: buildBracket(fixtures, teamLookup),
  };
}

function createTeamLookup(standingsTable) {
  return standingsTable.reduce((lookup, team) => {
    const teamId = Number(team?.equipoId);
    if (!teamId) {
      return lookup;
    }

    lookup[teamId] = {
      id: teamId,
      name: team.equipo,
      logo: team.logo || null,
      position: team.posicion || null,
      points: team.puntos || 0,
    };

    return lookup;
  }, {});
}

function buildLeaguePhase(fixtures, teamLookup) {
  const leaguePhaseFixtures = fixtures
    .filter((fixture) => typeof fixture?.league?.round === "string" && fixture.league.round.startsWith(LEAGUE_STAGE_PREFIX))
    .sort(compareFixturesByDate);

  const roundsMap = new Map();

  leaguePhaseFixtures.forEach((fixture) => {
    const roundName = fixture.league.round;
    if (!roundsMap.has(roundName)) {
      roundsMap.set(roundName, {
        round: roundName,
        matchday: extractMatchday(roundName),
        matches: [],
      });
    }

    roundsMap.get(roundName).matches.push(buildSingleLegFixture(fixture, teamLookup));
  });

  const rounds = Array.from(roundsMap.values())
    .sort((a, b) => a.matchday - b.matchday)
    .map((round) => ({
      ...round,
      totalMatches: round.matches.length,
      firstDate: round.matches[0]?.date || null,
      lastDate: round.matches[round.matches.length - 1]?.date || null,
    }));

  return {
    totalMatchdays: rounds.length,
    totalMatches: leaguePhaseFixtures.length,
    rounds,
  };
}

function buildBracket(fixtures, teamLookup) {
  const bracket = {
    playoff: [],
    roundOf16: [],
    quarterFinals: [],
    semiFinals: [],
    final: null,
    status: "not_started",
  };

  Object.entries(ROUND_CONFIG).forEach(([apiRound, config]) => {
    const roundFixtures = fixtures
      .filter((fixture) => fixture?.league?.round === apiRound)
      .sort(compareFixturesByDate);

    if (roundFixtures.length === 0) {
      return;
    }

    if (config.multiLeg) {
      bracket[config.key] = buildTwoLeggedRound(roundFixtures, config.key, teamLookup);
      return;
    }

    bracket.final = buildFinal(roundFixtures[0], teamLookup);
  });

  if (bracket.final?.status === "completed") {
    bracket.status = "completed";
  } else if (
    bracket.playoff.length ||
    bracket.roundOf16.length ||
    bracket.quarterFinals.length ||
    bracket.semiFinals.length ||
    bracket.final
  ) {
    bracket.status = "in_progress";
  }

  return bracket;
}

function buildTwoLeggedRound(fixtures, roundKey, teamLookup) {
  const tieMap = new Map();

  fixtures.forEach((fixture) => {
    const teamIds = [fixture?.teams?.home?.id, fixture?.teams?.away?.id]
      .map((value) => Number(value))
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (teamIds.length !== 2) {
      return;
    }

    const tieKey = teamIds.join("-");
    if (!tieMap.has(tieKey)) {
      tieMap.set(tieKey, []);
    }

    tieMap.get(tieKey).push(fixture);
  });

  return Array.from(tieMap.values())
    .map((tieFixtures, index) => buildTwoLeggedTie(tieFixtures, roundKey, teamLookup, index))
    .sort(compareTiesByFirstLegDate);
}

function buildTwoLeggedTie(tieFixtures, roundKey, teamLookup, index) {
  const orderedFixtures = [...tieFixtures].sort(compareFixturesByDate);
  const firstLegFixture = orderedFixtures[0];
  const secondLegFixture = orderedFixtures[1] || null;

  const homeTeam = createTeamReference(firstLegFixture?.teams?.home, teamLookup);
  const awayTeam = createTeamReference(firstLegFixture?.teams?.away, teamLookup);

  const firstLeg = buildLeg(firstLegFixture);
  const secondLeg = secondLegFixture
    ? buildLeg(secondLegFixture)
    : {
        fixtureId: null,
        date: null,
        homeScore: null,
        awayScore: null,
        played: false,
        status: "NS",
      };

  const aggregateScore = calculateAggregateScore(firstLegFixture, secondLegFixture);
  const tieBreak = buildTwoLeggedTieBreak(firstLegFixture, secondLegFixture, homeTeam, awayTeam, aggregateScore);
  const winner = determineTwoLeggedWinner(homeTeam, awayTeam, aggregateScore, tieBreak);
  const status = firstLeg.played && secondLeg.played ? (winner ? "completed" : "tied") : firstLeg.played || secondLeg.played ? "in_progress" : "scheduled";

  return {
    id: `${roundKey.toUpperCase()}-${index + 1}`,
    round: roundKey,
    homeTeam,
    awayTeam,
    firstLeg,
    secondLeg,
    aggregateScore,
    tieBreak,
    winner,
    status,
  };
}

function buildFinal(fixture, teamLookup) {
  const homeTeam = createTeamReference(fixture?.teams?.home, teamLookup);
  const awayTeam = createTeamReference(fixture?.teams?.away, teamLookup);
  const finalScore = buildLeg(fixture);
  const penalties = fixture?.score?.penalty;
  const tieBreak = penalties && penalties.home !== null && penalties.away !== null
    ? {
        type: "penalties",
        home: penalties.home,
        away: penalties.away,
        label: `Penales ${penalties.home}-${penalties.away}`,
      }
    : null;

  let winner = null;
  if (finalScore.played) {
    if ((fixture?.goals?.home || 0) > (fixture?.goals?.away || 0)) {
      winner = homeTeam;
    } else if ((fixture?.goals?.away || 0) > (fixture?.goals?.home || 0)) {
      winner = awayTeam;
    } else if (tieBreak) {
      winner = tieBreak.home > tieBreak.away ? homeTeam : awayTeam;
    }
  }

  return {
    id: "FINAL-1",
    round: "final",
    homeTeam,
    awayTeam,
    finalScore: {
      ...finalScore,
      penaltyScore: tieBreak,
    },
    tieBreak,
    winner,
    status: finalScore.played ? (winner ? "completed" : "tied") : "scheduled",
  };
}

function buildSingleLegFixture(fixture, teamLookup) {
  return {
    fixtureId: fixture?.fixture?.id || null,
    date: fixture?.fixture?.date || null,
    status: fixture?.fixture?.status?.short || "NS",
    played: isFixturePlayed(fixture),
    homeTeam: createTeamReference(fixture?.teams?.home, teamLookup),
    awayTeam: createTeamReference(fixture?.teams?.away, teamLookup),
    score: {
      home: fixture?.goals?.home,
      away: fixture?.goals?.away,
      penalties:
        fixture?.score?.penalty?.home !== null && fixture?.score?.penalty?.away !== null
          ? {
              home: fixture.score.penalty.home,
              away: fixture.score.penalty.away,
            }
          : null,
    },
    winnerTeamId: getFixtureWinnerId(fixture),
  };
}

function buildLeg(fixture) {
  return {
    fixtureId: fixture?.fixture?.id || null,
    date: fixture?.fixture?.date || null,
    homeScore: fixture?.goals?.home ?? null,
    awayScore: fixture?.goals?.away ?? null,
    played: isFixturePlayed(fixture),
    status: fixture?.fixture?.status?.short || "NS",
    penaltyScore:
      fixture?.score?.penalty?.home !== null && fixture?.score?.penalty?.away !== null
        ? {
            home: fixture.score.penalty.home,
            away: fixture.score.penalty.away,
          }
        : null,
  };
}

function calculateAggregateScore(firstLegFixture, secondLegFixture) {
  if (!firstLegFixture) {
    return { home: null, away: null };
  }

  const homeGoalsFirstLeg = firstLegFixture?.goals?.home ?? null;
  const awayGoalsFirstLeg = firstLegFixture?.goals?.away ?? null;

  if (!secondLegFixture) {
    return {
      home: homeGoalsFirstLeg,
      away: awayGoalsFirstLeg,
    };
  }

  return {
    home: (homeGoalsFirstLeg || 0) + (secondLegFixture?.goals?.away || 0),
    away: (awayGoalsFirstLeg || 0) + (secondLegFixture?.goals?.home || 0),
  };
}

function buildTwoLeggedTieBreak(firstLegFixture, secondLegFixture, homeTeam, awayTeam, aggregateScore) {
  if (!firstLegFixture || !secondLegFixture) {
    return null;
  }

  if (aggregateScore.home !== aggregateScore.away) {
    return null;
  }

  const penalties = secondLegFixture?.score?.penalty;
  if (penalties && penalties.home !== null && penalties.away !== null) {
    return {
      type: "penalties",
      home: penalties.away,
      away: penalties.home,
      label: `Penales ${penalties.away}-${penalties.home}`,
      winnerTeamId: penalties.away > penalties.home ? homeTeam.id : awayTeam.id,
    };
  }

  if (secondLegFixture?.fixture?.status?.short === "AET") {
    return {
      type: "extra_time",
      label: "Definido en prórroga",
    };
  }

  return null;
}

function determineTwoLeggedWinner(homeTeam, awayTeam, aggregateScore, tieBreak) {
  if (aggregateScore.home === null || aggregateScore.away === null) {
    return null;
  }

  if (aggregateScore.home > aggregateScore.away) {
    return homeTeam;
  }

  if (aggregateScore.away > aggregateScore.home) {
    return awayTeam;
  }

  if (tieBreak?.winnerTeamId === homeTeam.id) {
    return homeTeam;
  }

  if (tieBreak?.winnerTeamId === awayTeam.id) {
    return awayTeam;
  }

  return null;
}

function createTeamReference(teamSide, teamLookup) {
  const teamId = Number(teamSide?.id);
  const lookup = teamLookup[teamId] || {};

  return {
    id: teamId || null,
    name: teamSide?.name || lookup.name || "TBD",
    logo: teamSide?.logo || lookup.logo || null,
    position: lookup.position || null,
    points: lookup.points || 0,
  };
}

function getFixtureWinnerId(fixture) {
  if (fixture?.teams?.home?.winner === true) {
    return fixture.teams.home.id;
  }

  if (fixture?.teams?.away?.winner === true) {
    return fixture.teams.away.id;
  }

  return null;
}

function extractMatchday(roundName) {
  const match = roundName.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function compareFixturesByDate(left, right) {
  const leftDate = new Date(left?.fixture?.date || 0).getTime();
  const rightDate = new Date(right?.fixture?.date || 0).getTime();

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  return (left?.fixture?.id || 0) - (right?.fixture?.id || 0);
}

function compareTiesByFirstLegDate(left, right) {
  const leftDate = new Date(left?.firstLeg?.date || 0).getTime();
  const rightDate = new Date(right?.firstLeg?.date || 0).getTime();

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  return (left?.firstLeg?.fixtureId || 0) - (right?.firstLeg?.fixtureId || 0);
}

function isFixturePlayed(fixture) {
  const status = fixture?.fixture?.status?.short;
  return ["FT", "AET", "PEN", "AWD", "WO"].includes(status);
}

module.exports = {
  buildChampionsLeaguePayload,
  isChampionsLeague,
};
