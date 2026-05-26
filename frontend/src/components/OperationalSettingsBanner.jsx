import { useState, useEffect } from 'react';
import { getPublicSettings } from '../services/settingsPublicService';

const DISMISS_KEY = 'operational_banner_dismissed';

export default function OperationalSettingsBanner() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPublicSettings();
        if (cancelled) return;
        if (
          data.operationalBannerEnabled &&
          data.operationalBannerMessage?.trim() &&
          !sessionStorage.getItem(DISMISS_KEY)
        ) {
          setBanner(data.operationalBannerMessage.trim());
        }
      } catch (_) {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!banner) return null;

  return (
    <div className="operational-settings-banner" role="status">
      <span className="operational-settings-banner__text">{banner}</span>
      <button
        type="button"
        className="operational-settings-banner__close"
        aria-label="Cerrar aviso"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1');
          setBanner(null);
        }}
      >
        ×
      </button>
    </div>
  );
}
