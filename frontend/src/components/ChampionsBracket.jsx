import React from 'react';
import '../styles/championsBracket.css';

/**
 * Componente para renderizar el bracket completo de la UEFA Champions League
 * Muestra: Playoffs, Octavos, Cuartos, Semifinal y Final
 */
export default function ChampionsBracket({ bracket, onMatchUpdate }) {
  if (!bracket) {
    return (
      <div className="champions-bracket-container">
        <div className="bracket-empty">
          <p>No hay datos del bracket disponibles</p>
        </div>
      </div>
    );
  }

  const formatMatchDate = (dateValue) => {
    if (!dateValue) return null;

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const renderMatch = (match, roundName) => {
    if (!match) return null;

    const isFinal = roundName === 'final';
    const isCompleted = match.status === 'completed';
    const hasWinner = match.winner !== null;

    // Para final, usar finalScore; para otras rondas, usar aggregateScore
    const score = isFinal 
      ? match.finalScore 
      : match.aggregateScore;

    return (
      <div 
        key={match.id || Math.random()} 
        className={`bracket-match ${isCompleted ? 'completed' : ''} ${hasWinner ? 'has-winner' : ''}`}
      >
        <div className="match-teams">
          <div className={`match-team ${hasWinner && match.winner?.id === match.homeTeam?.id ? 'winner' : ''}`}>
            {match.homeTeam?.logo && (
              <img 
                src={match.homeTeam.logo} 
                alt={match.homeTeam.name} 
                className="team-logo-small"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className="team-name">{match.homeTeam?.name || 'TBD'}</span>
            {hasWinner && match.winner?.id === match.homeTeam?.id && (
              <span className="winner-badge">✓</span>
            )}
          </div>
          
          <div className="match-score">
            {isFinal ? (
              // Final: partido único
              score?.played ? (
                <div className="score-display">
                  {score?.date && (
                    <div className="leg-score">
                      <span className="leg-label">Fecha:</span>
                      <span>{formatMatchDate(score.date)}</span>
                    </div>
                  )}
                  <span className="score-number">{score.homeScore || 0}</span>
                  <span className="score-separator">-</span>
                  <span className="score-number">{score.awayScore || 0}</span>
                  {match.tieBreak?.type === 'penalties' && (
                    <div className="aggregate-score">
                      <span className="aggregate-label">Penales:</span>
                      <span className="score-number">{match.tieBreak.home || 0}</span>
                      <span className="score-separator">-</span>
                      <span className="score-number">{match.tieBreak.away || 0}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="score-placeholder">vs</div>
              )
            ) : (
              // Otras rondas: ida y vuelta
              match.firstLeg?.played || match.secondLeg?.played ? (
                <div className="score-display">
                  {match.firstLeg?.played && (
                    <div className="leg-score">
                      <span className="leg-label">Ida:</span>
                      <span>
                        {match.firstLeg.homeScore || 0} - {match.firstLeg.awayScore || 0}
                        {match.firstLeg.date ? ` (${formatMatchDate(match.firstLeg.date)})` : ''}
                      </span>
                    </div>
                  )}
                  {match.secondLeg?.played && (
                    <div className="leg-score">
                      <span className="leg-label">Vuelta:</span>
                      <span>
                        {match.secondLeg.awayScore || 0} - {match.secondLeg.homeScore || 0}
                        {match.secondLeg.date ? ` (${formatMatchDate(match.secondLeg.date)})` : ''}
                      </span>
                    </div>
                  )}
                  {match.aggregateScore?.home !== null && (
                    <div className="aggregate-score">
                      <span className="aggregate-label">Global:</span>
                      <span className="score-number">{match.aggregateScore.home || 0}</span>
                      <span className="score-separator">-</span>
                      <span className="score-number">{match.aggregateScore.away || 0}</span>
                    </div>
                  )}
                  {match.tieBreak?.type === 'penalties' && (
                    <div className="aggregate-score">
                      <span className="aggregate-label">Penales:</span>
                      <span className="score-number">{match.tieBreak.home || 0}</span>
                      <span className="score-separator">-</span>
                      <span className="score-number">{match.tieBreak.away || 0}</span>
                    </div>
                  )}
                  {match.tieBreak?.type === 'extra_time' && (
                    <div className="aggregate-score">
                      <span className="aggregate-label">Desempate:</span>
                      <span>{match.tieBreak.label}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="score-placeholder">vs</div>
              )
            )}
          </div>

          <div className={`match-team ${hasWinner && match.winner?.id === match.awayTeam?.id ? 'winner' : ''}`}>
            {match.awayTeam?.logo && (
              <img 
                src={match.awayTeam.logo} 
                alt={match.awayTeam.name} 
                className="team-logo-small"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className="team-name">{match.awayTeam?.name || 'TBD'}</span>
            {hasWinner && match.winner?.id === match.awayTeam?.id && (
              <span className="winner-badge">✓</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRound = (roundName, matches, title) => {
    if (!matches || (Array.isArray(matches) && matches.length === 0)) {
      return null;
    }

    const matchList = Array.isArray(matches) ? matches : [matches];

    return (
      <div key={roundName} className="bracket-round">
        <h3 className="round-title">{title}</h3>
        <div className="round-matches">
          {matchList.map((match, index) => (
            <div key={match?.id || index} className="match-wrapper">
              {renderMatch(match, roundName)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="champions-bracket-container">
      <div className="bracket-header">
        <h2 className="bracket-title">🏆 Fase Eliminatoria - UEFA Champions League</h2>
        <div className="bracket-status">
          Estado: <span className={`status-badge ${bracket.status || 'not_started'}`}>
            {bracket.status === 'completed' ? 'Completado' : 
             bracket.status === 'in_progress' ? 'En curso' : 
             'No iniciado'}
          </span>
        </div>
      </div>

      <div className="bracket-content">
        {/* Playoff */}
        {bracket.playoff && bracket.playoff.length > 0 && (
          renderRound('playoff', bracket.playoff, 'Playoff (9-24)')
        )}

        {/* Octavos de Final */}
        {bracket.roundOf16 && bracket.roundOf16.length > 0 && (
          renderRound('roundOf16', bracket.roundOf16, 'Octavos de Final')
        )}

        {/* Cuartos de Final */}
        {bracket.quarterFinals && bracket.quarterFinals.length > 0 && (
          renderRound('quarterFinals', bracket.quarterFinals, 'Cuartos de Final')
        )}

        {/* Semifinal */}
        {bracket.semiFinals && bracket.semiFinals.length > 0 && (
          renderRound('semiFinals', bracket.semiFinals, 'Semifinal')
        )}

        {/* Final */}
        {bracket.final && (
          renderRound('final', bracket.final, 'Final')
        )}

        {/* Mensaje si no hay bracket iniciado */}
        {(!bracket.playoff || bracket.playoff.length === 0) && 
         (!bracket.roundOf16 || bracket.roundOf16.length === 0) && 
         !bracket.final && (
          <div className="bracket-empty">
            <p>El bracket aún no ha comenzado. Los playoffs se generarán cuando la fase de grupos termine.</p>
          </div>
        )}
      </div>
    </div>
  );
}
