import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getPublicSettings } from '../services/settingsPublicService';

const PlatformSettingsContext = createContext({
  loaded: false,
  freeModeEnabled: false,
});

export function usePlatformSettings() {
  return useContext(PlatformSettingsContext);
}

export function PlatformSettingsProvider({ children }) {
  const [state, setState] = useState({ loaded: false, freeModeEnabled: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPublicSettings();
        if (!cancelled) {
          setState({
            loaded: true,
            freeModeEnabled: data.freeModeEnabled === true,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ loaded: true, freeModeEnabled: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <PlatformSettingsContext.Provider value={value}>{children}</PlatformSettingsContext.Provider>
  );
}
