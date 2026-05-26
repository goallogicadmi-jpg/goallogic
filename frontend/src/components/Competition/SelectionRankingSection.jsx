import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { tokens } from '../../styles/tokens';
import { useCupCompetitionData } from '../../hooks/useCupCompetitionData';
import {
  extractTeamsFromTorneoResponse,
  mergeTeamsFromCupAndTorneo,
} from '../../utils/competitionTopScorers';
import {
  filterFifaRankingForCompetition,
  isFifaSelectionRankingCompetition,
} from '../../utils/competitionRanking';
import rankingData from '../../data/ranking.json';
import { COMPETITION_TAB_IDS } from './competitionTabIds';
import CompetitionLinkButton from './CompetitionLinkButton';
import '../../styles/standings.css';

const TOP_LIMIT = 20;

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
};

const loadingStyle = {
  textAlign: 'center',
  padding: tokens.spacing.xl,
  color: '#b0b0b0',
};

const highlightRowStyle = {
  backgroundColor: 'rgba(79, 195, 247, 0.12)',
  borderLeft: '3px solid #4FC3F7',
};

/**
 * Ranking FIFA para torneos de selecciones (no competiciones de clubes).
 */
export default function SelectionRankingSection({
  leagueId,
  season,
  domain = 'selection',
  competitionInfo,
  onTeamNavigate,
  onNavigateToTab,
}) {
  const [participantIds, setParticipantIds] = useState(new Set());
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  const isAllowed = isFifaSelectionRankingCompetition(leagueId, domain, competitionInfo);

  const cupData = useCupCompetitionData(
    leagueId,
    season,
    competitionInfo,
    isAllowed,
    'selection'
  );

  useEffect(() => {
    if (!isAllowed || !leagueId || !season) {
      setParticipantIds(new Set());
      setLoadingParticipants(false);
      return;
    }

    let cancelled = false;

    async function loadParticipants() {
      setLoadingParticipants(true);
      try {
        const torneoRes = await axios.get(
          `/estadisticas/torneo?leagueId=${leagueId}&season=${season}`
        );
        if (cancelled) return;

        let teams = extractTeamsFromTorneoResponse(torneoRes.data);
        if (cupData.groups?.length) {
          teams = mergeTeamsFromCupAndTorneo(teams, cupData.groups);
        }

        setParticipantIds(new Set(teams.map((t) => Number(t.teamId)).filter(Boolean)));
      } catch (err) {
        console.error('Error cargando participantes del torneo:', err);
        if (!cancelled) setParticipantIds(new Set());
      } finally {
        if (!cancelled) setLoadingParticipants(false);
      }
    }

    if (cupData.loading) return;

    loadParticipants();
    return () => {
      cancelled = true;
    };
  }, [isAllowed, leagueId, season, cupData.loading, cupData.groups]);

  const rankingEntries = useMemo(() => {
    const list = Array.isArray(rankingData?.ranking) ? rankingData.ranking : [];
    const sorted = [...list].sort((a, b) => (a.position || 999) - (b.position || 999));

    const confederationFiltered = filterFifaRankingForCompetition(sorted, leagueId);

    if (participantIds.size > 0) {
      const inTournament = confederationFiltered.filter((entry) =>
        participantIds.has(Number(entry.teamId))
      );
      if (inTournament.length > 0) {
        return inTournament.sort((a, b) => (a.position || 999) - (b.position || 999));
      }
    }

    return confederationFiltered.slice(0, TOP_LIMIT);
  }, [leagueId, participantIds]);

  const highlightedCount = useMemo(
    () => rankingEntries.filter((entry) => participantIds.has(Number(entry.teamId))).length,
    [rankingEntries, participantIds]
  );

  const bestParticipant = useMemo(() => {
    const participants = rankingEntries.filter((entry) =>
      participantIds.has(Number(entry.teamId))
    );
    if (!participants.length) return null;
    return [...participants].sort((a, b) => (a.position || 999) - (b.position || 999))[0];
  }, [rankingEntries, participantIds]);

  if (!isAllowed) {
    return (
      <p style={{ margin: 0, color: tokens.colors.textSecondary, textAlign: 'center' }}>
        No hay ranking FIFA disponible para competiciones de clubes. Consulta la tabla o los
        grupos de la competición.
      </p>
    );
  }

  if (loadingParticipants || cupData.loading) {
    return <p style={loadingStyle}>Cargando ranking FIFA...</p>;
  }

  if (rankingEntries.length === 0) {
    return (
      <p style={{ margin: 0, color: tokens.colors.textSecondary, textAlign: 'center' }}>
        No hay datos de ranking FIFA para mostrar en esta competición.
      </p>
    );
  }

  const showingOnlyParticipants = participantIds.size > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
        {showingOnlyParticipants
          ? `Selecciones participantes (${rankingEntries.length})`
          : `Top ${Math.min(TOP_LIMIT, rankingEntries.length)} mundial`}
        {' · Fuente: '}
        {rankingData.source || 'mock temporal'}
        {rankingData.updatedAt ? ` · Actualizado: ${rankingData.updatedAt}` : ''}
        {highlightedCount > 0 && (
          <span style={{ color: '#4FC3F7' }}>
            {' '}
            · {highlightedCount} en este torneo
          </span>
        )}
      </p>

      {bestParticipant && (
        <section style={cardStyle}>
          <h3
            style={{
              margin: `0 0 ${tokens.spacing.sm}`,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightSemibold,
              color: tokens.colors.textPrimary,
            }}
          >
            Mejor posicionada en el ranking
          </h3>
          <p style={{ margin: 0, color: tokens.colors.textPrimary }}>
            #{bestParticipant.position} {bestParticipant.teamName}
            <span style={{ color: tokens.colors.textSecondary }}>
              {' '}
              · {bestParticipant.points} pts FIFA
            </span>
          </p>
          <CompetitionLinkButton
            icon="history"
            onClick={() => onNavigateToTab?.(COMPETITION_TAB_IDS.HISTORIAL)}
          >
            Ver historial
          </CompetitionLinkButton>
        </section>
      )}

      <section style={cardStyle}>
        <div className="standings-table-wrapper table-responsive" style={{ padding: tokens.spacing.md }}>
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="text-left">Selección</th>
                <th>Pts FIFA</th>
                <th className="text-left">Confederación</th>
              </tr>
            </thead>
            <tbody>
              {rankingEntries.map((entry) => {
                const isParticipant = participantIds.has(Number(entry.teamId));
                const canNavigate = isParticipant && onTeamNavigate && entry.teamId;

                return (
                  <tr
                    key={entry.teamId || entry.position}
                    style={isParticipant ? highlightRowStyle : undefined}
                  >
                    <td className="position-cell">{entry.position}</td>
                    <td className="text-left">
                      <button
                        type="button"
                        className="team-cell"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: tokens.spacing.sm,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: canNavigate ? 'pointer' : 'default',
                          color: 'inherit',
                          font: 'inherit',
                          textAlign: 'left',
                        }}
                        onClick={() => canNavigate && onTeamNavigate(entry.teamId)}
                        disabled={!canNavigate}
                        title={
                          isParticipant
                            ? 'Ver ficha de la selección'
                            : 'No participa en esta competición'
                        }
                      >
                        {entry.flag && (
                          <img
                            src={entry.flag}
                            alt=""
                            width={22}
                            height={16}
                            style={{ objectFit: 'cover', borderRadius: 2 }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span>{entry.teamName}</span>
                        {isParticipant && (
                          <span
                            style={{
                              fontSize: tokens.typography.fontSizeXs,
                              color: '#4FC3F7',
                              fontWeight: tokens.typography.fontWeightSemibold,
                            }}
                          >
                            En el torneo
                          </span>
                        )}
                      </button>
                    </td>
                    <td style={{ fontWeight: tokens.typography.fontWeightSemibold }}>
                      {entry.points}
                    </td>
                    <td className="text-left">{entry.confederation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p style={{ margin: 0, color: tokens.colors.textMuted, fontSize: tokens.typography.fontSizeXs }}>
        Solo se listan selecciones del torneo cuando hay participantes registrados. El ranking
        completo se actualizará cuando haya datos oficiales disponibles.
      </p>
    </div>
  );
}
