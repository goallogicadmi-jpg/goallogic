import { useState, useEffect } from 'react';
import { getPublicCmsContent } from '../../services/cmsPublicService';
import { SimpleMarkdown } from '../../utils/simpleMarkdown';
import './cms.css';

const DISMISS_PREFIX = 'cms_banner_dismissed_';

export default function CmsGlobalBanner() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPublicCmsContent();
        if (cancelled) return;
        const visible = (data.banners || []).filter(
          (b) => !localStorage.getItem(`${DISMISS_PREFIX}${b.id}`)
        );
        setBanners(visible);
      } catch (_) {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!banners.length) return null;

  const dismiss = (id, dismissible) => {
    if (dismissible !== false) {
      localStorage.setItem(`${DISMISS_PREFIX}${id}`, '1');
    }
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="cms-global-banners" role="region" aria-label="Avisos">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className={`cms-global-banner cms-banner-${banner.bannerVariant || 'info'}`}
        >
          <div className="cms-global-banner__content">
            <strong className="cms-global-banner__title">{banner.title}</strong>
            <SimpleMarkdown content={banner.body} className="cms-global-banner__body" />
          </div>
          {banner.dismissible !== false && (
            <button
              type="button"
              className="cms-global-banner__close"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(banner.id, banner.dismissible)}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
