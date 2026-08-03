export async function fetchGlobalSearch(query, signal) {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 2) {
    return { query: trimmed, categories: [] };
  }

  const params = new URLSearchParams({ q: trimmed });
  const response = await fetch(`/api/global-search?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudo completar la búsqueda');
  }

  return response.json();
}
