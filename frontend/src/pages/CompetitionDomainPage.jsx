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

const hubGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))",
  gap: tokens.spacing.lg,
};

const logoButtonStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: tokens.spacing.sm,
  padding: tokens.spacing.md,
  borderRadius: "12px",
  border: "1px solid rgba(79, 195, 247, 0.15)",
  backgroundColor: "#1a1a1a",
  cursor: "pointer",
  transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
  minHeight: "120px",
  width: "100%",
  color: tokens.colors.textSecondary,
  font: "inherit",
};

const logoImageStyle = {
  width: 64,
  height: 64,
  objectFit: "contain",
};

const logoNameStyle = {
  margin: 0,
  fontSize: tokens.typography.fontSizeXs,
  fontWeight: tokens.typography.fontWeightMedium,
  color: tokens.colors.textSecondary,
  textAlign: "center",
  lineHeight: 1.3,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
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
      style={{
        ...logoButtonStyle,
        borderColor: hovered ? "rgba(79, 195, 247, 0.45)" : logoButtonStyle.borderColor,
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
      {shortName ? <span style={logoNameStyle}>{shortName}</span> : null}
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
    <div
      style={{
        width: "100%",
        minHeight: "calc(100vh - var(--layout-header-height, 72px))",
        padding: "32px 24px 40px",
        backgroundColor: "#0f1419",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ marginBottom: tokens.spacing.xl }}>
          <GoalLogicSectionHeader size="lg" />
        </div>

        {loading && (
          <div style={{ color: tokens.colors.textSecondary }}>Cargando competiciones...</div>
        )}

        {error && <div style={{ color: tokens.colors.accentNegative }}>{error}</div>}

        {!loading &&
          !error &&
          groupedCompetitions.map(([groupLabel, groupItems]) => (
            <section key={groupLabel} style={{ marginBottom: tokens.spacing.xxl }}>
              <h2
                style={{
                  color: tokens.colors.textPrimary,
                  marginBottom: tokens.spacing.lg,
                  fontSize: tokens.typography.fontSizeXl,
                }}
              >
                {groupLabel}
              </h2>
              <div style={hubGridStyle}>
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
