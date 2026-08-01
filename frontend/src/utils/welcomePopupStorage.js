const STORAGE_PREFIX = 'goal_logic_hasSeenWelcomePopup';

function storageKey(userId) {
  return `${STORAGE_PREFIX}_${String(userId)}`;
}

export function markWelcomePopupSeenLocal(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), 'true');
  } catch {
    // ignore quota / private mode
  }
}

export function hasSeenWelcomePopupLocal(userId) {
  if (!userId) return false;
  try {
    return localStorage.getItem(storageKey(userId)) === 'true';
  } catch {
    return false;
  }
}
