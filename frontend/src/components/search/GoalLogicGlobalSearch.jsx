import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGlobalSearch } from '../../services/globalSearchService';
import '../../styles/goal-logic-global-search.css';

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function getItemLabel(categoryId, item) {
  switch (categoryId) {
    case 'teams':
      return item.name;
    case 'players':
      return item.name;
    case 'matches':
      return item.label;
    case 'competitions':
      return item.name;
    case 'countries':
      return item.name;
    case 'predictions':
      return item.label;
    case 'analysts':
      return item.name;
    case 'posts':
      return item.match || item.label;
    default:
      return item.label || item.name || 'Resultado';
  }
}

function getItemMeta(categoryId, item) {
  switch (categoryId) {
    case 'teams':
      return item.country || null;
    case 'players':
      return [item.team, item.country].filter(Boolean).join(' · ') || null;
    case 'matches':
      return item.league ? `${item.league}${item.isLive ? ' · En vivo' : ''}` : null;
    case 'competitions':
      return item.country || null;
    case 'posts':
      return item.type || null;
    case 'analysts':
      return item.country || 'Analista certificado';
    default:
      return null;
  }
}

export default function GoalLogicGlobalSearch({ className = '', onNavigate }) {
  const navigate = useNavigate();
  const listboxId = useId();
  const rootRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const flatItems = results?.categories?.flatMap((category) =>
    category.items.map((item) => ({ category, item }))
  ) || [];

  const runSearch = useCallback(async (value) => {
    abortRef.current?.abort();

    if (value.trim().length < 2) {
      setResults(null);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const data = await fetchGlobalSearch(value, controller.signal);
      setResults(data);
      setActiveIndex(-1);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setResults({ query: value, categories: [] });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleSelect = (entry) => {
    if (!entry?.item?.url) return;

    const { category, item } = entry;

    if (category.id === 'predictions') {
      const { meta } = item;
      if (meta?.homeTeam?.id && meta?.awayTeam?.id && meta?.leagueId) {
        navigate(item.url, {
          state: {
            domain: meta.domain,
            leagueId: meta.leagueId,
            fixtureId: meta.fixtureId ?? null,
            leagueName: meta.leagueName ?? null,
            leagueLogo: meta.leagueLogo ?? null,
            fromMatchesRoute: '/partidos',
            homeTeam: meta.homeTeam,
            awayTeam: meta.awayTeam,
          },
        });
      } else if (meta?.teamName) {
        navigate(item.url, {
          state: {
            domain: meta.domain,
            homeTeam: { name: meta.teamName, id: meta.teamId },
          },
        });
      } else {
        navigate(item.url);
      }
    } else {
      navigate(item.url);
    }

    setOpen(false);
    setQuery('');
    setResults(null);
    onNavigate?.();
  };

  const handleKeyDown = (event) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (!flatItems.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? flatItems.length - 1 : prev - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(flatItems[activeIndex]);
    }
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div
      ref={rootRef}
      className={`gl-global-search ${className}`.trim()}
    >
      <div className="gl-global-search__field">
        <SearchIcon />
        <input
          type="search"
          className="gl-global-search__input"
          placeholder="Buscar en GoalLogic…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {showPanel ? (
        <div className="gl-global-search__panel" id={listboxId} role="listbox">
          {loading ? (
            <p className="gl-global-search__status">Buscando…</p>
          ) : flatItems.length === 0 ? (
            <p className="gl-global-search__status gl-global-search__status--empty">
              No hemos encontrado contenido relacionado con tu búsqueda.
            </p>
          ) : (
            results.categories.map((category) => (
              <section key={category.id} className="gl-global-search__category">
                <h3 className="gl-global-search__category-title">{category.label}</h3>
                <ul className="gl-global-search__list">
                  {category.items.map((item, index) => {
                    const flatIndex = flatItems.findIndex(
                      (entry) => entry.category.id === category.id && entry.item === item
                    );
                    const isActive = flatIndex === activeIndex;

                    return (
                      <li key={`${category.id}-${item.id || index}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className={`gl-global-search__result${isActive ? ' is-active' : ''}`}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => handleSelect({ category, item })}
                        >
                          <span className="gl-global-search__result-label">
                            {getItemLabel(category.id, item)}
                          </span>
                          {getItemMeta(category.id, item) ? (
                            <span className="gl-global-search__result-meta">
                              {getItemMeta(category.id, item)}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
