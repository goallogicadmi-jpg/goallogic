import { useEffect, useMemo, useState } from 'react';
import { getCompetitionLogoSources } from '../../config/competitionCatalog';

/**
 * Escudo de competición con reintentos: CDN API → asset local.
 * Evita ocultar el logo cuando el primer src falla por referrer/CORS/adblock.
 */
const DEFAULT_IMG_STYLE = {
  display: 'block',
  objectFit: 'contain',
};

export default function CompetitionLogo({
  competitionId,
  logoUrl,
  alt = '',
  className,
  style,
  width,
  height,
  loading = 'eager',
  onAllSourcesFailed,
}) {
  const sources = useMemo(
    () => getCompetitionLogoSources(competitionId, logoUrl),
    [competitionId, logoUrl]
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setExhausted(false);
  }, [sources]);

  const currentSrc = sources[sourceIndex] ?? null;

  if (!currentSrc) {
    return null;
  }

  if (exhausted) {
    return (
      <span
        className={className}
        role="img"
        aria-label={alt || 'Logo no disponible'}
        style={{
          ...DEFAULT_IMG_STYLE,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: width ?? 64,
          height: height ?? 64,
          borderRadius: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          color: '#b0b0b0',
          fontSize: '1.25rem',
          fontWeight: 600,
          ...style,
        }}
      >
        ?
      </span>
    );
  }

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((index) => index + 1);
      return;
    }
    setExhausted(true);
    onAllSourcesFailed?.();
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      style={{ ...DEFAULT_IMG_STYLE, ...style }}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
