import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { buildOfficialKnockoutBracket } from '../utils/buildOfficialSelectionBracket';
import { isSelectionCompetition } from '../utils/cupCompetitionDomain';
import { getVisibleGroupTypes } from '../utils/cupTournamentRules';
import {
  getLinkedCompetitionIdsForKnockout,
  hasOfficialKnockoutFormat,
} from '../config/officialKnockoutFormats';
import { LIBERTADORES_ID } from '../config/clubKnockoutFormats';

/**
 * Carga datos de /api/competition/:id/cup y arma el bracket oficial si aplica.
 */
export function useCupCompetitionData(
  competitionId,
  season,
  competitionInfo,
  enabled = true,
  domain = 'club'
) {
  const [groups, setGroups] = useState([]);
  const [linkedGroups, setLinkedGroups] = useState({});
  const [backendBracket, setBackendBracket] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const resolvedDomain = isSelectionCompetition(competitionId, domain) ? 'selection' : 'club';

  useEffect(() => {
    if (!enabled || !competitionId || !season) {
      setGroups([]);
      setLinkedGroups({});
      setBackendBracket(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCupData(targetId, domainHint) {
      const response = await axios.get(
        `/api/competition/${targetId}/cup?season=${season}&domain=${domainHint}`
      );
      if (response.data?.success) {
        return Array.isArray(response.data.data?.groups) ? response.data.data.groups : [];
      }
      return [];
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `/api/competition/${competitionId}/cup?season=${season}&domain=${resolvedDomain}`
        );
        if (cancelled) return;

        if (response.data?.success) {
          const data = response.data.data || {};
          setGroups(Array.isArray(data.groups) ? data.groups : []);
          setBackendBracket(data.bracket || null);
        } else {
          setGroups([]);
          setBackendBracket(null);
          setError(response.data?.message || 'Error al cargar la competición');
        }

        const linkedIds = getLinkedCompetitionIdsForKnockout(competitionId);
        if (linkedIds.length > 0) {
          const linkedEntries = await Promise.all(
            linkedIds.map(async (linkedId) => {
              const linkedDomain = linkedId === LIBERTADORES_ID ? 'club' : resolvedDomain;
              const linkedGroupsData = await loadCupData(linkedId, linkedDomain).catch(() => []);
              return [linkedId, linkedGroupsData];
            })
          );
          if (!cancelled) {
            setLinkedGroups(Object.fromEntries(linkedEntries));
          }
        } else {
          setLinkedGroups({});
        }
      } catch (err) {
        console.error('Error cargando datos de copa:', err);
        if (!cancelled) {
          setError('Error al cargar los datos de la competición');
          setGroups([]);
          setLinkedGroups({});
          setBackendBracket(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [competitionId, season, enabled, resolvedDomain]);

  const groupsByCompetition = useMemo(() => {
    return {
      [Number(competitionId)]: groups,
      ...linkedGroups,
    };
  }, [competitionId, groups, linkedGroups]);

  const officialBracket = useMemo(() => {
    if (!hasOfficialKnockoutFormat(competitionId)) {
      return null;
    }

    return buildOfficialKnockoutBracket({
      competitionId,
      groups,
      groupsByCompetition,
      competitionInfo,
    });
  }, [competitionId, groups, groupsByCompetition, competitionInfo]);

  const prefersBackendBracket =
    resolvedDomain === 'selection' && [5, 536].includes(Number(competitionId));
  const prefersOfficialBracket =
    officialBracket &&
    (resolvedDomain === 'selection'
      ? Number(competitionId) === 1
      : [11, 13].includes(Number(competitionId)));

  const bracket = prefersOfficialBracket
    ? officialBracket
    : prefersBackendBracket
      ? backendBracket || officialBracket
      : backendBracket || officialBracket;

  const visibleGroupTypes = useMemo(
    () => getVisibleGroupTypes(competitionId, resolvedDomain),
    [competitionId, resolvedDomain]
  );

  const selectableGroups = useMemo(
    () => groups.filter((group) => visibleGroupTypes.includes(group?.groupType || 'group')),
    [groups, visibleGroupTypes]
  );

  const hasGroups = useMemo(
    () =>
      selectableGroups.some(
        (group) =>
          (Array.isArray(group?.standings) && group.standings.length > 0) ||
          (Array.isArray(group?.teams) && group.teams.length > 0)
      ),
    [selectableGroups]
  );

  const hasBracket = useMemo(() => {
    if (!bracket?.roundsOrder) return false;
    return bracket.roundsOrder.some((roundKey) => {
      const matches = bracket[roundKey];
      return Array.isArray(matches) && matches.length > 0;
    });
  }, [bracket]);

  const hasOfficialKnockoutStructure = useMemo(
    () => Boolean(officialBracket?.roundsOrder?.length),
    [officialBracket]
  );

  return {
    groups,
    selectableGroups,
    groupsByCompetition,
    bracket,
    loading,
    error,
    hasGroups,
    hasBracket,
    hasOfficialKnockoutStructure,
    domain: resolvedDomain,
    reload: () => {},
  };
}
