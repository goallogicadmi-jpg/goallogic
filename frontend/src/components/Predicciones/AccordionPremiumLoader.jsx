import React from 'react';

export default function AccordionPremiumLoader({ message = 'Cargando…' }) {
  return (
    <div className="predicciones-accordion-loader" role="status" aria-live="polite">
      <span className="predicciones-accordion-loader__spinner" aria-hidden="true" />
      <span className="predicciones-accordion-loader__text">{message}</span>
    </div>
  );
}
