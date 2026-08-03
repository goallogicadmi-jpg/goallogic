import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccordionBlock from './AccordionBlock';
import TeamLastMatchesList from '../TeamLastMatchesList';
import { getTeamFixtures } from '../../api/api';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import { IconUltimosPartidos } from './PrediccionesIcons';
import AccordionPremiumLoader from './AccordionPremiumLoader';

const MATCH_LIMIT = 5;

const INITIAL_STATE = {
  status: 'idle',
  fixturesA: [],
  fixturesB: [],
  error: null,
};

function resolvePrefetchedFixtures(prefetch, side) {
  const list = side === 'A' ? prefetch?.fixturesA : prefetch?.fixturesB;
  if (prefetch?.ready && Array.isArray(list)) {
    return list.slice(0, MATCH_LIMIT);
  }
  return null;
}

export default function UltimosPartidosPredicciones({
  equipoAId,
  equipoBId,
  nombreEquipoA,
  nombreEquipoB,
  lazyContext,
}) {
  const [fetchState, setFetchState] = useState(INITIAL_STATE);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const nombreA = nombreEquipoA || 'Equipo A';
  const nombreB = nombreEquipoB || 'Equipo B';
  const prefetch = lazyContext?.prefetch;

  const contextKey = `${equipoAId}-${equipoBId}-${prefetch?.ready ? 'ready' : 'pending'}`;

  useEffect(() => {
    loadedRef.current = false;
    loadingRef.current = false;
    setFetchState(INITIAL_STATE);
  }, [contextKey]);

  const applyLoadedFixtures = useCallback((fixturesA, fixturesB) => {
    loadedRef.current = true;
    setFetchState({
      status: 'loaded',
      fixturesA,
      fixturesB,
      error: null,
    });
  }, []);

  const loadFixtures = useCallback(async () => {
    if (!equipoAId || !equipoBId || loadedRef.current || loadingRef.current) {
      return;
    }

    const prefetchedA = resolvePrefetchedFixtures(prefetch, 'A');
    const prefetchedB = resolvePrefetchedFixtures(prefetch, 'B');

    if (prefetchedA && prefetchedB) {
      applyLoadedFixtures(prefetchedA, prefetchedB);
      return;
    }

    if (prefetch && !prefetch.ready) {
      setFetchState((prev) => ({ ...prev, status: 'loading', error: null }));
      return;
    }

    loadingRef.current = true;
    setFetchState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const [resA, resB] = await Promise.all([
        getTeamFixtures(equipoAId, MATCH_LIMIT),
        getTeamFixtures(equipoBId, MATCH_LIMIT),
      ]);

      applyLoadedFixtures(
        (resA?.response || []).slice(0, MATCH_LIMIT),
        (resB?.response || []).slice(0, MATCH_LIMIT)
      );
    } catch (err) {
      setFetchState({
        status: 'error',
        fixturesA: [],
        fixturesB: [],
        error: err?.message || 'No se pudieron cargar los últimos partidos.',
      });
    } finally {
      loadingRef.current = false;
    }
  }, [equipoAId, equipoBId, prefetch, applyLoadedFixtures]);

  useEffect(() => {
    if (fetchState.status !== 'loading' || prefetch?.ready !== true) {
      return;
    }

    const prefetchedA = resolvePrefetchedFixtures(prefetch, 'A');
    const prefetchedB = resolvePrefetchedFixtures(prefetch, 'B');

    if (prefetchedA && prefetchedB) {
      loadingRef.current = false;
      applyLoadedFixtures(prefetchedA, prefetchedB);
    }
  }, [prefetch, fetchState.status, applyLoadedFixtures]);

  const handleOpenChange = useCallback(
    (isOpen) => {
      if (isOpen) {
        loadFixtures();
      }
    },
    [loadFixtures]
  );

  if (!equipoAId || !equipoBId) {
    return null;
  }

  const { status, fixturesA, fixturesB, error } = fetchState;

  return (
    <AccordionBlock
      title={PREDICCIONES_TITLES.ultimosPartidos}
      icon={<IconUltimosPartidos size={18} />}
      onOpenChange={handleOpenChange}
    >
      {status === 'loading' && (
        <AccordionPremiumLoader message="Cargando últimos partidos…" />
      )}

      {status === 'error' && (
        <p className="predicciones-ultimos-partidos-error" role="alert">
          {error}
        </p>
      )}

      {status === 'loaded' && (
        <div className="predicciones-ultimos-partidos-grid">
          <article className="predicciones-ultimos-partidos-team">
            <h4 className="predicciones-ultimos-partidos-team__title">{nombreA}</h4>
            <TeamLastMatchesList
              fixtures={fixturesA}
              teamId={equipoAId}
              teamName={nombreA}
              emptyMessage="Sin partidos recientes."
            />
          </article>

          <article className="predicciones-ultimos-partidos-team">
            <h4 className="predicciones-ultimos-partidos-team__title">{nombreB}</h4>
            <TeamLastMatchesList
              fixtures={fixturesB}
              teamId={equipoBId}
              teamName={nombreB}
              emptyMessage="Sin partidos recientes."
            />
          </article>
        </div>
      )}
    </AccordionBlock>
  );
}
