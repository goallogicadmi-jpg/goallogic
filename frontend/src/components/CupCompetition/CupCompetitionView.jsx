import React, { useState, useEffect, useMemo } from 'react';
import { tokens } from '../../styles/tokens';
import GroupSelector, { ALL_GROUPS_VALUE } from './GroupSelector';
import GroupStandings from './GroupStandings';
import OfficialKnockoutBracket from './OfficialKnockoutBracket';
import axios from 'axios';
import { buildOfficialSelectionBracket } from '../../utils/buildOfficialSelectionBracket';
import { isSelectionCompetition } from '../../utils/cupCompetitionDomain';
import { getVisibleGroupTypes } from '../../utils/cupTournamentRules';

function resolveGroupKey(group, index = 0) {
  if (typeof group === 'string') {
    return `legacy-${index}-${group}`;
  }

  return group.groupKey || `${String.fromCharCode(65 + index)}`;
}

function resolveGroupLabel(group, index = 0) {
  return typeof group === 'string'
    ? group
    : (group.groupLabel || group.groupName || group.name || group.group || `Grupo ${String.fromCharCode(65 + index)}`);
}

/**
 * Componente principal para mostrar competiciones tipo copa con grupos
 * @param {number} competitionId - ID de la competición
 * @param {string} season - Temporada
 * @param {Object} competitionInfo - Información de la competición
 */
export default function CupCompetitionView({
  competitionId,
  season,
  competitionInfo,
  onTeamSelect,
  domain = 'club',
}) {
  const resolvedDomain = isSelectionCompetition(competitionId, domain) ? 'selection' : 'club';
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(ALL_GROUPS_VALUE);
  const [groupData, setGroupData] = useState(null);
  const [backendBracket, setBackendBracket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('groups'); // 'groups' | 'round_of_16' | 'quarter_finals' | 'semi_finals' | 'final'

  useEffect(() => {
    loadCompetitionData();
  }, [competitionId, season, resolvedDomain]);

  useEffect(() => {
    // Cargar datos de todos los grupos cuando se reciben del backend
    if (groups.length > 0) {
      console.log('🔄 [CupCompetitionView] Cargando datos de todos los grupos...');
      
      // Si los grupos ya vienen con datos completos del backend, no necesitamos cargarlos individualmente
      const groupsWithData = groups.filter(g => 
        typeof g === 'object' && g.standings && Array.isArray(g.standings) && g.standings.length > 0
      );
      
      if (groupsWithData.length === groups.length) {
        console.log('✅ [CupCompetitionView] Todos los grupos ya tienen datos completos del backend');
        // Los grupos ya tienen datos, no necesitamos cargar individualmente
        return;
      }
      
      // Si no, cargar datos del grupo seleccionado
      if (selectedGroup && selectedGroup !== ALL_GROUPS_VALUE) {
        setGroupData(null);
        loadGroupData(selectedGroup);
      }
    }
  }, [selectedGroup, groups]);

  const officialBracket = useMemo(() => {
    if (resolvedDomain !== 'selection') {
      return null;
    }
    return buildOfficialSelectionBracket({ competitionId, groups, competitionInfo });
  }, [competitionId, groups, competitionInfo, resolvedDomain]);
  const prefersBackendBracket =
    resolvedDomain === 'selection' && [5, 536].includes(Number(competitionId));
  const resolvedBracket = prefersBackendBracket
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

  const loadCompetitionData = async () => {
    setLoading(true);
    setError(null);
    setGroupData(null);
    setBackendBracket(null);
    setSelectedGroup(ALL_GROUPS_VALUE);
    
    try {
      // Obtener datos de la competición tipo copa
      const response = await axios.get(
        `/api/competition/${competitionId}/cup?season=${season}&domain=${resolvedDomain}`
      );
      
      if (response.data.success) {
        const data = response.data.data;
        
        console.log('📊 [CupCompetitionView] Datos recibidos del backend:', {
          hasGroups: data.hasGroups,
          phase: data.phase,
          groupsCount: data.groups ? data.groups.length : 0,
          groups: data.groups
        });
        
        // Detectar fase actual
        if (data.phase) {
          setPhase(data.phase);
        }

        setBackendBracket(data.bracket || null);
        
        if (data.groups && Array.isArray(data.groups) && data.groups.length > 0) {
          console.log('✅ [CupCompetitionView] GRUPOS RECIBIDOS DEL BACKEND:', data.groups.length);
          console.log('✅ [CupCompetitionView] ESTRUCTURA COMPLETA:', JSON.stringify(data.groups.map((g, i) => ({
            index: i,
            type: typeof g,
            groupName: typeof g === 'string' ? g : (g.groupName || g.name || g.group || 'N/A'),
            hasStandings: typeof g === 'object' && g.standings ? true : false,
            teamsCount: typeof g === 'object' && g.teams ? g.teams.length : 'N/A'
          })), null, 2));

          // Guardar la fase de grupos aun cuando el backend ya marque la competición como knockout,
          // para poder renderizar tambien el cuadro oficial del torneo.
          setGroups(data.groups);
        } else {
          console.warn('⚠️ [CupCompetitionView] Condiciones no cumplidas:', {
            phase: data.phase,
            hasGroupsArray: !!data.groups,
            isArray: Array.isArray(data.groups),
            length: data.groups ? data.groups.length : 0,
            hasGroups: data.hasGroups
          });
          
          if (data.hasGroups && (!data.groups || data.groups.length === 0)) {
            console.warn('⚠️ [CupCompetitionView] La competición tiene grupos pero no se encontraron datos');
            setError('La competición tiene grupos pero no se pudieron cargar');
          }
        }
      } else {
        setError(response.data.message || 'Error al cargar datos de la competición');
      }
    } catch (err) {
      console.error('Error cargando competición tipo copa:', err);
      setError('Error al cargar los datos de la competición');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupData = async (groupName) => {
    try {
      const response = await axios.get(
        `/api/competition/${competitionId}/group/${groupName}?season=${season}&domain=${resolvedDomain}`
      );
      
      if (response.data.success) {
        setGroupData({
          ...response.data.data,
          groupKey: response.data.data?.groupKey || groupName,
          groupLabel: response.data.data?.groupLabel || response.data.data?.groupName || groupName,
          groupName: response.data.data?.groupLabel || response.data.data?.groupName || groupName,
        });
      }
    } catch (err) {
      console.error('Error cargando datos del grupo:', err);
      setError('Error al cargar los datos del grupo');
    }
  };

  const containerStyle = {
    width: '100%',
    padding: tokens.spacing.lg,
  };

  const errorStyle = {
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.accentDanger}`,
    color: tokens.colors.accentDanger,
    textAlign: 'center',
  };

  const loadingStyle = {
    padding: tokens.spacing.xl,
    textAlign: 'center',
    color: tokens.colors.textSecondary,
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>Cargando competición...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>{error}</div>
      </div>
    );
  }

  // Renderizar según la fase (solo grupos visibles para esta competición)
  if (selectableGroups.length > 0) {
    console.log('✅ [CupCompetitionView] ===== RENDER FINAL =====');
    console.log('✅ [CupCompetitionView] RENDERIZANDO GRUPOS. Total:', groups.length);
    console.log('✅ [CupCompetitionView] GRUPOS EN ESTADO:', groups.map((g, i) => ({
      index: i,
      type: typeof g,
      groupName: typeof g === 'string' ? g : (g.groupName || g.name || g.group || 'N/A'),
      hasStandings: typeof g === 'object' && g.standings ? true : false,
      standingsLength: typeof g === 'object' && g.standings ? (Array.isArray(g.standings) ? g.standings.length : 'N/A') : 'N/A',
      hasTeams: typeof g === 'object' && g.teams ? true : false,
      teamsLength: typeof g === 'object' && g.teams ? (Array.isArray(g.teams) ? g.teams.length : 'N/A') : 'N/A'
    })));
    
    // Contar cuántos grupos tienen datos válidos
    const gruposConDatos = groups.filter((group, index) => {
      const groupKey = resolveGroupKey(group, index);

      return (
        (typeof group === 'object' && group.standings && Array.isArray(group.standings) && group.standings.length > 0) ||
        (selectedGroup === groupKey && groupData?.groupKey === groupKey)
      );
    });

    const gruposVisibles = selectableGroups
      .map((group, index) => ({ group, originalIndex: index }))
      .filter(({ group, originalIndex }) => {
        const groupKey = resolveGroupKey(group, originalIndex);
        return selectedGroup === ALL_GROUPS_VALUE || groupKey === selectedGroup;
      });
    
    console.log(`✅ [CupCompetitionView] Grupos con datos válidos: ${gruposConDatos.length} de ${groups.length}`);
    
    // Log final antes del render
    console.log('✅ [CupCompetitionView] ===== RENDER FINAL - TOTAL GRUPOS:', groups.length, '=====');
    console.log('✅ [CupCompetitionView] Grupos que se renderizarán:', gruposVisibles.length);
    
    return (
      <div style={{
        ...containerStyle,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        overflow: 'visible',
        minHeight: 'auto'
      }}>
        {/* Selector de Grupos */}
        <GroupSelector
          groups={selectableGroups}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
        />

        {/* Renderizar todos los grupos o solo el grupo seleccionado */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: tokens.spacing.xl,
          width: '100%'
        }}>
          {gruposVisibles.map(({ group, originalIndex }, index) => {
            const groupKey = resolveGroupKey(group, originalIndex);
            const groupLabel = resolveGroupLabel(group, originalIndex);
            
            console.log(`📊 [CupCompetitionView] ===== PROCESANDO GRUPO ${index + 1}/${gruposVisibles.length}: "${groupLabel}" =====`);
            console.log(`📊 [CupCompetitionView] Tipo de grupo:`, typeof group);
            console.log(`📊 [CupCompetitionView] Estructura del grupo:`, {
              isObject: typeof group === 'object',
              hasGroupName: typeof group === 'object' && !!group.groupName,
              hasStandings: typeof group === 'object' && !!group.standings,
              standingsType: typeof group === 'object' && group.standings ? (Array.isArray(group.standings) ? 'array' : typeof group.standings) : 'N/A',
              standingsLength: typeof group === 'object' && group.standings && Array.isArray(group.standings) ? group.standings.length : 'N/A',
              hasTeams: typeof group === 'object' && !!group.teams,
              teamsLength: typeof group === 'object' && group.teams && Array.isArray(group.teams) ? group.teams.length : 'N/A'
            });
            
            const resolvedGroup =
              typeof group === 'object' && group.standings && Array.isArray(group.standings) && group.standings.length > 0
                ? group
                : (selectedGroup === groupKey && groupData?.groupKey === groupKey ? groupData : null);

            if (!resolvedGroup || !resolvedGroup.standings || !Array.isArray(resolvedGroup.standings) || resolvedGroup.standings.length === 0) {
              console.warn(`⚠️ [CupCompetitionView] Grupo "${groupLabel}" no tiene standings válidos - omitiendo`);
              return null;
            }
            
            console.log(`✅ [CupCompetitionView] RENDERIZANDO grupo "${groupLabel}" con ${resolvedGroup.standings.length} equipos`);
            
            return (
              <div 
                key={`group-${groupKey}-${index}`}
                data-group-name={groupLabel}
                data-group-index={index}
                className={`cup-group-container group-${index}`}
                style={{ 
                  marginBottom: tokens.spacing.xl,
                  width: '100%',
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1,
                  position: 'relative',
                  zIndex: 1,
                  minHeight: '200px'
                }}
              >
                <GroupStandings
                  groupData={resolvedGroup}
                  groupName={groupLabel}
                  competitionId={competitionId}
                  onTeamSelect={onTeamSelect}
                  domain={resolvedDomain}
                />
              </div>
            );
          })}
        </div>

        <OfficialKnockoutBracket bracket={resolvedBracket} />
      </div>
    );
  }

  if (resolvedBracket) {
    return (
      <div style={containerStyle}>
        <OfficialKnockoutBracket bracket={resolvedBracket} />
      </div>
    );
  }

  return null;
}
