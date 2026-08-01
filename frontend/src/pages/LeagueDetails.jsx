import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import CupCompetitionView from "../components/CupCompetition/CupCompetitionView";

import StandingsTable from "../components/StandingsTable";

import CompetitionPageLayout from "../components/Competition/CompetitionPageLayout";

import CompetitionTabs, { COMPETITION_TAB_IDS } from "../components/Competition/CompetitionTabs";

import { getCompetitionSeasonsByDomain } from "../api/api";

import {

  getCompetitionByIdFromCatalog,

  getCompetitionRoute,

  getTeamRoute,

  resolveCompetitionLogo,

} from "../config/competitionCatalog";

import {
  assertCompetitionMatchesDomain,
  resolveCompetitionDomain,
} from "../utils/cupCompetitionDomain";

import { getPreferredSeason, getSeasonOptionLabel } from "../utils/seasonLabels";
import axios from "axios";



export default function LeagueDetails({ domain }) {

  const navigate = useNavigate();
  const { leagueId } = useParams();

  const [seasons, setSeasons] = useState([]);

  const [currentSeason, setCurrentSeason] = useState("");

  const [loading, setLoading] = useState(true);

  const [leagueInfo, setLeagueInfo] = useState(null);

  const [competitionMeta, setCompetitionMeta] = useState(null);

  const [activeTab, setActiveTab] = useState(COMPETITION_TAB_IDS.TABLA);

  const fallbackCompetition = useMemo(

    () => getCompetitionByIdFromCatalog(leagueId),

    [leagueId]

  );

  const resolvedDomain = resolveCompetitionDomain(leagueId, domain);

  const domainGuard = useMemo(
    () => assertCompetitionMatchesDomain(leagueId, domain),
    [leagueId, domain]
  );

  useEffect(() => {
    if (!leagueId || !fallbackCompetition) return;

    const canonicalDomain = fallbackCompetition.domain;
    if (!canonicalDomain) return;

    if (!domain || domain !== canonicalDomain) {
      navigate(getCompetitionRoute(canonicalDomain, leagueId), { replace: true });
    }
  }, [domain, fallbackCompetition, leagueId, navigate]);

  useEffect(() => {
    if (!fallbackCompetition || !leagueId) return;

    setLeagueInfo((prev) => {
      const catalogLogo = resolveCompetitionLogo(leagueId, fallbackCompetition.logo);
      if (prev?.id === Number(leagueId) && prev?.logo === catalogLogo) {
        return prev;
      }
      return {
        id: Number(leagueId),
        name: fallbackCompetition.name,
        logo: catalogLogo,
        type: fallbackCompetition.type,
        isCup: fallbackCompetition.type === "Cup",
        domain: resolvedDomain,
        format: fallbackCompetition.format || "league",
        features: fallbackCompetition.features || null,
      };
    });
  }, [fallbackCompetition, leagueId, resolvedDomain]);

  useEffect(() => {

    if (!leagueId) return;



    let cancelled = false;



    async function fetchLeagueData() {

      setLoading(true);



      try {

        const competitionData = await getCompetitionSeasonsByDomain(resolvedDomain, leagueId);

        if (cancelled) return;



        const rawSeasons = competitionData?.seasons || [];

        const sortedSeasons = [...rawSeasons].sort(

          (a, b) => Number(b?.year || 0) - Number(a?.year || 0)

        );

        const current = getPreferredSeason(sortedSeasons);



        setCompetitionMeta(competitionData);

        setSeasons(sortedSeasons);

        if (current?.year) {

          setCurrentSeason(current.year.toString());

        }



        setLeagueInfo({

          id: Number(leagueId),

          name: fallbackCompetition?.name || competitionData?.name || 'Competición',

          logo: resolveCompetitionLogo(
            leagueId,
            competitionData?.logo,
            fallbackCompetition?.logo
          ),

          type: fallbackCompetition?.type || competitionData?.type || "League",

          isCup: (competitionData?.type || fallbackCompetition?.type) === "Cup",

          domain: resolvedDomain,

          format: competitionData?.format || fallbackCompetition?.format || "league",

          features: {
            ...(fallbackCompetition?.features || {}),
            ...(competitionData?.features || {}),
          },

        });

      } catch (err) {

        console.error("Error cargando datos de competición:", err);

        if (cancelled) return;

        const safeFallback = fallbackCompetition;

        let fallbackSeasons = [];
        try {
          const seasonsResponse = await axios.get("/api/league/seasons", {
            params: { leagueId },
          });
          fallbackSeasons = seasonsResponse.data?.seasons || [];
        } catch (seasonsErr) {
          console.warn("No se pudieron cargar temporadas de respaldo:", seasonsErr.message);
        }

        const sortedFallbackSeasons = [...fallbackSeasons].sort(
          (a, b) => Number(b?.year || 0) - Number(a?.year || 0)
        );
        const preferred = getPreferredSeason(sortedFallbackSeasons);

        setCompetitionMeta(safeFallback);
        setSeasons(sortedFallbackSeasons);
        if (preferred?.year) {
          setCurrentSeason(String(preferred.year));
        }

        setLeagueInfo(
          safeFallback
            ? {
                id: Number(leagueId),
                name: safeFallback.name || 'Competición',
                logo: resolveCompetitionLogo(leagueId, safeFallback.logo),
                type: safeFallback.type || "League",
                isCup: safeFallback.type === "Cup",
                domain: resolvedDomain,
                format: safeFallback.format || "league",
                features: safeFallback.features || null,
              }
            : null
        );

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }



    fetchLeagueData();



    return () => {

      cancelled = true;

    };

  }, [fallbackCompetition, leagueId, resolvedDomain]);



  const isChampionsLeague = resolvedDomain === "club" && parseInt(leagueId, 10) === 2;

  const format = competitionMeta?.format || leagueInfo?.format || fallbackCompetition?.format || "league";

  const isCupCompetition = (leagueInfo?.type || fallbackCompetition?.type) === "Cup";

  const useCupView = !isChampionsLeague && (format === "group_and_knockout" || isCupCompetition);

  const seasonMode = competitionMeta?.seasonMode || fallbackCompetition?.seasonMode || "calendar_year";

  const competitionName = leagueInfo?.name || 'Competición';

  const participantType =
    competitionMeta?.participantType || fallbackCompetition?.participantType || "club";

  const isSelectionLayout =
    resolvedDomain === "selection" &&
    participantType !== "club" &&
    (format === "group_and_knockout" || format === "cup" || isCupCompetition || useCupView);

  useEffect(() => {
    if (isSelectionLayout) {
      setActiveTab((prev) =>
        prev === COMPETITION_TAB_IDS.TABLA ? COMPETITION_TAB_IDS.RESUMEN : prev
      );
    }
  }, [isSelectionLayout, leagueId]);

  const handleTeamNavigate = useCallback(
    (teamId) => {
      navigate(getTeamRoute(resolvedDomain, teamId), {
        state: {
          fromCompetitionRoute: window.location.pathname,
          competitionId: parseInt(leagueId, 10),
          season: currentSeason,
        },
      });
    },
    [navigate, resolvedDomain, leagueId, currentSeason]
  );

  const handleGoToAllMatches = useCallback(() => {
    setActiveTab(COMPETITION_TAB_IDS.PARTIDOS);
  }, []);

  const handleNavigateToTab = useCallback((tabId) => {
    if (tabId) setActiveTab(tabId);
  }, []);



  const tablaContent = useMemo(() => {

    if (!domainGuard.ok) {
      return (
        <p style={{ margin: 0, color: "#EF4444", textAlign: "center", padding: "24px" }}>
          {domainGuard.message || "Esta competición no está disponible en esta sección."}
        </p>
      );
    }

    if (loading || !leagueInfo) {

      return null;

    }



    if (useCupView) {

      return (

        <CupCompetitionView

          competitionId={parseInt(leagueId, 10)}

          season={currentSeason}

          competitionInfo={leagueInfo}

          onTeamSelect={handleTeamNavigate}

          domain={resolvedDomain}

        />

      );

    }



    return (

      <StandingsTable

        leagueId={parseInt(leagueId, 10)}

        season={currentSeason}

        leagueInfo={leagueInfo}

        isCup={isCupCompetition && !isChampionsLeague}

        onTeamClick={handleTeamNavigate}

      />

    );

  }, [
    domainGuard.ok,
    domainGuard.message,
    loading,
    leagueInfo,
    useCupView,
    leagueId,
    currentSeason,
    isCupCompetition,
    isChampionsLeague,
    handleTeamNavigate,
    resolvedDomain,
  ]);



  return (

    <CompetitionPageLayout

      loading={false}

      competitionName={competitionName}

      leagueId={leagueId}

      logoUrl={leagueInfo?.logo}

      seasons={seasons}

      currentSeason={currentSeason}

      onSeasonChange={setCurrentSeason}

      seasonMode={seasonMode}

      getSeasonLabel={getSeasonOptionLabel}

      onBack={() => navigate(resolvedDomain === "selection" ? "/selecciones" : "/clubes")}

    >

      <CompetitionTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tablaContent={tablaContent}
        leagueId={parseInt(leagueId, 10)}
        season={currentSeason}
        domain={resolvedDomain}
        competitionInfo={leagueInfo}
        isSelectionLayout={isSelectionLayout}
        onTeamNavigate={handleTeamNavigate}
        onGoToAllMatches={handleGoToAllMatches}
        onNavigateToTab={handleNavigateToTab}
      />

    </CompetitionPageLayout>

  );

}


