/**
 * Primera letra del nombre del usuario en mayúscula (avatar por iniciales).
 * @param {string} [name]
 * @returns {string}
 */
export function getUserInitial(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'U';
  return trimmed.charAt(0).toUpperCase();
}
