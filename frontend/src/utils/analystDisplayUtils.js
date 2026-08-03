export function parseProbabilityPercent(value) {
  if (value == null || value === '') return null;
  const match = String(value).match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const n = parseFloat(match[1].replace(',', '.'));
  if (Number.isNaN(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export function impliedProbabilityFromOdds(cuota) {
  const odds = parseFloat(cuota);
  if (!odds || Number.isNaN(odds) || odds <= 1) return null;
  return Math.min(99, Math.max(1, Math.round((100 / odds) * 10) / 10));
}

export function formatStatRoi(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '0%';
  const prefix = n > 0 ? '+' : '';
  return `${prefix}${n}%`;
}

export function getResultStatus(resultado) {
  switch (resultado) {
    case 'ganada':
      return { label: 'Acertada', tone: 'won' };
    case 'perdida':
      return { label: 'Fallada', tone: 'lost' };
    case 'nula':
      return { label: 'Nula', tone: 'neutral' };
    default:
      return { label: 'Pendiente', tone: 'pending' };
  }
}

export function getPredictionStatus(post) {
  const startRaw = post.matchInfo?.startTime;
  if (!startRaw) {
    return { label: 'Publicada', tone: 'neutral' };
  }
  const start = new Date(startRaw).getTime();
  if (Number.isNaN(start)) {
    return { label: 'Publicada', tone: 'neutral' };
  }
  if (start > Date.now()) {
    return { label: 'Pendiente', tone: 'pending' };
  }
  return { label: 'En curso / finalizado', tone: 'settled' };
}

const COUNTRY_FLAG_MAP = {
  argentina: '🇦🇷',
  bolivia: '🇧🇴',
  brasil: '🇧🇷',
  brazil: '🇧🇷',
  chile: '🇨🇱',
  colombia: '🇨🇴',
  'costa rica': '🇨🇷',
  cuba: '🇨🇺',
  ecuador: '🇪🇨',
  'el salvador': '🇸🇻',
  españa: '🇪🇸',
  spain: '🇪🇸',
  'estados unidos': '🇺🇸',
  'united states': '🇺🇸',
  usa: '🇺🇸',
  guatemala: '🇬🇹',
  honduras: '🇭🇳',
  méxico: '🇲🇽',
  mexico: '🇲🇽',
  nicaragua: '🇳🇮',
  panamá: '🇵🇦',
  panama: '🇵🇦',
  paraguay: '🇵🇾',
  perú: '🇵🇪',
  peru: '🇵🇪',
  'puerto rico': '🇵🇷',
  'república dominicana': '🇩🇴',
  uruguay: '🇺🇾',
  venezuela: '🇻🇪',
  alemania: '🇩🇪',
  germany: '🇩🇪',
  francia: '🇫🇷',
  france: '🇫🇷',
  italia: '🇮🇹',
  italy: '🇮🇹',
  portugal: '🇵🇹',
  'reino unido': '🇬🇧',
  'united kingdom': '🇬🇧',
  inglaterra: '🇬🇧',
  england: '🇬🇧',
};

export function getCountryFlagEmoji(countryName) {
  if (!countryName || typeof countryName !== 'string') return null;
  const trimmed = countryName.trim();
  if (!trimmed) return null;

  if (/^[a-z]{2}$/i.test(trimmed)) {
    const code = trimmed.toUpperCase();
    const offset = 127397;
    return String.fromCodePoint(
      ...[...code].map((char) => char.charCodeAt(0) + offset)
    );
  }

  return COUNTRY_FLAG_MAP[trimmed.toLowerCase()] || null;
}
