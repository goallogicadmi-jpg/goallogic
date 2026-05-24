import {
  ROUND_LABELS,
  resolveOfficialKnockoutFormat,
} from '../config/officialKnockoutFormats.js';

const COMPETITION_SLOT_LABELS = {
  1: 'Mundial',
  4: 'Euro',
  5: 'Nations League',
  6: 'CAF',
  7: 'AFC',
  9: 'Copa América',
  11: 'Sudamericana',
  13: 'Libertadores',
};

const PLAYED_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

function resolveGroupName(group, index = 0) {
  if (typeof group === 'string') {
    return group;
  }

  return group?.groupLabel || group?.groupName || group?.name || group?.group || `Grupo ${String.fromCharCode(65 + index)}`;
}

function extractGroupKey(groupName, index = 0) {
  const fallback = String.fromCharCode(65 + index);
  const normalized = String(groupName || '').trim();

  if (!normalized) {
    return fallback;
  }

  const groupMatch = normalized.match(/(?:group|grupo)\s+([a-z0-9]+)/i);
  if (groupMatch?.[1]) {
    return groupMatch[1].toUpperCase();
  }

  if (/^[A-Z0-9]$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  return fallback;
}

function getPositionLabel(position) {
  return `${position}°`;
}

function sortStandings(standings = []) {
  return [...standings].sort((left, right) => {
    const leftRank = Number(left?.rank ?? left?.position ?? 999);
    const rightRank = Number(right?.rank ?? right?.position ?? 999);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return 0;
  });
}

function createGroupEntries(groups = []) {
  return groups
    .filter((group) => (group?.groupType || 'group') !== 'auxiliary_ranking')
    .map((group, index) => {
    const name = resolveGroupName(group, index);
    const standings = sortStandings(Array.isArray(group?.standings) ? group.standings : []);

    return {
      index,
      key: group?.groupKey || extractGroupKey(name, index),
      name,
      type: group?.groupType || 'group',
      standings,
    };
    });
}

function getStandingMetrics(standing = {}) {
  const allGoals = standing?.all?.goals || {};

  return {
    points: Number(standing?.points ?? standing?.all?.points ?? 0),
    goalDifference: Number(
      standing?.goalsDiff ??
        standing?.goals?.diff ??
        (Number(allGoals.for ?? 0) - Number(allGoals.against ?? 0))
    ),
    goalsFor: Number(standing?.all?.goals?.for ?? standing?.goals?.for ?? 0),
    wins: Number(standing?.all?.win ?? standing?.wins ?? 0),
  };
}

function compareThirdPlacedTeams(left, right, criteria = []) {
  for (const criterion of criteria) {
    const leftValue = left.metrics[criterion] ?? 0;
    const rightValue = right.metrics[criterion] ?? 0;

    if (leftValue !== rightValue) {
      return rightValue - leftValue;
    }
  }

  return left.groupKey.localeCompare(right.groupKey);
}

function createTeamDescriptor(standing, fallbackLabel) {
  const team = standing?.team || standing || {};
  const name = team?.name || fallbackLabel;

  return {
    id: team?.id || standing?.team?.id || null,
    name,
    logo: team?.logo || standing?.team?.logo || null,
    isPlaceholder: false,
  };
}

function createPlaceholder(label) {
  return {
    id: null,
    name: label,
    logo: null,
    isPlaceholder: true,
  };
}

function buildGroupLookup(groupEntries) {
  const byKey = new Map();

  groupEntries.forEach((groupEntry) => {
    byKey.set(groupEntry.key, groupEntry);
  });

  return byKey;
}

function buildBestThirdContext(groupEntries, format) {
  const rankingConfig = format?.bestThirdRanking;

  if (!rankingConfig) {
    return {
      qualifiedTeams: [],
      qualifiedGroupKeys: [],
      qualifiedSetKey: '',
      combinationMap: null,
    };
  }

  const thirdPlacedTeams = groupEntries
    .map((groupEntry) => {
      const standing = groupEntry.standings[2];
      if (!standing) {
        return null;
      }

      return {
        groupKey: groupEntry.key,
        groupName: groupEntry.name,
        standing,
        metrics: getStandingMetrics(standing),
      };
    })
    .filter(Boolean)
    .sort((left, right) => compareThirdPlacedTeams(left, right, rankingConfig.criteria));

  const qualifiedTeams = thirdPlacedTeams.slice(0, rankingConfig.count);
  const qualifiedGroupKeys = qualifiedTeams.map((team) => team.groupKey);

  return {
    qualifiedTeams,
    qualifiedGroupKeys,
    qualifiedSetKey: [...qualifiedGroupKeys].sort().join(''),
    combinationMap: rankingConfig.combinationMap || null,
  };
}

function resolveGroupDisplayName(groupKey, groupEntry) {
  if (groupEntry?.name) {
    return groupEntry.name.replace(/^Group\s+/i, 'Grupo ');
  }

  return `Grupo ${groupKey}`;
}

function resolveGroupStanding(groupEntriesByKey, slot) {
  const groupEntry = groupEntriesByKey.get(String(slot.group).toUpperCase());
  const label = `${getPositionLabel(slot.position)} ${resolveGroupDisplayName(slot.group, groupEntry)}`;

  if (!groupEntry) {
    return createPlaceholder(label);
  }

  const standing = groupEntry.standings[slot.position - 1];
  if (!standing) {
    return createPlaceholder(label);
  }

  return createTeamDescriptor(standing, label);
}

function resolveIndexedGroupStanding(groupEntries, slot) {
  const groupEntry = groupEntries[slot.index];
  const label = `${getPositionLabel(slot.position)} ${groupEntry?.name || `Grupo ${slot.index + 1}`}`;

  if (!groupEntry) {
    return createPlaceholder(label);
  }

  const standing = groupEntry.standings[slot.position - 1];
  if (!standing) {
    return createPlaceholder(label);
  }

  return createTeamDescriptor(standing, label);
}

function resolveBestThirdGroupKey(slot, bestThirdContext) {
  const combinationEntry = bestThirdContext.combinationMap?.[bestThirdContext.qualifiedSetKey];

  if (!combinationEntry) {
    return null;
  }

  const rawValue = combinationEntry[slot.mappingKey];
  if (!rawValue) {
    return null;
  }

  return String(rawValue).replace(/^3/i, '').toUpperCase();
}

function resolveBestThirdTeam(slot, bestThirdContext, groupEntriesByKey) {
  const resolvedGroupKey = resolveBestThirdGroupKey(slot, bestThirdContext);

  if (resolvedGroupKey) {
    return resolveGroupStanding(groupEntriesByKey, {
      type: 'groupPosition',
      group: resolvedGroupKey,
      position: 3,
    });
  }

  const eligibleQualifiedGroupKey = bestThirdContext.qualifiedGroupKeys.filter((groupKey) =>
    slot.allowedGroups.includes(groupKey)
  );

  if (!bestThirdContext.combinationMap && eligibleQualifiedGroupKey.length === 1) {
    return resolveGroupStanding(groupEntriesByKey, {
      type: 'groupPosition',
      group: eligibleQualifiedGroupKey[0],
      position: 3,
    });
  }

  return createPlaceholder(`Mejor 3° ${slot.allowedGroups.join('/')}`);
}

function resolveKnockoutReference(slot, builtMatches) {
  const referencedMatch = builtMatches.get(slot.matchId);

  if (slot.type === 'winnerOf' && referencedMatch?.winner) {
    return referencedMatch.winner;
  }

  if (slot.type === 'loserOf' && referencedMatch?.loser) {
    return referencedMatch.loser;
  }

  return createPlaceholder(slot.label || 'Por definir');
}

function resolveGroupPositionInCompetition(slot, context) {
  const competitionId = Number(slot.competitionId);
  const lookup = context.groupsByCompetitionLookup?.get(competitionId);
  const compName = COMPETITION_SLOT_LABELS[competitionId] || `Comp. ${competitionId}`;
  const label = `${getPositionLabel(slot.position)} ${slot.group} (${compName})`;

  if (!lookup) {
    return createPlaceholder(label);
  }

  const groupEntry = lookup.get(String(slot.group).toUpperCase());
  if (!groupEntry) {
    return createPlaceholder(label);
  }

  const standing = groupEntry.standings[slot.position - 1];
  if (!standing) {
    return createPlaceholder(label);
  }

  return createTeamDescriptor(standing, label);
}

function resolveSlot(slot, context) {
  if (!slot) {
    return createPlaceholder('Por definir');
  }

  switch (slot.type) {
    case 'groupPosition':
      return resolveGroupStanding(context.groupEntriesByKey, slot);
    case 'groupPositionInCompetition':
      return resolveGroupPositionInCompetition(slot, context);
    case 'groupIndexPosition':
      return resolveIndexedGroupStanding(context.groupEntries, slot);
    case 'bestThird':
      return resolveBestThirdTeam(slot, context.bestThirdContext, context.groupEntriesByKey);
    case 'winnerOf':
    case 'loserOf':
      return resolveKnockoutReference(slot, context.builtMatches);
    default:
      return createPlaceholder('Por definir');
  }
}

function buildGroupsByCompetitionLookup(groupsByCompetition = {}) {
  const lookup = new Map();
  Object.entries(groupsByCompetition).forEach(([competitionId, groups]) => {
    const entries = createGroupEntries(groups);
    lookup.set(Number(competitionId), buildGroupLookup(entries));
  });
  return lookup;
}

function isPlayedFixture(fixture) {
  return PLAYED_STATUSES.has(fixture?.fixture?.status?.short);
}

function findFixtureBetweenTeams(fixtures, teamA, teamB) {
  if (!teamA?.id || !teamB?.id) return null;

  return fixtures.find((fixture) => {
    const homeId = fixture?.teams?.home?.id;
    const awayId = fixture?.teams?.away?.id;
    return (
      (homeId === teamA.id && awayId === teamB.id) ||
      (homeId === teamB.id && awayId === teamA.id)
    );
  });
}

function applyFixtureOutcome(match, fixture) {
  const homeGoals = Number(fixture.goals?.home);
  const awayGoals = Number(fixture.goals?.away);
  if (Number.isNaN(homeGoals) || Number.isNaN(awayGoals)) return;

  const fixtureHomeId = fixture.teams?.home?.id;
  const matchHomeId = match.homeTeam?.id;

  match.score =
    fixtureHomeId === matchHomeId
      ? { home: homeGoals, away: awayGoals }
      : { home: awayGoals, away: homeGoals };

  const homeWon = match.score.home > match.score.away;
  const awayWon = match.score.away > match.score.home;

  if (!homeWon && !awayWon) return;

  match.winner = homeWon ? match.homeTeam : match.awayTeam;
  match.loser = homeWon ? match.awayTeam : match.homeTeam;
  match.status = 'played';
  match.date = fixture.fixture?.date || null;
}

function refreshBracketFromResults(bracket, format, context) {
  format.roundsOrder.forEach((roundKey) => {
    const roundDefs = format.matches?.[roundKey] || [];
    const roundMatches = bracket[roundKey] || [];

    roundMatches.forEach((match, index) => {
      const definition = roundDefs[index];
      if (!definition) return;

      match.homeTeam = resolveSlot(definition.home, context);
      match.awayTeam = resolveSlot(definition.away, context);

      if (match.homeTeam.isPlaceholder || match.awayTeam.isPlaceholder) {
        match.status = 'placeholder';
        match.winner = null;
        match.loser = null;
        return;
      }

      match.status = match.status === 'played' ? 'played' : 'ready';
    });
  });
}

function applyFixtureResultsToBracket(bracket, format, context, fixtures = []) {
  const playedFixtures = (fixtures || []).filter(isPlayedFixture);
  if (!playedFixtures.length) return;

  format.roundsOrder.forEach((roundKey) => {
    const roundMatches = bracket[roundKey] || [];

    roundMatches.forEach((match) => {
      if (match.homeTeam?.isPlaceholder || match.awayTeam?.isPlaceholder) return;

      const fixture = findFixtureBetweenTeams(playedFixtures, match.homeTeam, match.awayTeam);
      if (fixture) {
        applyFixtureOutcome(match, fixture);
      }
    });

    refreshBracketFromResults(bracket, format, context);
  });
}

export function buildOfficialKnockoutBracket({
  competitionId,
  groups = [],
  groupsByCompetition = null,
  competitionInfo = null,
  fixtures = [],
} = {}) {
  const normalizedCompetitionId = Number(competitionId);
  const mergedGroupsByCompetition = {
    ...(groupsByCompetition || {}),
    [normalizedCompetitionId]: groups,
  };

  const groupEntries = createGroupEntries(groups);
  const format = resolveOfficialKnockoutFormat(normalizedCompetitionId, groupEntries.length);

  if (!format) {
    return null;
  }

  const groupEntriesByKey = buildGroupLookup(groupEntries);
  const groupsByCompetitionLookup = buildGroupsByCompetitionLookup(mergedGroupsByCompetition);
  const bestThirdContext = buildBestThirdContext(groupEntries, format);
  const builtMatches = new Map();
  const rounds = {};

  const context = {
    groupEntries,
    groupEntriesByKey,
    groupsByCompetitionLookup,
    bestThirdContext,
    builtMatches,
  };

  format.roundsOrder.forEach((roundKey) => {
    const roundMatches = format.matches?.[roundKey] || [];

    rounds[roundKey] = roundMatches.map((matchDefinition, index) => {
      const homeTeam = resolveSlot(matchDefinition.home, context);
      const awayTeam = resolveSlot(matchDefinition.away, context);
      const match = {
        id: matchDefinition.id || `${roundKey}-${index + 1}`,
        matchNumber: matchDefinition.matchNumber || index + 1,
        roundKey,
        homeTeam,
        awayTeam,
        status: homeTeam.isPlaceholder || awayTeam.isPlaceholder ? 'placeholder' : 'ready',
        winner: null,
        loser: null,
        score: null,
        date: null,
        definition: matchDefinition,
      };

      builtMatches.set(match.id, match);
      return match;
    });
  });

  const bracket = {
    competitionId: normalizedCompetitionId,
    competitionName: competitionInfo?.name || null,
    roundsOrder: format.roundsOrder,
    roundLabels: ROUND_LABELS,
    format,
    ...rounds,
  };

  applyFixtureResultsToBracket(bracket, format, context, fixtures);

  return bracket;
}

/** @deprecated Usar buildOfficialKnockoutBracket */
export const buildOfficialSelectionBracket = buildOfficialKnockoutBracket;
