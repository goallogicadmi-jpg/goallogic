import { useCallback, useEffect, useState } from 'react';
import { isSamePlayerId } from '../utils/playerCompare';

/**
 * Estado de comparación A vs B en alineaciones del mismo partido.
 *
 * @param {number|string|null} fixtureId
 */
export function usePlayerCompare(fixtureId) {
  const [playerA, setPlayerA] = useState(null);
  const [playerB, setPlayerB] = useState(null);
  const [isSelectingSecondPlayer, setIsSelectingSecondPlayer] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const resetCompare = useCallback(() => {
    setPlayerA(null);
    setPlayerB(null);
    setIsSelectingSecondPlayer(false);
    setShowCompareModal(false);
  }, []);

  useEffect(() => {
    resetCompare();
  }, [fixtureId, resetCompare]);

  const startCompare = useCallback((player) => {
    if (!player?.id) return;
    setPlayerA(player);
    setPlayerB(null);
    setIsSelectingSecondPlayer(true);
    setShowCompareModal(false);
  }, []);

  const selectPlayerB = useCallback(
    (player) => {
      if (!player?.id) return false;
      if (isSamePlayerId(player.id, playerA?.id)) return false;

      setPlayerB(player);
      setIsSelectingSecondPlayer(false);
      setShowCompareModal(true);
      return true;
    },
    [playerA]
  );

  const changePlayerB = useCallback(() => {
    setPlayerB(null);
    setIsSelectingSecondPlayer(true);
    setShowCompareModal(false);
  }, []);

  const cancelSelection = useCallback(() => {
    setIsSelectingSecondPlayer(false);
    if (!playerB) {
      setPlayerA(null);
    } else {
      setShowCompareModal(true);
    }
  }, [playerB]);

  return {
    playerA,
    playerB,
    isSelectingSecondPlayer,
    showCompareModal,
    startCompare,
    selectPlayerB,
    changePlayerB,
    resetCompare,
    cancelSelection,
  };
}

export default usePlayerCompare;
