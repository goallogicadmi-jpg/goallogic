import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccordionBlock from './AccordionBlock';
import TeamLastMatchesList from '../TeamLastMatchesList';
import { getTeamFixtures } from '../../api/api';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import { IconUltimosPartidos } from './PrediccionesIcons';

const MATCH_LIMIT = 5;

const INITIAL_STATE = {
  status: 'idle',
  fixturesA: [],
  fixturesB: [],
  error: null,
};

export default function UltimosPartidosPredicciones({
  equipoAId,
  equipoBId,
  nombreEquipoA,
  nombreEquipoB,
}) {
  const [fetchState, setFetchState] = useState(INITIAL_STATE);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const nombreA = nombreEquipoA || 'Equipo A';
  const nombreB = nombreEquipoB || 'Equipo B';

  useEffect(() => {
    loadedRef.current = false;
    loadingRef.current = false;
    setFetchState(INITIAL_STATE);
  }, [equipoAId, equipoBId]);

  const loadFixtures = useCallback(async () => {
    if (!equipoAId || !equipoBId || loadedRef.current || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setFetchState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const [resA, resB] = await Promise.all([
        getTeamFixtures(equipoAId, MATCH_LIMIT),
        getTeamFixtures(equipoBId, MATCH_LIMIT),
      ]);

      loadedRef.current = true;
      setFetchState({
        status: 'loaded',
        fixturesA: (resA?.response || []).slice(0, MATCH_LIMIT),
        fixturesB: (resB?.response || []).slice(0, MATCH_LIMIT),
        error: null,
      });
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
  }, [equipoAId, equipoBId]);

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
        <p className="predicciones-ultimos-partidos-loading" role="status" aria-live="polite">
          Cargando últimos partidos…
        </p>
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
