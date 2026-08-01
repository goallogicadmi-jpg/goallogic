import React, { createContext, useContext, useMemo, useState } from 'react';

const AccordionGroupContext = createContext(null);

export function useAccordionGroup() {
  return useContext(AccordionGroupContext);
}

/**
 * Agrupa bloques de acordeón. En móvil puede forzar que solo uno esté abierto.
 */
export default function AccordionGroup({ singleOpen = false, children }) {
  const [openId, setOpenId] = useState(null);

  const value = useMemo(
    () => ({
      singleOpen,
      openId,
      toggleBlock: (id) => {
        setOpenId((current) => (current === id ? null : id));
      },
      closeBlock: () => setOpenId(null),
    }),
    [singleOpen, openId]
  );

  return (
    <div className="predicciones-accordion-group">
      <AccordionGroupContext.Provider value={value}>{children}</AccordionGroupContext.Provider>
    </div>
  );
}
