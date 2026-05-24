/**

 * Clasificación por liga según continente y plazas configuradas.

 */



import {

  CONTINENTAL_QUALIFICATION_ZONES,

  getLeagueConfig,

} from './leagueRules';



/**

 * @param {number} position

 * @param {number} leagueId

 * @param {number|null} totalTeams

 * @returns {string}

 */

export function getZone(position, leagueId, totalTeams = null) {

  const config = getLeagueConfig(leagueId);

  const spots = config?.leagueSpots;

  if (!spots) return 'none';



  for (const [zone, positions] of Object.entries(spots)) {

    if (Array.isArray(positions) && positions.includes(position)) {

      return zone;

    }

  }



  if (totalTeams && position >= totalTeams - 2) {

    return 'relegation';

  }



  return 'none';

}



export function isContinentalQualificationZone(zone) {

  return CONTINENTAL_QUALIFICATION_ZONES.has(zone);

}



/**

 * @param {string} zone

 * @param {number} leagueId

 * @param {number|null} totalTeams

 * @returns {number[]}

 */

export function getZonePositions(zone, leagueId, totalTeams = null) {

  const config = getLeagueConfig(leagueId);

  const positions = config?.leagueSpots?.[zone];



  if (Array.isArray(positions) && positions.length > 0) {

    return positions;

  }



  if (zone === 'relegation' && totalTeams) {

    return [totalTeams - 2, totalTeams - 1, totalTeams];

  }



  return [];

}


