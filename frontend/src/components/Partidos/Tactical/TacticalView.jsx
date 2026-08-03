import { useEffect, useMemo, useState } from 'react';
import useTacticalView from '../../../hooks/useTacticalView';
import PremiumTabs from '../../ui/PremiumTabs';
import '../../../styles/tacticalView.css';

const PHOTO_CDN = (id) => `https://media.api-sports.io/football/players/${id}.png`;

function linkKey(link) {
  return `${link.fromId}-${link.toId}`;
}

function TacticalPitchNode({ player, isHovered, onMouseEnter, onMouseLeave }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const playerId = player.playerId;

  useEffect(() => {
    setPhotoFailed(false);
  }, [playerId]);

  const showPhoto = Boolean(playerId) && !photoFailed;
  const initial = (player.name || '?').trim().charAt(0).toUpperCase();

  return (
    <g
      className={`tactical-pitch__node${isHovered ? ' tactical-pitch__node--hover' : ''}`}
      transform={`translate(${player.x}, ${player.y})`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <circle r="5.5" className="tactical-pitch__node-bg" />
      {Boolean(playerId) && (
        <image
          href={PHOTO_CDN(playerId)}
          x="-4.5"
          y="-4.5"
          width="9"
          height="9"
          className="tactical-pitch__node-photo"
          visibility={showPhoto ? 'visible' : 'hidden'}
          onError={() => setPhotoFailed(true)}
        />
      )}
      {!showPhoto && (
        <text className="tactical-pitch__node-initial" y="1.5">
          {initial}
        </text>
      )}
      <text className="tactical-pitch__node-number" y="9.5">
        {player.number}
      </text>
      <title>
        {player.name} — posición promedio ({player.x}%, {player.y}%)
      </title>
    </g>
  );
}

/**
 * Cancha SVG con red de pases y posiciones promedio.
 */
function TacticalPitch({ teamData, teamLabel }) {
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);

  const players = teamData?.players || [];
  const links = teamData?.links || [];
  const zoneIntensity = teamData?.zoneIntensity || [];
  const colors = teamData?.colors || { primary: '#1565c0', secondary: '#0d3d18' };

  const maxLinkCount = useMemo(
    () => Math.max(1, ...links.map((l) => l.count)),
    [links]
  );

  const playerById = useMemo(() => {
    const map = new Map();
    players.forEach((p) => map.set(String(p.playerId), p));
    return map;
  }, [players]);

  if (!teamData?.hasData) {
    return (
      <p className="tactical-view__empty">Datos tácticos insuficientes para este partido</p>
    );
  }

  return (
    <div
      className="tactical-pitch-wrap tactical-pitch-wrap--loaded"
      style={{
        '--tactical-primary': colors.primary,
        '--tactical-secondary': colors.secondary,
      }}
    >
      <p className="tactical-pitch__team-label">{teamLabel || teamData.teamName}</p>

      <svg
        className="tactical-pitch"
        viewBox="0 0 100 140"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Vista táctica ${teamLabel}`}
      >
        <rect x="0" y="0" width="100" height="140" fill="#1a3d22" rx="4" />
        <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.5" />
        <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.22)" strokeWidth="0.4" />
        <circle cx="50" cy="70" r="10" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
        <rect x="28" y="2" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
        <rect x="28" y="122" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />

        <g className="tactical-pitch__zones" aria-hidden="true">
          {zoneIntensity.map((cell, idx) => (
            <circle
              key={`zone-${idx}`}
              cx={cell.x}
              cy={cell.y}
              r={5}
              fill={colors.primary}
              opacity={0.08 + cell.intensity * 0.22}
            />
          ))}
        </g>

        <g className="tactical-pitch__links">
          {links.map((link) => {
            const from = playerById.get(String(link.fromId));
            const to = playerById.get(String(link.toId));
            if (!from || !to) return null;

            const key = linkKey(link);
            const isHovered = hoveredLink === key;
            const strokeW = 0.6 + (link.count / maxLinkCount) * 3.2;
            const fromPlayer = playerById.get(String(link.fromId));
            const toPlayer = playerById.get(String(link.toId));

            return (
              <line
                key={key}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={`tactical-pitch__link${isHovered ? ' tactical-pitch__link--hover' : ''}`}
                stroke={colors.primary}
                strokeWidth={strokeW}
                strokeOpacity={isHovered ? 0.95 : 0.35 + (link.count / maxLinkCount) * 0.45}
                strokeLinecap="round"
                onMouseEnter={() => setHoveredLink(key)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                <title>
                  {link.count} pases completados entre {fromPlayer?.name} y {toPlayer?.name}
                </title>
              </line>
            );
          })}
        </g>

        <g className="tactical-pitch__nodes">
          {players.map((player) => (
            <TacticalPitchNode
              key={player.playerId}
              player={player}
              isHovered={hoveredPlayer === String(player.playerId)}
              onMouseEnter={() => setHoveredPlayer(String(player.playerId))}
              onMouseLeave={() => setHoveredPlayer(null)}
            />
          ))}
        </g>
      </svg>

      {hoveredLink && (
        <p className="tactical-pitch__tooltip" role="status">
          {(() => {
            const link = links.find((l) => linkKey(l) === hoveredLink);
            if (!link) return null;
            const from = playerById.get(String(link.fromId));
            const to = playerById.get(String(link.toId));
            return `${link.count} pases completados entre ${from?.name} y ${to?.name}`;
          })()}
        </p>
      )}

      {hoveredPlayer && !hoveredLink && (
        <p className="tactical-pitch__tooltip" role="status">
          {(() => {
            const p = playerById.get(hoveredPlayer);
            return p
              ? `${p.name} — posición promedio (${p.x}%, ${p.y}%)`
              : null;
          })()}
        </p>
      )}
    </div>
  );
}

/**
 * Vista táctica avanzada del partido.
 */
export default function TacticalView({ fixtureId, partido }) {
  const [selectedTeam, setSelectedTeam] = useState('home');

  const { loading, error, home, away, isLive, isFinished, refetch } = useTacticalView(
    fixtureId,
    partido,
    { enabled: Boolean(fixtureId) }
  );

  const teamData = selectedTeam === 'away' ? away : home;
  const homeName = partido?.teams?.home?.name || 'Local';
  const awayName = partido?.teams?.away?.name || 'Visitante';

  if (loading) {
    return (
      <div className="tactical-view tactical-view--loading">
        <p>Cargando vista táctica…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tactical-view tactical-view--error">
        <p>{error}</p>
        <button type="button" className="lineups-retry-btn" onClick={refetch}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="tactical-view">
      <header className="tactical-view__header">
        <h3 className="tactical-view__title">Vista táctica</h3>
        {isLive && !isFinished && (
          <span className="tactical-view__live">EN VIVO</span>
        )}
      </header>

      <PremiumTabs
        tabs={[
          { id: 'home', label: homeName },
          { id: 'away', label: awayName },
        ]}
        activeTab={selectedTeam}
        onTabChange={setSelectedTeam}
        ariaLabel="Seleccionar equipo"
        inset
      />

      <TacticalPitch
        teamData={teamData}
        teamLabel={selectedTeam === 'home' ? homeName : awayName}
      />

      <p className="tactical-view__hint">
        Grosor de línea = volumen de pases entre jugadores. Posiciones basadas en eventos y
        actividad del partido.
      </p>
    </div>
  );
}
