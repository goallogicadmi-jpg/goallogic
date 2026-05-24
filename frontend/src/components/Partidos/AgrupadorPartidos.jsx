import React, { useEffect, useMemo, useState } from "react";
import PartidoCard from "./PartidoCard";
import { obtenerFavoritos } from "../../utils/favoritos";
import { getCompetitionByIdFromCatalog } from "../../config/competitionCatalog";
import CompetitionLogo from "../Competition/CompetitionLogo";
import "../../styles/partidos.css";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getStatusGroup(shortStatus) {
  const status = String(shortStatus || "").toUpperCase();

  if (["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(status)) {
    return "live";
  }

  if (["FT", "AET", "PEN"].includes(status)) {
    return "finished";
  }

  return "scheduled";
}

function compareByKickoff(left, right) {
  const leftTime = new Date(left.fixture?.date || 0).getTime();
  const rightTime = new Date(right.fixture?.date || 0).getTime();
  return leftTime - rightTime;
}

function resolveFixtureDomain(partido, scope = "club") {
  if (partido?.domain) {
    return partido.domain;
  }

  if (partido?.competitionMeta?.domain) {
    return partido.competitionMeta.domain;
  }

  const competitionMeta = getCompetitionByIdFromCatalog(partido?.league?.id);
  if (competitionMeta?.domain) {
    return competitionMeta.domain;
  }

  return scope === "all" ? null : scope;
}

function resolveFixturePriority(partido) {
  if (typeof partido?.competitionPriority === "number") {
    return partido.competitionPriority;
  }

  if (typeof partido?.competitionMeta?.priority === "number") {
    return partido.competitionMeta.priority;
  }

  return getCompetitionByIdFromCatalog(partido?.league?.id)?.priority || 9999;
}

function compareGroups(left, right, orden) {
  if (left.hasFavorite !== right.hasFavorite) {
    return left.hasFavorite ? -1 : 1;
  }

  if (orden === "pais") {
    const countryCompare = (left.liga?.country || "").localeCompare(right.liga?.country || "");
    if (countryCompare !== 0) {
      return countryCompare;
    }
  }

  if (orden === "hora") {
    return left.firstKickoff - right.firstKickoff;
  }

  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  return (left.liga?.name || "").localeCompare(right.liga?.name || "");
}

/**
 * AgrupadorPartidos - Agrupa partidos por competición usando metadata explícita del catálogo.
 */
export default function AgrupadorPartidos({
  partidos,
  filtros,
  busqueda,
  orden,
  scope = "club",
  onPartidoClick,
  onFavoritoChange,
  onPrediccionesClick,
}) {
  const [favoritosIds, setFavoritosIds] = useState({ equipos: [], ligas: [] });

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      try {
        const favoritos = await obtenerFavoritos();
        if (!cancelled) {
          setFavoritosIds({
            equipos: favoritos?.equipos || [],
            ligas: favoritos?.ligas || [],
          });
        }
      } catch (error) {
        console.error("Error cargando favoritos en agrupador:", error);
        if (!cancelled) {
          setFavoritosIds({ equipos: [], ligas: [] });
        }
      }
    };

    loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [partidos]);

  const partidosProcesados = useMemo(() => {
    const query = normalizeText(busqueda);

    return partidos
      .filter((partido) => {
        const competitionId = String(partido.league?.id || "");
        const fixtureDomain = resolveFixtureDomain(partido, scope);

        if (scope !== "all" && fixtureDomain && fixtureDomain !== scope) {
          return false;
        }

        if (filtros.competitionId && String(filtros.competitionId) !== competitionId) {
          return false;
        }

        if (filtros.country && partido.league?.country !== filtros.country) {
          return false;
        }

        if (filtros.status && getStatusGroup(partido.fixture?.status?.short) !== filtros.status) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchable = [
          partido.teams?.home?.name,
          partido.teams?.away?.name,
          partido.league?.name,
          partido.league?.country,
        ]
          .map(normalizeText)
          .join(" ");

        return searchable.includes(query);
      })
      .sort((left, right) => {
        const leftFavorite = favoritosIds.ligas.includes(String(left.league?.id)) ||
          favoritosIds.equipos.includes(String(left.teams?.home?.id)) ||
          favoritosIds.equipos.includes(String(left.teams?.away?.id));
        const rightFavorite = favoritosIds.ligas.includes(String(right.league?.id)) ||
          favoritosIds.equipos.includes(String(right.teams?.home?.id)) ||
          favoritosIds.equipos.includes(String(right.teams?.away?.id));

        if (leftFavorite !== rightFavorite) {
          return leftFavorite ? -1 : 1;
        }

        if (orden === "pais") {
          const countryCompare = (left.league?.country || "").localeCompare(right.league?.country || "");
          if (countryCompare !== 0) {
            return countryCompare;
          }
        }

        if (orden === "competicion") {
          const leftMeta = getCompetitionByIdFromCatalog(left.league?.id);
          const rightMeta = getCompetitionByIdFromCatalog(right.league?.id);
          const priorityCompare = (leftMeta?.priority || 9999) - (rightMeta?.priority || 9999);
          if (priorityCompare !== 0) {
            return priorityCompare;
          }
          const leagueCompare = (left.league?.name || "").localeCompare(right.league?.name || "");
          if (leagueCompare !== 0) {
            return leagueCompare;
          }
        }

        return compareByKickoff(left, right);
      });
  }, [busqueda, favoritosIds.equipos, favoritosIds.ligas, filtros.competitionId, filtros.country, filtros.status, orden, partidos, scope]);

  const partidosAgrupados = useMemo(() => {
    const groupsMap = new Map();

    partidosProcesados.forEach((partido) => {
      const leagueId = String(partido.league?.id || partido.league?.name || "unknown");

      if (!groupsMap.has(leagueId)) {
        groupsMap.set(leagueId, {
          liga: partido.league,
          partidos: [],
          priority: resolveFixturePriority(partido),
          hasFavorite: false,
          firstKickoff: new Date(partido.fixture?.date || 0).getTime(),
        });
      }

      const currentGroup = groupsMap.get(leagueId);
      currentGroup.partidos.push(partido);
      currentGroup.firstKickoff = Math.min(
        currentGroup.firstKickoff,
        new Date(partido.fixture?.date || 0).getTime()
      );

      const isFavorite = favoritosIds.ligas.includes(String(partido.league?.id)) ||
        favoritosIds.equipos.includes(String(partido.teams?.home?.id)) ||
        favoritosIds.equipos.includes(String(partido.teams?.away?.id));

      if (isFavorite) {
        currentGroup.hasFavorite = true;
      }
    });

    return Array.from(groupsMap.values())
      .map((group) => ({
        ...group,
        partidos: group.partidos.sort(compareByKickoff),
      }))
      .sort((left, right) => compareGroups(left, right, orden));
  }, [favoritosIds.equipos, favoritosIds.ligas, orden, partidosProcesados]);

  if (partidosProcesados.length === 0) {
    return (
      <div className="empty-state">
        <p>No se encontraron partidos con los filtros seleccionados.</p>
      </div>
    );
  }

  return (
    <div className="agrupador-partidos">
      {partidosAgrupados.map((grupo) => (
        <div key={grupo.liga?.id || grupo.liga?.name} className="grupo-liga">
          <div className="grupo-liga-header">
            <CompetitionLogo
              competitionId={grupo.liga?.id}
              logoUrl={grupo.liga?.logo}
              alt={grupo.liga?.name || "Competición"}
              className="grupo-liga-logo"
            />
            <div className="grupo-liga-info">
              <div className="grupo-liga-nombre">{grupo.liga?.name || "Competición"}</div>
              <div className="grupo-liga-pais">{grupo.liga?.country || ""}</div>
            </div>
            <div className="grupo-liga-count">
              {grupo.partidos.length} partido{grupo.partidos.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="grupo-liga-partidos">
            {grupo.partidos.map((partido) => (
              <PartidoCard
                key={partido.fixture?.id || `${grupo.liga?.id}-${partido.teams?.home?.id}-${partido.teams?.away?.id}`}
                partido={partido}
                domain={resolveFixtureDomain(partido, scope) || "club"}
                onClick={() => onPartidoClick(partido)}
                onPrediccionesClick={onPrediccionesClick}
                onFavoritoChange={async () => {
                  if (onFavoritoChange) {
                    onFavoritoChange();
                  }

                  try {
                    const favoritos = await obtenerFavoritos();
                    setFavoritosIds({
                      equipos: favoritos?.equipos || [],
                      ligas: favoritos?.ligas || [],
                    });
                  } catch (error) {
                    console.error("Error refrescando favoritos:", error);
                  }
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
