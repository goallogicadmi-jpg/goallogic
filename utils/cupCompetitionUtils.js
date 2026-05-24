const selectionTournamentRules = require("../frontend/src/config/selectionTournamentRules.json");
const clubCupTournamentRules = require("./clubCupTournamentRules.json");
const { getCompetitionById } = require("./competitionCatalog");

const PLAYED_FIXTURE_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

function getCupTournamentRule(competitionId) {
  const normalizedId = String(Number(competitionId));
  const catalogEntry = getCompetitionById(competitionId);
  const rules =
    catalogEntry?.domain === "selection" ? selectionTournamentRules : clubCupTournamentRules;
  return rules[normalizedId] || rules.default || {};
}

/** @deprecated Usar getCupTournamentRule — mantiene compatibilidad interna. */
function getSelectionTournamentRule(competitionId) {
  return getCupTournamentRule(competitionId);
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function extractLetterGroup(rawLabel) {
  const match = normalizeText(rawLabel).match(/(?:group|grupo)\s+([a-z0-9]+)/i);
  return match?.[1] ? match[1].toUpperCase() : null;
}

function extractNationsLeagueMeta(rawLabel, sampleEntry) {
  const normalizedLabel = normalizeText(rawLabel);
  const directMatch = normalizedLabel.match(/League\s+([A-Z])\s*,?\s*Group\s+(\d+)/i);
  if (directMatch) {
    return {
      tier: directMatch[1].toUpperCase(),
      groupNumber: Number(directMatch[2]),
    };
  }

  const simpleGroupMatch = normalizedLabel.match(/(?:group|grupo)\s+(\d+)/i);
  const description = normalizeText(sampleEntry?.description);
  const descriptionMatch = description.match(/League\s+([A-Z])/i);
  if (simpleGroupMatch && descriptionMatch) {
    return {
      tier: descriptionMatch[1].toUpperCase(),
      groupNumber: Number(simpleGroupMatch[1]),
    };
  }

  return null;
}

function buildGroupMeta({ competitionId, rawGroupName, sampleEntry, index = 0 }) {
  const rule = getSelectionTournamentRule(competitionId);
  const normalizedRawName = normalizeText(rawGroupName);
  const excludedLabels = new Set((rule.excludeGroupLabels || []).map((label) => normalizeText(label).toLowerCase()));
  const lowerName = normalizedRawName.toLowerCase();

  if (
    excludedLabels.has(lowerName) ||
    /ranking of third-placed teams/i.test(normalizedRawName) ||
    /third-placed teams/i.test(normalizedRawName)
  ) {
    return {
      groupKey: "best-third-ranking",
      groupLabel: "Ranking de mejores terceros",
      groupType: "auxiliary_ranking",
      rawGroupName: normalizedRawName,
    };
  }

  switch (rule.groupNaming) {
    case "letter":
    case "letter_from_long_name": {
      const groupLetter = extractLetterGroup(normalizedRawName) || String.fromCharCode(65 + index);
      return {
        groupKey: groupLetter,
        groupLabel: `Grupo ${groupLetter}`,
        groupType: "group",
        rawGroupName: normalizedRawName,
      };
    }
    case "uefa_nations_league":
    case "concacaf_nations_league": {
      const leagueMeta = extractNationsLeagueMeta(normalizedRawName, sampleEntry);
      const tier = leagueMeta?.tier || "A";
      const groupNumber = leagueMeta?.groupNumber || index + 1;
      return {
        groupKey: `${tier}${groupNumber}`,
        groupLabel: `Liga ${tier} · Grupo ${groupNumber}`,
        groupType: "league_group",
        rawGroupName: normalizedRawName || `League ${tier}, Group ${groupNumber}`,
      };
    }
    default: {
      const fallbackLetter = extractLetterGroup(normalizedRawName) || String.fromCharCode(65 + index);
      return {
        groupKey: fallbackLetter,
        groupLabel: normalizedRawName || `Grupo ${fallbackLetter}`,
        groupType: "group",
        rawGroupName: normalizedRawName,
      };
    }
  }
}

function createGroupData({ competitionId, groupStandings, rawGroupName, index = 0 }) {
  const teamsArray = Array.isArray(groupStandings)
    ? groupStandings
    : Array.isArray(groupStandings?.standings)
      ? groupStandings.standings
      : [];

  if (!Array.isArray(teamsArray) || teamsArray.length === 0) {
    return null;
  }

  const sampleEntry = teamsArray[0];
  const groupMeta = buildGroupMeta({
    competitionId,
    rawGroupName,
    sampleEntry,
    index,
  });

  return {
    ...groupMeta,
    groupName: groupMeta.groupLabel,
    standings: teamsArray,
    teams: teamsArray
      .map((team) => ({
        id: team.team?.id || team.id,
        name: team.team?.name || team.name,
        logo: team.team?.logo || team.logo || null,
      }))
      .filter((team) => team.id),
  };
}

function normalizeGroupsFromStandings({ competitionId, standings }) {
  if (!Array.isArray(standings) || standings.length === 0) {
    return [];
  }

  let processedStandings = standings;

  if (!Array.isArray(standings[0])) {
    const groupedByName = new Map();
    standings.forEach((entry) => {
      const rawGroupName = normalizeText(entry?.group || "Unknown");
      if (!groupedByName.has(rawGroupName)) {
        groupedByName.set(rawGroupName, []);
      }
      groupedByName.get(rawGroupName).push(entry);
    });
    processedStandings = Array.from(groupedByName.values());
  }

  return processedStandings
    .map((groupStandings, index) => {
      const sampleEntry = Array.isArray(groupStandings) ? groupStandings[0] : null;
      const rawGroupName =
        sampleEntry?.group ||
        groupStandings?.groupName ||
        groupStandings?.group ||
        `Grupo ${String.fromCharCode(65 + index)}`;

      return createGroupData({
        competitionId,
        groupStandings,
        rawGroupName,
        index,
      });
    })
    .filter(Boolean);
}

function getLeagueStageTier(roundName) {
  const match = normalizeText(roundName).match(/^League\s+([A-Z])\s*-\s*\d+/i);
  return match?.[1] ? match[1].toUpperCase() : null;
}

function buildConnectedComponents(teamIds, edgeMap) {
  const visited = new Set();
  const components = [];

  teamIds.forEach((teamId) => {
    if (visited.has(teamId)) {
      return;
    }

    const stack = [teamId];
    const component = [];
    visited.add(teamId);

    while (stack.length > 0) {
      const current = stack.pop();
      component.push(current);
      const neighbors = edgeMap.get(current) || [];
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      });
    }

    components.push(component);
  });

  return components;
}

function sortDerivedStandings(left, right) {
  const pointsDiff = right.points - left.points;
  if (pointsDiff !== 0) {
    return pointsDiff;
  }

  const goalDiffDiff = right.goalsDiff - left.goalsDiff;
  if (goalDiffDiff !== 0) {
    return goalDiffDiff;
  }

  const goalsForDiff = right.all.goals.for - left.all.goals.for;
  if (goalsForDiff !== 0) {
    return goalsForDiff;
  }

  return (left.team?.name || "").localeCompare(right.team?.name || "");
}

function buildDerivedStandingFromFixtures(fixtures, rawGroupName) {
  const teamStats = new Map();

  const ensureTeam = (team) => {
    if (!team?.id) {
      return null;
    }

    if (!teamStats.has(team.id)) {
      teamStats.set(team.id, {
        rank: 0,
        team: {
          id: team.id,
          name: team.name,
          logo: team.logo || null,
        },
        points: 0,
        goalsDiff: 0,
        group: rawGroupName,
        form: "",
        status: "same",
        description: null,
        all: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goals: { for: 0, against: 0 },
        },
        home: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goals: { for: 0, against: 0 },
        },
        away: {
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goals: { for: 0, against: 0 },
        },
      });
    }

    return teamStats.get(team.id);
  };

  fixtures.forEach((fixture) => {
    const homeStats = ensureTeam(fixture.teams?.home);
    const awayStats = ensureTeam(fixture.teams?.away);

    if (!homeStats || !awayStats) {
      return;
    }

    const status = fixture.fixture?.status?.short;
    if (!PLAYED_FIXTURE_STATUSES.has(status)) {
      return;
    }

    const homeGoals = Number(fixture.goals?.home);
    const awayGoals = Number(fixture.goals?.away);
    if (Number.isNaN(homeGoals) || Number.isNaN(awayGoals)) {
      return;
    }

    homeStats.all.played += 1;
    awayStats.all.played += 1;
    homeStats.home.played += 1;
    awayStats.away.played += 1;

    homeStats.all.goals.for += homeGoals;
    homeStats.all.goals.against += awayGoals;
    awayStats.all.goals.for += awayGoals;
    awayStats.all.goals.against += homeGoals;
    homeStats.home.goals.for += homeGoals;
    homeStats.home.goals.against += awayGoals;
    awayStats.away.goals.for += awayGoals;
    awayStats.away.goals.against += homeGoals;

    if (homeGoals > awayGoals) {
      homeStats.points += 3;
      homeStats.all.win += 1;
      homeStats.home.win += 1;
      awayStats.all.lose += 1;
      awayStats.away.lose += 1;
    } else if (homeGoals < awayGoals) {
      awayStats.points += 3;
      awayStats.all.win += 1;
      awayStats.away.win += 1;
      homeStats.all.lose += 1;
      homeStats.home.lose += 1;
    } else {
      homeStats.points += 1;
      awayStats.points += 1;
      homeStats.all.draw += 1;
      awayStats.all.draw += 1;
      homeStats.home.draw += 1;
      awayStats.away.draw += 1;
    }
  });

  const standings = Array.from(teamStats.values()).map((entry) => ({
    ...entry,
    goalsDiff: entry.all.goals.for - entry.all.goals.against,
  }));

  standings.sort(sortDerivedStandings);
  standings.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return standings;
}

function buildGroupsFromLeagueStageFixtures({ competitionId, fixtures }) {
  const leagueStageFixtures = (fixtures || []).filter((fixture) => getLeagueStageTier(fixture.league?.round));
  if (leagueStageFixtures.length === 0) {
    return [];
  }

  const fixturesByTier = new Map();
  leagueStageFixtures.forEach((fixture) => {
    const tier = getLeagueStageTier(fixture.league?.round);
    if (!tier) {
      return;
    }

    if (!fixturesByTier.has(tier)) {
      fixturesByTier.set(tier, []);
    }
    fixturesByTier.get(tier).push(fixture);
  });

  const derivedGroups = [];

  Array.from(fixturesByTier.entries())
    .sort(([leftTier], [rightTier]) => leftTier.localeCompare(rightTier))
    .forEach(([tier, tierFixtures]) => {
      const edgeMap = new Map();

      tierFixtures.forEach((fixture) => {
        const homeId = fixture.teams?.home?.id;
        const awayId = fixture.teams?.away?.id;

        if (!homeId || !awayId) {
          return;
        }

        if (!edgeMap.has(homeId)) {
          edgeMap.set(homeId, new Set());
        }
        if (!edgeMap.has(awayId)) {
          edgeMap.set(awayId, new Set());
        }

        edgeMap.get(homeId).add(awayId);
        edgeMap.get(awayId).add(homeId);
      });

      const teamIds = Array.from(edgeMap.keys());
      const components = buildConnectedComponents(
        teamIds,
        new Map(Array.from(edgeMap.entries()).map(([teamId, neighbors]) => [teamId, Array.from(neighbors)]))
      );

      components
        .map((component) =>
          tierFixtures.filter((fixture) => component.includes(fixture.teams?.home?.id) || component.includes(fixture.teams?.away?.id))
        )
        .sort((leftFixtures, rightFixtures) => {
          const leftName = leftFixtures[0]?.teams?.home?.name || "";
          const rightName = rightFixtures[0]?.teams?.home?.name || "";
          return leftName.localeCompare(rightName);
        })
        .forEach((componentFixtures, componentIndex) => {
          const rawGroupName = `League ${tier}, Group ${componentIndex + 1}`;
          const groupStandings = buildDerivedStandingFromFixtures(componentFixtures, rawGroupName);
          const groupData = createGroupData({
            competitionId,
            groupStandings,
            rawGroupName,
            index: componentIndex,
          });

          if (groupData) {
            derivedGroups.push(groupData);
          }
        });
    });

  return derivedGroups;
}

function groupFixturesByTeamIds(groups, fixtures) {
  groups.forEach((group) => {
    const teamIds = new Set((group.teams || []).map((team) => team.id));
    group.matches = (fixtures || []).filter(
      (fixture) => teamIds.has(fixture.teams?.home?.id) || teamIds.has(fixture.teams?.away?.id)
    );
  });

  return groups;
}

function normalizeRoundKey(roundName) {
  const normalized = normalizeText(roundName);

  if (/round of 32/i.test(normalized) || /ronda de 32/i.test(normalized)) {
    return "roundOf32";
  }
  if (/round of 16/i.test(normalized) || /octavos/i.test(normalized)) {
    return "roundOf16";
  }
  if (/quarter-finals/i.test(normalized) || /cuartos/i.test(normalized)) {
    return "quarterFinals";
  }
  if (/semi-finals/i.test(normalized) || /semifinal/i.test(normalized)) {
    return "semiFinals";
  }
  if (/3rd place final/i.test(normalized) || /third place/i.test(normalized) || /tercer/i.test(normalized)) {
    return "thirdPlace";
  }
  if (/^final$/i.test(normalized)) {
    return "final";
  }

  return null;
}

function buildKnockoutBracketFromFixtures(fixtures = []) {
  const roundOrder = ["roundOf32", "roundOf16", "quarterFinals", "semiFinals", "thirdPlace", "final"];
  const roundLabels = {
    roundOf32: "Ronda de 32",
    roundOf16: "Octavos de Final",
    quarterFinals: "Cuartos de Final",
    semiFinals: "Semifinales",
    thirdPlace: "Tercer Puesto",
    final: "Final",
  };

  const rounds = {
    roundsOrder: [],
    roundLabels,
  };

  fixtures.forEach((fixture) => {
    const roundKey = normalizeRoundKey(fixture.league?.round);
    if (!roundKey) {
      return;
    }

    if (!rounds[roundKey]) {
      rounds[roundKey] = [];
    }

    rounds[roundKey].push({
      id: fixture.fixture?.id || `${roundKey}-${rounds[roundKey].length + 1}`,
      roundKey,
      date: fixture.fixture?.date || null,
      status: fixture.fixture?.status?.short || "NS",
      score: {
        home: fixture.goals?.home,
        away: fixture.goals?.away,
      },
      homeTeam: {
        id: fixture.teams?.home?.id || null,
        name: fixture.teams?.home?.name || "Por definir",
        logo: fixture.teams?.home?.logo || null,
        isPlaceholder: false,
      },
      awayTeam: {
        id: fixture.teams?.away?.id || null,
        name: fixture.teams?.away?.name || "Por definir",
        logo: fixture.teams?.away?.logo || null,
        isPlaceholder: false,
      },
    });
  });

  rounds.roundsOrder = roundOrder.filter((roundKey) => Array.isArray(rounds[roundKey]) && rounds[roundKey].length > 0);

  return rounds.roundsOrder.length > 0 ? rounds : null;
}

function buildCupCompetitionPayload({ competitionId, standings = [], fixtures = [] }) {
  let groups = normalizeGroupsFromStandings({ competitionId, standings });

  if (groups.length === 0) {
    groups = buildGroupsFromLeagueStageFixtures({ competitionId, fixtures });
  }

  groups = groups.filter((group) => group.groupType !== "auxiliary_ranking");
  groupFixturesByTeamIds(groups, fixtures);

  const bracket = buildKnockoutBracketFromFixtures(fixtures);

  return {
    groups,
    hasGroups: groups.length > 0,
    bracket,
    phase: groups.length > 0 ? "groups" : (bracket ? "knockout" : "knockout"),
  };
}

module.exports = {
  getCupTournamentRule,
  getSelectionTournamentRule,
  buildGroupMeta,
  normalizeGroupsFromStandings,
  buildGroupsFromLeagueStageFixtures,
  buildKnockoutBracketFromFixtures,
  buildCupCompetitionPayload,
};
