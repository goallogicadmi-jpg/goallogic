import { useCallback, useRef } from 'react';

/**
 * Detecta swipe horizontal para cambiar pestañas sin interferir con scroll vertical.
 * @param {{ onSwipeLeft?: () => void, onSwipeRight?: () => void, enabled?: boolean, threshold?: number }} options
 */
export function useSwipeTabs(options = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    enabled = true,
    threshold = 48,
  } = options;

  const touchStartRef = useRef(null);

  const onTouchStart = useCallback((event) => {
    if (!enabled) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, [enabled]);

  const onTouchEnd = useCallback((event) => {
    if (!enabled || !touchStartRef.current) return;

    const touch = event.changedTouches?.[0];
    if (!touch) {
      touchStartRef.current = null;
      return;
    }

    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < threshold) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.35) return;

    if (dx < 0) {
      onSwipeLeft?.();
    } else {
      onSwipeRight?.();
    }
  }, [enabled, onSwipeLeft, onSwipeRight, threshold]);

  const onTouchCancel = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
  };
}

export default useSwipeTabs;
