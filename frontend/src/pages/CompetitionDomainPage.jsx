import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  applyCatalogDisplay,
  getCompetitionRoute,
  getCompetitionsByDomainFromCatalog,
  resolveCompetitionLogo,
} from "../config/competitionCatalog";
import CompetitionLogo from "../components/Competition/CompetitionLogo";
import { tokens } from "../styles/tokens";
import { GoalLogicSectionHeader } from "../components/GoalLogicTitle";

const logoButtonStyle = {
  gap: tokens.spacing.sm,
  borderRadius: "12px",
  border: "1px solid rgba(79, 195, 247, 0.15)",
  cursor: "pointer",
  transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
  color: tokens.colors.textSecondary,
  font: "inherit",
};

const logoImageStyle = {
  width: 64,
  height: 64,
  objectFit: "contain",
};

function getShortName(competition) {
  if (competition?.shortName) return competition.shortName;
  const name = competition?.name || "";
  if (name.length <= 18) return name;
  return name.replace(/\s+(League|Liga|Cup|Copa|Championship)$/i, "").trim() || name;
}

function CompetitionLogoItem({ competition, onSelect }) {
  const shortName = getShortName(competition);
  const [hovered, setHovered] = useState(false);
  const [showLogo, setShowLogo] = useState(true);

  return (
    <button
      type="button"
      className="home-hub-card"
      style={{
        ...logoButtonStyle,
        borderColor: hovered ? "rgba(79, 195, 247, 0.45)" : "rgba(79, 195, 247, 0.15)",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 4px 16px rgba(79, 195, 247, 0.12)" : "none",
      }}
      onClick={() => onSelect(competition.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={competition.name}
      aria-label={`Ver ${competition.name}`}
    >
      {showLogo ? (
        <CompetitionLogo
          competitionId={competition.id}
          logoUrl={resolveCompetitionLogo(competition.id, competition.logo)}
          alt=""
          width={64}
          height={64}
          style={{
            ...logoImageStyle,
            padding: "4px",
            borderRadius: "8px",
            backgroundColor: "rgba(255, 255, 255, 0.94)",
          }}
          onAllSourcesFailed={() => setShowLogo(false)}
        />
      ) : (
        <span
          style={{
            ...logoImageStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: tokens.typography.fontSizeLg,
            color: tokens.colors.textMuted,
          }}
          aria-hidden
        >
          ?
        </span>
      )}
      {shortName ? <span className="home-hub-card__label">{shortName}</span> : null}
    </button>
  );
}

export default function CompetitionDomainPage({ domain = "club" }) {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const catalogList = getCompetitionsByDomainFromCatalog(domain)
      .map(applyCatalogDisplay)
      .sort((left, right) => (Number(left.priority) || 9999) - (Number(right.priority) || 9999));

    setCompetitions(catalogList);
    setLoading(false);
  }, [domain]);

  const handleSelectCompetition = useCallback(
    (competitionId) => {
      navigate(getCompetitionRoute(domain, competitionId));
    },
    [navigate, domain]
  );

  const groupedCompetitions = useMemo(() => {
    const groups = new Map();

    competitions.forEach((competition) => {
      const normalized = applyCatalogDisplay(competition);
      const bucket = normalized.type === "League" ? "Ligas" : "Copas y Torneos";
      if (!groups.has(bucket)) {
        groups.set(bucket, []);
      }
      groups.get(bucket).push(normalized);
    });

    const sortByPriority = (left, right) =>
      (Number(left?.priority) || 9999) - (Number(right?.priority) || 9999);

    return Array.from(groups.entries()).map(([groupLabel, groupItems]) => [
      groupLabel,
      [...groupItems].sort(sortByPriority),
    ]);
  }, [competitions]);

  return (
    <div className="home-page">
      <div className="home-page__inner">
        <div className="home-page__intro">
          <GoalLogicSectionHeader size="lg" />
        </div>

        {loading && (
          <div style={{ color: tokens.colors.textSecondary }}>Cargando competiciones...</div>
        )}

        {error && <div style={{ color: tokens.colors.accentNegative }}>{error}</div>}

        {!loading &&
          !error &&
          groupedCompetitions.map(([groupLabel, groupItems]) => (
            <section key={groupLabel} className="home-section">
              <h2 className="home-section__title">{groupLabel}</h2>
              <div className="home-hub-grid">
                {groupItems.map((competition) => (
                  <CompetitionLogoItem
                    key={competition.id}
                    competition={competition}
                    onSelect={handleSelectCompetition}
                  />
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
