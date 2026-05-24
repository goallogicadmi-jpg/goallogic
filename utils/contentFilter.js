const bannedWords = [
  'apuesta', 'apuestas', 'pick', 'picks',
  'seguro', 'ganancia', 'ganancias', 'dinero',
  'cuota', 'stake', 'bank', 'parlay'
];

function containsBannedWords(text = '') {
  const lower = text.toLowerCase();
  return bannedWords.some(w => lower.includes(w));
}

module.exports = { containsBannedWords };
