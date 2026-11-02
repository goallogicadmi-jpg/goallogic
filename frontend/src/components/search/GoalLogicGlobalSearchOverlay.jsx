import { useEffect, useRef } from 'react';
import GoalLogicGlobalSearch from './GoalLogicGlobalSearch';
import '../../styles/goal-logic-global-search.css';

export default function GoalLogicGlobalSearchOverlay({ open, onClose }) {
  const inputContainerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.classList.add('gl-search-overlay-open');
    document.addEventListener('keydown', handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      const input = inputContainerRef.current?.querySelector('.gl-global-search__input');
      input?.focus();
    }, 50);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.classList.remove('gl-search-overlay-open');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="gl-global-search-overlay" role="dialog" aria-modal="true" aria-label="Buscar en GoalLogic">
      <button
        type="button"
        className="gl-global-search-overlay__backdrop"
        aria-label="Cerrar búsqueda"
        onClick={onClose}
      />
      <div className="gl-global-search-overlay__panel">
        <div className="gl-global-search-overlay__header">
          <span className="gl-global-search-overlay__title">Buscar</span>
          <button type="button" className="gl-global-search-overlay__close" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div ref={inputContainerRef} className="gl-global-search-overlay__search">
          <GoalLogicGlobalSearch className="gl-global-search--overlay" onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
