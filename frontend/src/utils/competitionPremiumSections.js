import { COMPETITION_TAB_IDS } from '../components/Competition/competitionTabIds';
import { FEATURES } from './planAccess';

/** Pestañas de competición que requieren feature premium antes de abrirse. */
export const COMPETITION_PREMIUM_TABS = {
  [COMPETITION_TAB_IDS.ESTADISTICAS]: FEATURES.ADVANCED_STATS,
};

export function getCompetitionTabPremiumFeature(tabId) {
  return COMPETITION_PREMIUM_TABS[tabId] || null;
}

export const COMPETITION_PREMIUM_COPY = {
  [FEATURES.ADVANCED_STATS]: {
    title: 'Estadísticas avanzadas de la competición',
    description:
      'KPIs, tendencias, xG estimado y métricas avanzadas por equipo están disponibles en GOAL_LOGIC PRO.',
  },
  [FEATURES.ADVANCED_MODELS]: {
    title: 'Modelos avanzados de competición',
    description:
      'Comparaciones avanzadas y modelos estadísticos del torneo están disponibles en GOAL_LOGIC PRO.',
  },
};
