import React, { useState } from 'react';
import { getLegendItemsForLeague } from '../logic/leagueRules';
import '../styles/standings.css';

/**
 * Leyenda interactiva según continente / plazas de la liga.
 */
export default function Legend({
  onFilterChange,
  isCup = false,
  isChampionsLeague = false,
  leagueId = null,
}) {
  const [activeFilter, setActiveFilter] = useState(null);

  const handleFilterClick = (filter) => {
    const newFilter = activeFilter === filter ? null : filter;
    setActiveFilter(newFilter);
    if (onFilterChange) {
      onFilterChange(newFilter);
    }
  };

  if (isChampionsLeague) {
    return (
      <div className="legend">
        <div
          className={`legend-item ${activeFilter === 'direct_round_of_16' ? 'active' : ''}`}
          onClick={() => handleFilterClick('direct_round_of_16')}
          style={{ cursor: 'pointer' }}
        >
          <span className="color champions-direct" style={{ background: '#1A2A80' }} />
          Directo a Octavos (1-8)
        </div>
        <div
          className={`legend-item ${activeFilter === 'playoff' ? 'active' : ''}`}
          onClick={() => handleFilterClick('playoff')}
          style={{ cursor: 'pointer' }}
        >
          <span className="color champions-playoff" style={{ background: '#3A6DFF' }} />
          Playoff (9-24)
        </div>
        <div
          className={`legend-item ${activeFilter === 'eliminated' ? 'active' : ''}`}
          onClick={() => handleFilterClick('eliminated')}
          style={{ cursor: 'pointer' }}
        >
          <span className="color champions-eliminated" style={{ background: '#9E9E9E' }} />
          Eliminado (25-36)
        </div>
      </div>
    );
  }

  if (isCup) {
    return (
      <div className="legend">
        <div
          className={`legend-item ${activeFilter === 'clasificado' ? 'active' : ''}`}
          onClick={() => handleFilterClick('clasificado')}
          style={{ cursor: 'pointer' }}
        >
          <span className="color clasificado" />
          Clasificado
        </div>
        <div
          className={`legend-item ${activeFilter === 'repechaje' ? 'active' : ''}`}
          onClick={() => handleFilterClick('repechaje')}
          style={{ cursor: 'pointer' }}
        >
          <span className="color repechaje" />
          Repechaje
        </div>
        <div
          className={`legend-item ${activeFilter === 'eliminado' ? 'active' : ''}`}
          onClick={() => handleFilterClick('eliminado')}
          style={{ cursor: 'pointer' }}
        >
          <span className="color eliminado" />
          Eliminado
        </div>
      </div>
    );
  }

  const legendItems = leagueId != null ? getLegendItemsForLeague(leagueId) : [];

  if (!legendItems.length) {
    return null;
  }

  return (
    <div className="legend">
      {legendItems.map((item) => (
        <div
          key={item.zone}
          className={`legend-item ${activeFilter === item.zone ? 'active' : ''}`}
          onClick={() => handleFilterClick(item.zone)}
          style={{ cursor: 'pointer' }}
        >
          <span className={`color ${item.colorClass}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
