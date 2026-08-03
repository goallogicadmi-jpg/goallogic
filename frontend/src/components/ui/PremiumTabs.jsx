import { useCallback, useEffect, useRef, useState } from 'react';
import '../../styles/gl-tabs.css';

/**
 * Barra de tabs premium GoalLogic — solo navegación interna horizontal
 * (Match Center, secciones de competición, sub-módulos similares).
 */
export default function PremiumTabs({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = 'Secciones',
  className = '',
  wrapClassName = '',
  tabClassName = '',
  enableScrollFade = true,
  scrollToActive = true,
  sticky = false,
  renderTab,
  getTabProps,
}) {
  const tabsRef = useRef(null);
  const [fadeState, setFadeState] = useState({ left: false, right: false });

  const updateFadeState = useCallback(() => {
    if (!enableScrollFade) return;

    const container = tabsRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;
    const threshold = 2;

    if (maxScroll <= threshold) {
      setFadeState((prev) =>
        prev.left || prev.right ? { left: false, right: false } : prev
      );
      return;
    }

    const next = {
      left: scrollLeft > threshold,
      right: scrollLeft < maxScroll - threshold,
    };

    setFadeState((prev) =>
      prev.left === next.left && prev.right === next.right ? prev : next
    );
  }, [enableScrollFade]);

  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return undefined;

    updateFadeState();

    const handleScroll = () => updateFadeState();
    container.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateFadeState())
      : null;

    resizeObserver?.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [tabs, updateFadeState]);

  useEffect(() => {
    if (!scrollToActive) return;

    const container = tabsRef.current;
    if (!container) return;

    const activeEl = container.querySelector('.gl-tab.is-active, .gl-tab.activa');
    if (!activeEl) return;

    const tabStart = activeEl.offsetLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const tabCenter = tabStart + activeEl.offsetWidth / 2;
    const scrollTarget = tabCenter - container.clientWidth / 2;

    container.scrollTo({
      left: Math.max(0, Math.min(maxScroll, scrollTarget)),
      behavior: 'smooth',
    });

    requestAnimationFrame(updateFadeState);
  }, [activeTab, scrollToActive, updateFadeState, tabs]);

  const wrapClasses = [
    'gl-tabs-wrap',
    enableScrollFade && fadeState.left ? 'gl-tabs-wrap--fade-left' : '',
    enableScrollFade && fadeState.right ? 'gl-tabs-wrap--fade-right' : '',
    sticky ? 'gl-tabs-wrap--sticky' : '',
    wrapClassName,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapClasses}>
      <nav
        className={['gl-tabs', className].filter(Boolean).join(' ')}
        role="tablist"
        aria-label={ariaLabel}
        ref={tabsRef}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const extraProps = getTabProps?.(tab, isActive) ?? {};

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={[
                'gl-tab',
                isActive ? 'is-active' : '',
                tabClassName,
                tab.className,
              ].filter(Boolean).join(' ')}
              onClick={() => onTabChange(tab.id)}
              {...extraProps}
            >
              {renderTab ? renderTab(tab, isActive) : tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
