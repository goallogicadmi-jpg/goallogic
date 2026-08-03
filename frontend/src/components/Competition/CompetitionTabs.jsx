import { useEffect, useMemo } from 'react';
import { useCupCompetitionData } from '../../hooks/useCupCompetitionData';
import CompetitionFixturesSection from './CompetitionFixturesSection';
import CompetitionSummary from './CompetitionSummary';
import SelectionGroupsSection from './SelectionGroupsSection';
import SelectionKnockoutSection from './SelectionKnockoutSection';
import SelectionSummary from './SelectionSummary';
import CompetitionTopScorersSection from './CompetitionTopScorersSection';
import SelectionRankingSection from './SelectionRankingSection';
import CompetitionHistorySection from './CompetitionHistorySection';
import CompetitionInfoSection from './CompetitionInfoSection';
import CompetitionTablaPanel from './CompetitionTablaPanel';
import CompetitionStatsSection from './CompetitionStatsSection';
import LeagueKnockoutSection from './LeagueKnockoutSection';
import useCompetitionPremiumNav from '../../hooks/useCompetitionPremiumNav';

import { COMPETITION_TAB_IDS } from './competitionTabIds';
import { hasCompetitionHistory } from '../../utils/competitionHistory';
import { shouldShowLeagueKnockoutTab } from '../../utils/ligaBetPlayFormat';
import { isFifaSelectionRankingCompetition } from '../../utils/competitionRanking';
import { competitionExpectsGroupPhase } from '../../utils/selectionCompetition';
import { hasOfficialKnockoutFormat } from '../../config/officialKnockoutFormats';
import PremiumTabs from '../ui/PremiumTabs';

export { COMPETITION_TAB_IDS };

/**
 * Navegación por pestañas de la competición.
 * Clubes: Resumen, Tabla, Partidos, Goleadores, Historial, Información.
 * Selecciones (copa): Resumen, Grupos, Eliminatoria, Partidos, Goleadores, Ranking, Historial, Información.
 */
export default function CompetitionTabs({
  activeTab,
  onTabChange,
  tablaContent,
  leagueId,
  season,
  domain = 'club',
  competitionInfo,
  isSelectionLayout = false,
  onTeamNavigate,
  onGoToAllMatches,
  onNavigateToTab,
}) {
  const { openTab } = useCompetitionPremiumNav(onTabChange);
  const partidoCardDomain = domain === 'selection' ? 'selection' : 'club';

  const cupDomain = isSelectionLayout ? 'selection' : 'club';

  const cupData = useCupCompetitionData(
    leagueId,
    season,
    competitionInfo,
    isSelectionLayout,
    cupDomain
  );

  const showHistoryTab = useMemo(
    () => hasCompetitionHistory(leagueId, cupDomain),
    [leagueId, cupDomain]
  );

  const showLeagueKnockoutTab = useMemo(
    () =>
      shouldShowLeagueKnockoutTab(
        leagueId,
        season,
        competitionInfo?.features?.hasKnockout === true
      ),
    [leagueId, season, competitionInfo?.features?.hasKnockout]
  );

  const showFifaRankingTab = useMemo(
    () =>
      isSelectionLayout &&
      isFifaSelectionRankingCompetition(leagueId, domain, competitionInfo),
    [isSelectionLayout, leagueId, domain, competitionInfo]
  );

  const showClubCupKnockoutTab = useMemo(
    () =>
      !isSelectionLayout &&
      (cupData.hasOfficialKnockoutStructure ||
        (hasOfficialKnockoutFormat(leagueId) &&
          (cupData.hasGroups || competitionExpectsGroupPhase(competitionInfo)))),
    [
      isSelectionLayout,
      cupData.hasOfficialKnockoutStructure,
      cupData.hasGroups,
      leagueId,
      competitionInfo,
    ]
  );

  const showClubKnockoutTab = showLeagueKnockoutTab || showClubCupKnockoutTab;

  const clubTabs = useMemo(() => {
    const tabs = [
      { id: COMPETITION_TAB_IDS.RESUMEN, label: 'Resumen' },
      { id: COMPETITION_TAB_IDS.TABLA, label: 'Tabla' },
    ];
    if (showClubKnockoutTab) {
      tabs.push({ id: COMPETITION_TAB_IDS.ELIMINATORIA, label: 'Eliminatoria' });
    }
    tabs.push(
      { id: COMPETITION_TAB_IDS.PARTIDOS, label: 'Partidos' },
      { id: COMPETITION_TAB_IDS.GOLEADORES, label: 'Goleadores' },
      { id: COMPETITION_TAB_IDS.ESTADISTICAS, label: 'Estadísticas' }
    );
    if (showHistoryTab) {
      tabs.push({ id: COMPETITION_TAB_IDS.HISTORIAL, label: 'Historial' });
    }
    tabs.push({ id: COMPETITION_TAB_IDS.INFORMACION, label: 'Información' });
    return tabs;
  }, [showHistoryTab, showClubKnockoutTab]);

  const showGroupsTab = useMemo(
    () => cupData.hasGroups || competitionExpectsGroupPhase(competitionInfo),
    [cupData.hasGroups, competitionInfo]
  );

  const showKnockoutTab = useMemo(
    () =>
      cupData.hasBracket ||
      cupData.hasOfficialKnockoutStructure ||
      (hasOfficialKnockoutFormat(leagueId) && showGroupsTab),
    [cupData.hasBracket, cupData.hasOfficialKnockoutStructure, leagueId, showGroupsTab]
  );

  const selectionTabs = useMemo(() => {
    const tabs = [{ id: COMPETITION_TAB_IDS.RESUMEN, label: 'Resumen' }];
    if (showGroupsTab) {
      tabs.push({ id: COMPETITION_TAB_IDS.GRUPOS, label: 'Posiciones' });
    }
    if (showKnockoutTab) {
      tabs.push({ id: COMPETITION_TAB_IDS.ELIMINATORIA, label: 'Eliminatoria' });
    }
    tabs.push(
      { id: COMPETITION_TAB_IDS.PARTIDOS, label: 'Partidos' },
      { id: COMPETITION_TAB_IDS.GOLEADORES, label: 'Goleadores' },
      { id: COMPETITION_TAB_IDS.ESTADISTICAS, label: 'Estadísticas' }
    );
    if (showFifaRankingTab) {
      tabs.push({ id: COMPETITION_TAB_IDS.RANKING, label: 'Ranking' });
    }
    if (showHistoryTab) {
      tabs.push({ id: COMPETITION_TAB_IDS.HISTORIAL, label: 'Historial' });
    }
    tabs.push({ id: COMPETITION_TAB_IDS.INFORMACION, label: 'Información' });
    return tabs;
  }, [showGroupsTab, showKnockoutTab, showHistoryTab, showFifaRankingTab]);

  const tabs = isSelectionLayout ? selectionTabs : clubTabs;
  const tabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);

  const standingsTabId = useMemo(() => {
    if (isSelectionLayout && showGroupsTab) {
      return COMPETITION_TAB_IDS.GRUPOS;
    }
    return COMPETITION_TAB_IDS.TABLA;
  }, [isSelectionLayout, showGroupsTab]);

  useEffect(() => {
    if (!tabIds.has(activeTab)) {
      onTabChange?.(COMPETITION_TAB_IDS.RESUMEN);
    }
  }, [activeTab, tabIds, onTabChange]);

  const panelStyle = {
    minHeight: '120px',
  };

  return (
    <div>
      <PremiumTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={openTab}
        ariaLabel="Secciones de la competición"
        sticky
        getTabProps={(tab, isActive) => ({
          'aria-controls': `competition-panel-${tab.id}`,
          id: `competition-tab-${tab.id}`,
        })}
      />

      <div style={panelStyle}>
        {activeTab === COMPETITION_TAB_IDS.RESUMEN && (
          <div
            id="competition-panel-resumen"
            role="tabpanel"
            aria-labelledby="competition-tab-resumen"
          >
            {isSelectionLayout ? (
              <SelectionSummary
                leagueId={leagueId}
                season={season}
                competitionInfo={competitionInfo}
                domain={partidoCardDomain}
                onTeamNavigate={onTeamNavigate}
                onGoToAllMatches={onGoToAllMatches}
                onNavigateToTab={openTab}
                standingsTabId={standingsTabId}
              />
            ) : (
              <CompetitionSummary
                leagueId={leagueId}
                season={season}
                domain={partidoCardDomain}
                onTeamNavigate={onTeamNavigate}
                onGoToAllMatches={onGoToAllMatches}
                onNavigateToTab={openTab}
              />
            )}
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.TABLA && !isSelectionLayout && (
          <div id="competition-panel-tabla" role="tabpanel" aria-labelledby="competition-tab-tabla">
            <CompetitionTablaPanel tablaContent={tablaContent} />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.GRUPOS && isSelectionLayout && (
          <div id="competition-panel-grupos" role="tabpanel" aria-labelledby="competition-tab-grupos">
            <SelectionGroupsSection
              competitionId={leagueId}
              season={season}
              competitionInfo={competitionInfo}
              onTeamNavigate={onTeamNavigate}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.ELIMINATORIA && isSelectionLayout && (
          <div
            id="competition-panel-eliminatoria"
            role="tabpanel"
            aria-labelledby="competition-tab-eliminatoria"
          >
            <SelectionKnockoutSection
              competitionId={leagueId}
              season={season}
              competitionInfo={competitionInfo}
              domain={partidoCardDomain}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.ELIMINATORIA && !isSelectionLayout && showLeagueKnockoutTab && (
          <div
            id="competition-panel-eliminatoria"
            role="tabpanel"
            aria-labelledby="competition-tab-eliminatoria"
          >
            <LeagueKnockoutSection
              competitionId={leagueId}
              season={season}
              domain={partidoCardDomain}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.ELIMINATORIA && !isSelectionLayout && showClubCupKnockoutTab && (
          <div
            id="competition-panel-eliminatoria-copa"
            role="tabpanel"
            aria-labelledby="competition-tab-eliminatoria"
          >
            <SelectionKnockoutSection
              competitionId={leagueId}
              season={season}
              competitionInfo={competitionInfo}
              domain={partidoCardDomain}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.PARTIDOS && (
          <div
            id="competition-panel-partidos"
            role="tabpanel"
            aria-labelledby="competition-tab-partidos"
          >
            <CompetitionFixturesSection
              leagueId={leagueId}
              season={season}
              domain={partidoCardDomain}
              onNavigateToTab={openTab}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.GOLEADORES && (
          <div
            id="competition-panel-goleadores"
            role="tabpanel"
            aria-labelledby="competition-tab-goleadores"
          >
            <CompetitionTopScorersSection
              leagueId={leagueId}
              season={season}
              isSelectionLayout={isSelectionLayout}
              competitionInfo={competitionInfo}
              onTeamNavigate={onTeamNavigate}
              onNavigateToTab={openTab}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.ESTADISTICAS && (
          <div
            id="competition-panel-estadisticas"
            role="tabpanel"
            aria-labelledby="competition-tab-estadisticas"
          >
            <CompetitionStatsSection
              leagueId={leagueId}
              season={season}
              onTeamNavigate={onTeamNavigate}
              onNavigateToTab={openTab}
              standingsTabId={standingsTabId}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.RANKING && showFifaRankingTab && (
          <div
            id="competition-panel-ranking"
            role="tabpanel"
            aria-labelledby="competition-tab-ranking"
          >
            <SelectionRankingSection
              leagueId={leagueId}
              season={season}
              domain={domain}
              competitionInfo={competitionInfo}
              onTeamNavigate={onTeamNavigate}
              onNavigateToTab={openTab}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.HISTORIAL && (
          <div
            id="competition-panel-historial"
            role="tabpanel"
            aria-labelledby="competition-tab-historial"
          >
            <CompetitionHistorySection
              leagueId={leagueId}
              domain={cupDomain}
              onTeamNavigate={onTeamNavigate}
            />
          </div>
        )}

        {activeTab === COMPETITION_TAB_IDS.INFORMACION && (
          <div
            id="competition-panel-informacion"
            role="tabpanel"
            aria-labelledby="competition-tab-informacion"
          >
            <CompetitionInfoSection
              leagueId={leagueId}
              competitionName={competitionInfo?.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}
