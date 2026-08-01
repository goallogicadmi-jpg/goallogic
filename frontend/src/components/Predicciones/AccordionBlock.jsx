import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { IconChevronDown } from './PrediccionesIcons';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import useMediaQuery from '../../hooks/useMediaQuery';
import { useAccordionGroup } from './AccordionGroup';

const MOBILE_BREAKPOINT = '(max-width: 480px)';
const ULTRA_COMPACT_BREAKPOINT = '(max-width: 360px)';

function resolveInitialOpen(defaultOpen, defaultOpenDesktop, defaultOpenMobile) {
  if (typeof defaultOpen === 'boolean') {
    return defaultOpen;
  }

  if (typeof window === 'undefined') {
    return defaultOpenDesktop;
  }

  const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
  return isMobile ? defaultOpenMobile : defaultOpenDesktop;
}

/**
 * AccordionBlock - Bloque plegable unificado para el módulo Predicciones.
 */
export default function AccordionBlock({
  title,
  icon = null,
  children,
  defaultOpen,
  defaultOpenDesktop = false,
  defaultOpenMobile = false,
  className = '',
  headingLevel = 3,
  onOpenChange,
}) {
  const blockId = useId();
  const panelId = useId();
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const group = useAccordionGroup();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const isUltraCompact = useMediaQuery(ULTRA_COMPACT_BREAKPOINT);
  const useGroupMode = Boolean(group?.singleOpen && isMobile);

  const [localOpen, setLocalOpen] = useState(() =>
    resolveInitialOpen(defaultOpen, defaultOpenDesktop, defaultOpenMobile)
  );
  const [contentHeight, setContentHeight] = useState(0);

  const isOpen = useGroupMode ? group.openId === blockId : localOpen;

  const measureContent = useCallback(() => {
    if (!contentRef.current) {
      return;
    }
    setContentHeight(contentRef.current.scrollHeight);
  }, []);

  useLayoutEffect(() => {
    measureContent();
  }, [children, isOpen, measureContent]);

  useEffect(() => {
    if (!contentRef.current || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      measureContent();
    });

    observer.observe(contentRef.current);

    return () => {
      observer.disconnect();
    };
  }, [measureContent]);

  useEffect(() => {
    const handleResize = () => measureContent();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureContent]);

  useEffect(() => {
    if (!isOpen || !isMobile || prefersReducedMotion) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, isMobile, prefersReducedMotion]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const toggle = () => {
    if (useGroupMode) {
      group.toggleBlock(blockId);
      return;
    }
    setLocalOpen((open) => !open);
  };

  const HeadingTag = `h${headingLevel}`;
  const chevronSize = isUltraCompact ? 14 : isMobile ? 16 : 18;

  return (
    <section
      ref={sectionRef}
      className={[
        'predicciones-accordion-block',
        isOpen ? 'is-open' : 'is-closed',
        isUltraCompact ? 'is-ultra-compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      <button
        type="button"
        className="predicciones-accordion-block__header"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <HeadingTag className="predicciones-accordion-block__title">
          {icon ? (
            <span className="predicciones-accordion-block__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className="predicciones-accordion-block__label">{title}</span>
        </HeadingTag>
        <span className="predicciones-accordion-block__chevron" aria-hidden="true">
          <IconChevronDown size={chevronSize} />
        </span>
      </button>

      <div
        id={panelId}
        className="predicciones-accordion-block__panel"
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : '0px',
          opacity: isOpen ? 1 : 0,
        }}
        aria-hidden={!isOpen}
      >
        <div ref={contentRef} className="predicciones-accordion-block__content">
          {children}
        </div>
      </div>
    </section>
  );
}
