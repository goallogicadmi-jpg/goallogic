import { useState, useEffect } from 'react';
import { getPublicCmsContent } from '../../services/cmsPublicService';
import { SimpleMarkdown } from '../../utils/simpleMarkdown';
import { formatCmsDate } from '../AdminPanel/adminCmsUtils';
import './cms.css';
import BrandResponsiveText from '../BrandResponsiveText';

export default function CmsDashboardSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPublicCmsContent();
        if (cancelled) return;
        setAnnouncements(data.announcements || []);
        setNews(data.news || []);
      } catch (_) {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!announcements.length && !news.length) return null;

  return (
    <section className="cms-dashboard-section" aria-label="Noticias y avisos">
      {announcements.length > 0 && (
        <div className="cms-announcements">
          {announcements.map((item) => (
            <div key={item.id} className="cms-announcement-card">
              <h3 className="cms-announcement-card__title">{item.title}</h3>
              <SimpleMarkdown content={item.body} className="cms-announcement-card__body" />
            </div>
          ))}
        </div>
      )}

      {news.length > 0 && (
        <div className="cms-news-block">
          <h3 className="cms-news-block__heading">
            Noticias <BrandResponsiveText />
          </h3>
          <div className="cms-news-grid">
            {news.map((item) => (
              <article key={item.id} className="cms-news-card">
                <h4>{item.title}</h4>
                {item.excerpt && <p className="cms-news-card__excerpt">{item.excerpt}</p>}
                <SimpleMarkdown content={item.body} className="cms-news-card__body" />
                <time className="cms-news-card__date">{formatCmsDate(item.publishedAt)}</time>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
