/**
 * Reglas de clasificación continental por liga (solo configuración declarativa).
 */

export const leagueIdToKey = {
  140: 'laLiga',
  39: 'premierLeague',
  78: 'bundesliga',
  135: 'serieA',
  61: 'ligue1',
  88: 'eredivisie',
  94: 'primeiraLiga',
  203: 'superLig',
  235: 'russianPremierLiga',
  239: 'ligaBetPlay',
  71: 'brasileirao',
  72: 'brasileiraoB',
  262: 'ligaMX',
  253: 'mls',
  141: 'laligaHypermotion',
  40: 'championship',
  128: 'ligaArgentina',
  103: 'ligaArgentina', // API alternativo
};

/** Continente por ID de liga (catálogo + ligas habituales en API-Football). */
export const leagueIdToContinent = {
  140: 'europe',
  39: 'europe',
  78: 'europe',
  135: 'europe',
  61: 'europe',
  88: 'europe',
  94: 'europe',
  203: 'europe',
  235: 'europe',
  141: 'europe',
  40: 'europe',
  71: 'southAmerica',
  72: 'southAmerica',
  239: 'southAmerica',
  128: 'southAmerica',
  103: 'southAmerica',
  262: 'concacaf',
  253: 'concacaf',
};

const europeTemplate = {
  continent: 'europe',
  hasConference: true,
  leagueSpots: {
    champions: [1, 2, 3, 4],
    europa: [5],
    conference: [6],
    relegation: [],
  },
  cupSpots: {
    domesticCup: 'europa',
  },
};

const southAmericaTemplate = {
  continent: 'southAmerica',
  hasConference: false,
  leagueSpots: {
    libertadores: [1, 2, 3, 4],
    sudamericana: [5, 6],
    relegation: [],
  },
  cupSpots: {
    domesticCup: 'libertadores',
  },
};

const concacafTemplate = {
  continent: 'concacaf',
  hasConference: false,
  leagueSpots: {
    concacaf: [1, 2, 3],
    relegation: [],
  },
  cupSpots: {
    domesticCup: 'concacaf',
  },
};

const asiaTemplate = {
  continent: 'asia',
  hasConference: false,
  leagueSpots: {
    afc: [1, 2, 3, 4],
    relegation: [],
  },
  cupSpots: {
    domesticCup: 'afc',
  },
};

const africaTemplate = {
  continent: 'africa',
  hasConference: false,
  leagueSpots: {
    caf: [1, 2, 3],
    relegation: [],
  },
  cupSpots: {
    domesticCup: 'caf',
  },
};

const oceaniaTemplate = {
  continent: 'oceania',
  hasConference: false,
  leagueSpots: {
    ofc: [1],
    relegation: [],
  },
  cupSpots: {
    domesticCup: 'ofc',
  },
};

/** Sin plazas continentales: solo descenso dinámico. */
const domesticOnlyTemplate = {
  continent: 'none',
  hasConference: false,
  leagueSpots: {
    relegation: [],
  },
  cupSpots: {},
};

export const continentTemplates = {
  europe: europeTemplate,
  southAmerica: southAmericaTemplate,
  concacaf: concacafTemplate,
  asia: asiaTemplate,
  africa: africaTemplate,
  oceania: oceaniaTemplate,
  none: domesticOnlyTemplate,
};

export const leagueConfig = {
  laLiga: {
    ...europeTemplate,
    leagueKey: 'laLiga',
    leagueSpots: {
      champions: [1, 2, 3, 4],
      europa: [5],
      conference: [6],
      relegation: [18, 19, 20],
    },
  },

  premierLeague: {
    ...europeTemplate,
    leagueKey: 'premierLeague',
    leagueSpots: {
      champions: [1, 2, 3, 4],
      europa: [5, 6],
      conference: [7],
      relegation: [18, 19, 20],
    },
    cupSpots: {
      domesticCup: 'europa',
      secondaryCup: 'conference',
    },
  },

  bundesliga: {
    ...europeTemplate,
    leagueKey: 'bundesliga',
    leagueSpots: {
      champions: [1, 2, 3, 4],
      europa: [5],
      conference: [6],
      relegation: [17, 18],
    },
  },

  serieA: {
    ...europeTemplate,
    leagueKey: 'serieA',
    leagueSpots: {
      champions: [1, 2, 3, 4],
      europa: [5],
      conference: [6],
      relegation: [18, 19, 20],
    },
  },

  ligue1: {
    ...europeTemplate,
    leagueKey: 'ligue1',
    leagueSpots: {
      champions: [1, 2, 3],
      europa: [4],
      conference: [5],
      relegation: [18, 19, 20],
    },
  },

  eredivisie: {
    ...europeTemplate,
    leagueKey: 'eredivisie',
    leagueSpots: {
      champions: [1, 2],
      europa: [3],
      conference: [4],
      relegation: [16, 17, 18],
    },
  },

  primeiraLiga: {
    ...europeTemplate,
    leagueKey: 'primeiraLiga',
    leagueSpots: {
      champions: [1, 2],
      europa: [3],
      conference: [4],
      relegation: [16, 17, 18],
    },
  },

  superLig: {
    ...europeTemplate,
    leagueKey: 'superLig',
    leagueSpots: {
      champions: [1, 2],
      europa: [3],
      conference: [4],
      relegation: [17, 18, 19],
    },
  },

  russianPremierLiga: {
    ...europeTemplate,
    leagueKey: 'russianPremierLiga',
    leagueSpots: {
      champions: [1, 2],
      europa: [3],
      conference: [4],
      relegation: [15, 16],
    },
  },

  championship: {
    ...europeTemplate,
    leagueKey: 'championship',
    leagueSpots: {
      europa: [3],
      conference: [4, 5],
      relegation: [22, 23, 24],
    },
    cupSpots: {
      domesticCup: 'europa',
    },
  },

  laligaHypermotion: {
    ...europeTemplate,
    leagueKey: 'laligaHypermotion',
    leagueSpots: {
      europa: [1, 2],
      relegation: [20, 21, 22],
    },
    hasConference: false,
  },

  brasileirao: {
    ...southAmericaTemplate,
    leagueKey: 'brasileirao',
    leagueSpots: {
      libertadores: [1, 2, 3, 4],
      sudamericana: [5, 6],
      relegation: [17, 18, 19, 20],
    },
  },

  brasileiraoB: {
    ...southAmericaTemplate,
    leagueKey: 'brasileiraoB',
    leagueSpots: {
      libertadores: [1, 2, 3],
      sudamericana: [4],
      relegation: [18, 19, 20],
    },
  },

  ligaBetPlay: {
    ...southAmericaTemplate,
    leagueKey: 'ligaBetPlay',
    leagueSpots: {
      libertadores: [1, 2],
      sudamericana: [3, 4],
      relegation: [18, 19, 20],
    },
  },

  ligaArgentina: {
    ...southAmericaTemplate,
    leagueKey: 'ligaArgentina',
    leagueSpots: {
      libertadores: [1, 2, 3, 4],
      sudamericana: [5, 6],
      relegation: [26, 27, 28],
    },
  },

  ligaMX: {
    ...concacafTemplate,
    leagueKey: 'ligaMX',
    leagueSpots: {
      concacaf: [1, 2, 3, 4, 5],
      relegation: [17, 18],
    },
  },

  mls: {
    ...concacafTemplate,
    leagueKey: 'mls',
    leagueSpots: {
      concacaf: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      relegation: [],
    },
  },
};

export const ZONE_LABELS = {
  champions: 'Champions League',
  europa: 'Europa League',
  conference: 'Conference League',
  libertadores: 'Copa Libertadores',
  sudamericana: 'Copa Sudamericana',
  concacaf: 'Concacaf Champions Cup',
  afc: 'AFC Champions League',
  caf: 'CAF Champions League',
  ofc: 'OFC Champions League',
  relegation: 'Descenso',
};

/** Zonas que cuentan como clasificación continental (excluye descenso). */
export const CONTINENTAL_QUALIFICATION_ZONES = new Set([
  'champions',
  'europa',
  'conference',
  'libertadores',
  'sudamericana',
  'concacaf',
  'afc',
  'caf',
  'ofc',
]);

export function getLeagueContinent(leagueId) {
  const key = leagueIdToKey[Number(leagueId)];
  if (key && leagueConfig[key]?.continent) {
    return leagueConfig[key].continent;
  }
  return leagueIdToContinent[Number(leagueId)] || 'none';
}

export function getLeagueConfig(leagueId) {
  const numericId = Number(leagueId);
  const leagueKey = leagueIdToKey[numericId];

  if (leagueKey && leagueConfig[leagueKey]) {
    return leagueConfig[leagueKey];
  }

  const continent = leagueIdToContinent[numericId];
  if (continent && continentTemplates[continent]) {
    return {
      ...continentTemplates[continent],
      leagueKey: `continent-${continent}`,
    };
  }

  return continentTemplates.none;
}

/**
 * Ítems de leyenda según las zonas activas de la liga.
 */
export function getLegendItemsForLeague(leagueId) {
  const config = getLeagueConfig(leagueId);
  const spots = config.leagueSpots || {};
  const items = [];

  const zoneOrder = [
    'champions',
    'europa',
    'conference',
    'libertadores',
    'sudamericana',
    'concacaf',
    'afc',
    'caf',
    'ofc',
    'relegation',
  ];

  zoneOrder.forEach((zone) => {
    const positions = spots[zone];
    if (Array.isArray(positions) && positions.length > 0) {
      items.push({
        zone,
        label: ZONE_LABELS[zone] || zone,
        colorClass: zone === 'relegation' ? 'descenso' : zone,
      });
    }
  });

  if (!items.some((item) => item.zone === 'relegation')) {
    items.push({
      zone: 'relegation',
      label: ZONE_LABELS.relegation,
      colorClass: 'descenso',
      dynamicRelegation: true,
    });
  }

  return items;
}
