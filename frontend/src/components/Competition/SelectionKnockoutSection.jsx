import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLeagueFixtures } from '../../api/api';
import PartidoCard from '../Partidos/PartidoCard';
import MatchCenter from '../Partidos/MatchCenter';
import OfficialKnockoutBracket from '../CupCompetition/OfficialKnockoutBracket';
import CupCompetitionView from '../CupCompetition/CupCompetitionView';
import { useCupCompetitionData } from '../../hooks/useCupCompetitionData';
import { buildOfficialKnockoutBracket } from '../../utils/buildOfficialSelectionBracket';
import { tokens } from '../../styles/tokens';
import '../../styles/partidos.css';

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
  marginBottom: tokens.spacing.lg,
};

const KNOCKOUT_KEYWORDS = [
  'round of 16',
  'quarter',
  'semi',
  'final',
  'octavos',
  'cuartos',
  'semifinal',
  'eliminatoria',
  'playoff',
  'repechage',
];

function isKnockoutFixture(partido) {
  const round = String(partido?.league?.round || '').toLowerCase();
  return KNOCKOUT_KEYWORDS.some((keyword) => round.includes(keyword));
}

/**
 * Tab Eliminatoria: bracket oficial + partidos con MatchCenter.
 */
export default function SelectionKnockoutSection({
  competitionId,
  season,
  competitionInfo,
  domain = 'selection',
}) {
  const cupData = useCupCompetitionData(competitionId, season, competitionInfo, true, 'selection');
  const [fixtures, setFixtures] = useState({ proximos: [], pasados: [] });
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);

  useEffect(() => {
    if (!competitionId || !season) return;

    let cancelled = false;

    async function loadFixtures() {
      setFixturesLoading(true);
      try {
        const data = await getLeagueFixtures(competitionId, season, { next: 15, last: 30 });
        if (cancelled) return;
        setFixtures({
          proximos: Array.isArray(data?.proximos) ? data.proximos : [],
          pasados: Array.isArray(data?.pasados) ? data.pasados : [],
        });
      } catch (err) {
        console.error('Error cargando fixtures KO:', err);
        if (!cancelled) {
          setFixtures({ proximos: [], pasados: [] });
        }
      } finally {
        if (!cancelled) {
          setFixturesLoading(false);
        }
      }
    }

    loadFixtures();
    return () => {
      cancelled = true;
    };
  }, [competitionId, season]);

  const knockoutFixtures = useMemo(() => {
    const combined = [...fixtures.pasados, ...fixtures.proximos];
    const filtered = combined.filter(isKnockoutFixture);
    if (filtered.length > 0) return filtered;
    return combined;
  }, [fixtures]);

  const allFixtures = useMemo(
    () => [...fixtures.pasados, ...fixtures.proximos],
    [fixtures.pasados, fixtures.proximos]
  );

  const displayBracket = useMemo(() => {
    if (!cupData.hasOfficialKnockoutStructure && !cupData.hasBracket) {
      return null;
    }

    const rebuilt = buildOfficialKnockoutBracket({
      competitionId,
      groups: cupData.selectableGroups.length ? cupData.selectableGroups : cupData.groups,
      groupsByCompetition: cupData.groupsByCompetition,
      competitionInfo,
      fixtures: allFixtures,
    });

    return rebuilt || cupData.bracket;
  }, [
    cupData.bracket,
    cupData.groups,
    cupData.groupsByCompetition,
    cupData.selectableGroups,
    cupData.hasBracket,
    cupData.hasOfficialKnockoutStructure,
    competitionId,
    competitionInfo,
    allFixtures,
  ]);

  const showKnockoutBracket =
    cupData.hasBracket || cupData.hasOfficialKnockoutStructure || Boolean(displayBracket);

  const handlePartidoClick = useCallback((partido) => {
    setPartidoSeleccionado(partido);
  }, []);

  if (cupData.loading) {
    return <p style={{ textAlign: 'center', color: tokens.colors.textSecondary }}>Cargando eliminatoria...</p>;
  }

  if (cupData.error && !showKnockoutBracket) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.accentNegative }}>{cupData.error}</p>
      </div>
    );
  }

  if (!showKnockoutBracket) {
    return (
      <CupCompetitionView
        competitionId={competitionId}
        season={season}
        competitionInfo={competitionInfo}
        domain="selection"
      />
    );
  }

  return (
    <div>
      <div style={cardStyle}>
        <OfficialKnockoutBracket bracket={displayBracket} />
      </div>

      <section style={cardStyle}>
        <h3
          style={{
            margin: `0 0 ${tokens.spacing.md}`,
            fontSize: tokens.typography.fontSizeLg,
            fontWeight: tokens.typography.fontWeightSemibold,
            color: tokens.colors.textPrimary,
          }}
        >
          Partidos de eliminatoria
        </h3>
        {fixturesLoading ? (
          <p style={{ margin: 0, color: tokens.colors.textSecondary }}>Cargando partidos...</p>
        ) : knockoutFixtures.length === 0 ? (
          <p style={{ margin: 0, color: tokens.colors.textSecondary }}>
            No hay partidos de eliminatoria disponibles en este momento.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
            {knockoutFixtures.map((partido) => (
              <PartidoCard
                key={partido.fixture?.id || `${partido.teams?.home?.id}-${partido.teams?.away?.id}`}
                partido={partido}
                domain={domain}
                onClick={() => handlePartidoClick(partido)}
              />
            ))}
          </div>
        )}
      </section>

      {partidoSeleccionado && (
        <MatchCenter
          partido={partidoSeleccionado}
          domain={domain}
          onClose={() => setPartidoSeleccionado(null)}
        />
      )}
    </div>
  );
}
