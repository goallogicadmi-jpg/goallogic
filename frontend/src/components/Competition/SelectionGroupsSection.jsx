import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { tokens } from '../../styles/tokens';
import GroupSelector, { ALL_GROUPS_VALUE } from '../CupCompetition/GroupSelector';
import GroupStandings from '../CupCompetition/GroupStandings';
import CupCompetitionView from '../CupCompetition/CupCompetitionView';
import { useCupCompetitionData } from '../../hooks/useCupCompetitionData';
import {
  formatFormLetter,
  getFormBadgeClass,
  getTablaFromTorneoResponse,
} from '../../utils/competitionStandings';
import {
  convertTorneoGruposToCupGroups,
  groupHasStandings,
  mergeTorneoFormaIntoTeams,
  resolveGroupKey,
  resolveGroupLabel,
} from '../../utils/selectionCompetition';
import '../../styles/standings.css';

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
  marginBottom: tokens.spacing.lg,
};

function GroupFormaStrip({ teams }) {
  if (!teams?.length) return null;

  return (
    <div
      style={{
        marginTop: tokens.spacing.md,
        padding: tokens.spacing.md,
        backgroundColor: 'rgba(79, 195, 247, 0.06)',
        borderRadius: tokens.radius.md,
        border: '1px solid rgba(79, 195, 247, 0.12)',
      }}
    >
      <p
        style={{
          margin: `0 0 ${tokens.spacing.sm}`,
          fontSize: tokens.typography.fontSizeSm,
          color: tokens.colors.textSecondary,
          fontWeight: tokens.typography.fontWeightSemibold,
        }}
      >
        Forma reciente
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
        {teams.map((team) => (
          <div
            key={team.equipoId || team.equipo}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: tokens.spacing.md,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: tokens.colors.textPrimary, fontSize: tokens.typography.fontSizeSm }}>
              {team.equipo}
            </span>
            <span className="form-cell">
              {team.forma ? (
                team.forma.split('').map((letra, idx) => (
                  <span key={idx} className={`form-badge ${getFormBadgeClass(letra)}`}>
                    {formatFormLetter(letra)}
                  </span>
                ))
              ) : (
                <span style={{ color: tokens.colors.textMuted, fontSize: tokens.typography.fontSizeXs }}>
                  —
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tab Posiciones: grupos del torneo con forma desde /estadisticas/torneo.
 */
export default function SelectionGroupsSection({
  competitionId,
  season,
  competitionInfo,
  onTeamNavigate,
}) {
  const cupData = useCupCompetitionData(competitionId, season, competitionInfo, true, 'selection');
  const [selectedGroup, setSelectedGroup] = useState(ALL_GROUPS_VALUE);
  const [formaByGroup, setFormaByGroup] = useState({});
  const [torneoCupGroups, setTorneoCupGroups] = useState([]);

  const effectiveGroups = useMemo(() => {
    const cupWithStandings = cupData.selectableGroups.filter(groupHasStandings);
    if (cupWithStandings.length > 0) {
      return cupWithStandings;
    }
    if (torneoCupGroups.length > 0) {
      return torneoCupGroups;
    }
    return cupData.selectableGroups;
  }, [cupData.selectableGroups, torneoCupGroups]);

  const hasDisplayableGroups = useMemo(
    () => effectiveGroups.some(groupHasStandings),
    [effectiveGroups]
  );

  useEffect(() => {
    if (!competitionId || !season) return;

    let cancelled = false;

    axios
      .get(`/estadisticas/torneo?leagueId=${competitionId}&season=${season}`)
      .then((res) => {
        if (cancelled) return;

        const data = res.data;
        if (data?.hasMultipleGroups && Array.isArray(data.grupos) && data.grupos.length > 0) {
          setTorneoCupGroups(convertTorneoGruposToCupGroups(data.grupos));
        } else {
          setTorneoCupGroups([]);
        }
      })
      .catch(() => {
        if (!cancelled) setTorneoCupGroups([]);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId, season]);

  useEffect(() => {
    if (!competitionId || !season || !effectiveGroups.length) {
      setFormaByGroup({});
      return;
    }

    let cancelled = false;

    axios
      .get(`/estadisticas/torneo?leagueId=${competitionId}&season=${season}`)
      .then((res) => {
        if (cancelled) return;

        const torneoTabla = getTablaFromTorneoResponse(res.data);
        const map = {};

        effectiveGroups.forEach((group, index) => {
          const standings = Array.isArray(group?.standings) ? group.standings : [];
          const normalized = standings.map((s) => {
            const team = s?.team || {};
            return {
              equipo: team?.name || s?.name,
              equipoId: team?.id ?? s?.teamId,
              posicion: s?.rank ?? s?.position,
            };
          });
          map[resolveGroupKey(group, index)] = mergeTorneoFormaIntoTeams(normalized, torneoTabla);
        });

        setFormaByGroup(map);
      })
      .catch(() => {
        if (!cancelled) setFormaByGroup({});
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId, season, effectiveGroups]);

  const useEmbeddedCupView =
    !hasDisplayableGroups && !cupData.loading && !cupData.error;

  const gruposVisibles = useMemo(() => {
    return effectiveGroups
      .map((group, originalIndex) => ({ group, originalIndex }))
      .filter(({ group, originalIndex }) => {
        const groupKey = resolveGroupKey(group, originalIndex);
        return selectedGroup === ALL_GROUPS_VALUE || groupKey === selectedGroup;
      });
  }, [effectiveGroups, selectedGroup]);

  if (cupData.loading) {
    return <p style={{ textAlign: 'center', color: tokens.colors.textSecondary }}>Cargando grupos...</p>;
  }

  if (cupData.error && !hasDisplayableGroups) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.accentNegative }}>{cupData.error}</p>
      </div>
    );
  }

  if (useEmbeddedCupView) {
    return (
      <CupCompetitionView
        competitionId={competitionId}
        season={season}
        competitionInfo={competitionInfo}
        onTeamSelect={onTeamNavigate}
        domain="selection"
      />
    );
  }

  if (!hasDisplayableGroups) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.textSecondary }}>
          No hay posiciones de grupos disponibles para esta temporada. Prueba otra edición del torneo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <GroupSelector
        groups={effectiveGroups}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
      />

      {gruposVisibles.map(({ group, originalIndex }) => {
        const groupKey = resolveGroupKey(group, originalIndex);
        const groupLabel = resolveGroupLabel(group, originalIndex);
        const resolvedGroup = groupHasStandings(group) ? group : null;

        if (!resolvedGroup) return null;

        const formaTeams = (formaByGroup[groupKey] || []).slice(0, 4);

        return (
          <div key={groupKey} style={cardStyle}>
            <GroupStandings
              groupData={resolvedGroup}
              groupName={groupLabel}
              competitionId={competitionId}
              onTeamSelect={onTeamNavigate}
              domain="selection"
            />
            <GroupFormaStrip teams={formaTeams} />
          </div>
        );
      })}
    </div>
  );
}
