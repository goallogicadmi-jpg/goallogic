import { useEffect, useState } from 'react';
import axios from 'axios';
import { getCompetitionSeasonsByDomain, getLeagueFixtures } from '../api/api';
import { getTablaFromTorneoResponse, getLeaderFromTabla } from '../utils/competitionStandings';
import { computeTorneoKpis, getHighlightTeams } from '../utils/competitionStats';
import { getCompetitionInfo } from '../utils/competitionInfo';
import { getCompetitionHistoryEditions } from '../utils/competitionHistory';
import { getPreferredSeason } from '../utils/seasonLabels';

/**
 * Datos compartidos para tarjetas del hub (torneo + fixtures + mocks).
 */
export function useCompetitionHubData(competitionId, domain) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [season, setSeason] = useState(null);
  const [tabla, setTabla] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [leader, setLeader] = useState(null);
  const [highlights, setHighlights] = useState(null);
  const [nextMatch, setNextMatch] = useState(null);
  const [editorialInfo, setEditorialInfo] = useState(null);
  const [currentChampion, setCurrentChampion] = useState(null);

  useEffect(() => {
    if (!competitionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const seasonsPayload = await getCompetitionSeasonsByDomain(domain, competitionId).catch(
          () => null
        );
        const preferred = getPreferredSeason(seasonsPayload?.seasons || []);
        const seasonYear =
          preferred?.year?.toString() || String(new Date().getFullYear());

        if (cancelled) return;
        setSeason(seasonYear);

        const [torneoRes, fixturesData] = await Promise.all([
          axios.get(`/estadisticas/torneo?leagueId=${competitionId}&season=${seasonYear}`),
          getLeagueFixtures(competitionId, seasonYear, { next: 8, last: 5 }).catch(() => ({
            proximos: [],
            pasados: [],
          })),
        ]);

        if (cancelled) return;

        const tablaData = getTablaFromTorneoResponse(torneoRes.data);
        const proximos = Array.isArray(fixturesData?.proximos) ? fixturesData.proximos : [];
        const pasados = Array.isArray(fixturesData?.pasados) ? fixturesData.pasados : [];

        const sortedProximos = [...proximos].sort(
          (a, b) => new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0)
        );
        const sortedPasados = [...pasados].sort(
          (a, b) => new Date(b.fixture?.date || 0) - new Date(a.fixture?.date || 0)
        );

        const now = Date.now();
        const upcoming =
          sortedProximos.find((p) => new Date(p.fixture?.date || 0).getTime() >= now) ||
          sortedProximos[0] ||
          null;
        const latestResult = sortedPasados[0] || null;

        setTabla(tablaData);
        setKpis(computeTorneoKpis(tablaData));
        setLeader(getLeaderFromTabla(tablaData));
        setHighlights(getHighlightTeams(tablaData));
        setNextMatch(upcoming || latestResult);
        setEditorialInfo(getCompetitionInfo(competitionId));
        const history = getCompetitionHistoryEditions(competitionId, domain);
        setCurrentChampion(history[0] || null);
      } catch (err) {
        console.error('Error cargando datos del hub:', err);
        if (!cancelled) {
          setError('No se pudieron cargar los datos de esta competición.');
          setTabla([]);
          setKpis(null);
          setLeader(null);
          setHighlights(null);
          setNextMatch(null);
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
  }, [competitionId, domain]);

  return {
    loading,
    error,
    season,
    tabla,
    kpis,
    leader,
    highlights,
    nextMatch,
    editorialInfo,
    currentChampion,
  };
}
