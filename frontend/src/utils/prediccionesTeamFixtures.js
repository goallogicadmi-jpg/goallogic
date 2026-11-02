import { getTeamFixtures } from '../api/api';
import {
  getCachedTeamFixtures,
  setCachedTeamFixtures,
} from './prediccionesMetricsCache';

export async function getTeamFixturesForPredicciones(teamId, limit = 25) {
  const cached = getCachedTeamFixtures(teamId, limit);
  if (cached) {
    return cached;
  }

  const data = await getTeamFixtures(teamId, limit);
  setCachedTeamFixtures(teamId, limit, data);
  return data;
}
