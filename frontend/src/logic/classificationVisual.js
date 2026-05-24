/**

 * Estilos visuales de clasificación (colores, tooltips, clases CSS).

 */



import { ZONE_LABELS } from './leagueRules';

import { isContinentalQualificationZone } from './leagueClassification';



const ZONE_VISUALS = {

  champions: {

    rowClass: 'champions',

    leftBarColor: '#00A86B',

    backgroundColor: 'rgba(0, 168, 107, 0.12)',

  },

  europa: {

    rowClass: 'europa',

    leftBarColor: '#1A2A80',

    backgroundColor: 'rgba(26, 42, 128, 0.12)',

  },

  conference: {

    rowClass: 'conference',

    leftBarColor: '#F5C542',

    backgroundColor: 'rgba(245, 197, 66, 0.12)',

  },

  libertadores: {

    rowClass: 'libertadores',

    leftBarColor: '#00A86B',

    backgroundColor: 'rgba(0, 168, 107, 0.12)',

  },

  sudamericana: {

    rowClass: 'sudamericana',

    leftBarColor: '#1A2A80',

    backgroundColor: 'rgba(26, 42, 128, 0.12)',

  },

  concacaf: {

    rowClass: 'concacaf',

    leftBarColor: '#F5C542',

    backgroundColor: 'rgba(245, 197, 66, 0.12)',

  },

  afc: {

    rowClass: 'afc',

    leftBarColor: '#E63946',

    backgroundColor: 'rgba(230, 57, 70, 0.12)',

  },

  caf: {

    rowClass: 'caf',

    leftBarColor: '#F77F00',

    backgroundColor: 'rgba(247, 127, 0, 0.12)',

  },

  ofc: {

    rowClass: 'ofc',

    leftBarColor: '#3A86FF',

    backgroundColor: 'rgba(58, 134, 255, 0.12)',

  },

  relegation: {

    rowClass: 'relegation',

    leftBarColor: '#D90429',

    backgroundColor: 'rgba(217, 4, 41, 0.12)',

  },

};



export function getVisualClassification(allocation) {

  const classes = [];

  let leftBarColor = null;

  let backgroundColor = null;

  let icon = null;

  let tooltip = null;



  const zoneToCheck =

    allocation.finalCompetition !== 'none' ? allocation.finalCompetition : allocation.zone;



  const visual = ZONE_VISUALS[zoneToCheck];

  if (visual) {

    classes.push(visual.rowClass);

    leftBarColor = visual.leftBarColor;

    backgroundColor = visual.backgroundColor;

    tooltip = ZONE_LABELS[zoneToCheck] || zoneToCheck;

  }



  if (allocation.qualificationSource === 'cup') {

    classes.push('cup-qualified');

    icon = '🏆';

    tooltip = tooltip

      ? `${tooltip} (Campeón de copa)`

      : 'Clasificado como campeón de copa';

  }



  if (allocation.qualificationSource === 'inherited') {

    classes.push('inherited-spot');

    tooltip = tooltip

      ? `${tooltip} (Plaza redistribuida)`

      : 'Clasificación heredada por redistribución';

  }



  return {

    rowClassNames: classes,

    leftBarColor,

    backgroundColor,

    icon,

    tooltip,

  };

}



export function isQualifyingAllocation(allocation) {

  const zone = allocation?.finalCompetition !== 'none'

    ? allocation.finalCompetition

    : allocation?.zone;

  return zone === 'relegation' || isContinentalQualificationZone(zone);

}


