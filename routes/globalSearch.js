const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const CommunityPost = require('../models/CommunityPost');
const { getCompetitionsByDomain } = require('../utils/competitionCatalog');

const router = express.Router();

const apiHeaders = process.env.API_KEY
  ? { 'x-apisports-key': process.env.API_KEY }
  : null;

const CATEGORY_LABELS = {
  teams: 'Equipos',
  matches: 'Partidos',
  competitions: 'Competiciones',
  countries: 'Países',
  predictions: 'Predicciones',
  analysts: 'Analistas',
  posts: 'Publicaciones',
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapTeam(item) {
  const team = item?.team || item;
  if (!team?.id) return null;
  return {
    id: team.id,
    name: team.name,
    logo: team.logo || null,
    country: team.country || item?.venue?.country || null,
    url: `/clubes/equipo/${team.id}`,
  };
}

function mapFixture(item) {
  const fixture = item?.fixture;
  const league = item?.league;
  const home = item?.teams?.home;
  const away = item?.teams?.away;
  if (!fixture?.id || !home || !away) return null;

  const domain = league?.country === 'World' ? 'selection' : 'club';
  const status = fixture.status?.short || '';

  return {
    id: fixture.id,
    label: `${home.name} vs ${away.name}`,
    league: league?.name || '',
    status,
    isLive: ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(status),
    url: '/partidos',
    meta: {
      homeTeamId: home.id,
      awayTeamId: away.id,
      leagueId: league?.id,
    },
  };
}

function searchCatalogCompetitions(query) {
  const regex = new RegExp(escapeRegex(query), 'i');
  const all = [
    ...getCompetitionsByDomain('club'),
    ...getCompetitionsByDomain('selection'),
  ];

  const seen = new Set();
  const results = [];

  for (const comp of all) {
    if (!comp?.id || seen.has(comp.id)) continue;
    if (!regex.test(comp.name || '') && !regex.test(comp.country || '')) continue;
    seen.add(comp.id);
    results.push({
      id: comp.id,
      name: comp.name,
      country: comp.country || '',
      logo: comp.logo || null,
      domain: comp.domain || 'club',
      url: `/${comp.domain === 'selection' ? 'selecciones' : 'clubes'}/competicion/${comp.id}`,
    });
    if (results.length >= 5) break;
  }

  return results;
}

function searchCatalogCountries(query) {
  const regex = new RegExp(escapeRegex(query), 'i');
  const all = [
    ...getCompetitionsByDomain('club'),
    ...getCompetitionsByDomain('selection'),
  ];

  const seen = new Set();
  const results = [];

  for (const comp of all) {
    const country = comp.country;
    if (!country || country === 'World' || seen.has(country)) continue;
    if (!regex.test(country)) continue;
    seen.add(country);
    results.push({
      id: country,
      name: country,
      url: '/partidos',
    });
    if (results.length >= 5) break;
  }

  return results;
}

async function searchTeams(query) {
  if (!apiHeaders) return [];

  try {
    const response = await axios.get(
      `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`,
      { headers: apiHeaders, timeout: 8000 }
    );
    return (response.data?.response || [])
      .map(mapTeam)
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function searchMatchesFromTeams(teams) {
  if (!apiHeaders || !teams.length) return [];

  const fixtures = [];

  for (const team of teams.slice(0, 2)) {
    try {
      const response = await axios.get(
        `https://v3.football.api-sports.io/fixtures?team=${team.id}&next=3`,
        { headers: apiHeaders, timeout: 8000 }
      );
      for (const item of response.data?.response || []) {
        const mapped = mapFixture(item);
        if (mapped && !fixtures.some((f) => f.id === mapped.id)) {
          fixtures.push(mapped);
        }
      }
    } catch {
      // omitir errores parciales
    }
  }

  return fixtures.slice(0, 5);
}

async function searchAnalysts(query) {
  const regex = new RegExp(escapeRegex(query), 'i');

  const users = await User.find({
    role: 'analista',
    analystVerifiedAt: { $ne: null },
    analystStatus: { $nin: ['suspended', 'rejected'] },
    $or: [{ nombre: regex }, { apellido: regex }, { publicId: regex }],
  })
    .select('nombre apellido foto_perfil_url publicId pais')
    .limit(5)
    .lean();

  return users.map((user) => ({
    id: user._id.toString(),
    name: [user.nombre, user.apellido].filter(Boolean).join(' ').trim(),
    country: user.pais || null,
    avatar: user.foto_perfil_url || null,
    url: `/analista/${user._id}`,
  }));
}

async function searchPosts(query) {
  const regex = new RegExp(escapeRegex(query), 'i');

  const posts = await CommunityPost.find({
    text: regex,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('text publicationType matchInfo createdAt')
    .lean();

  return posts.map((post) => ({
    id: post._id.toString(),
    label: (post.text || '').slice(0, 80),
    type: post.publicationType,
    match: post.matchInfo?.homeTeam && post.matchInfo?.awayTeam
      ? `${post.matchInfo.homeTeam} vs ${post.matchInfo.awayTeam}`
      : null,
    url: `/comunidad/post/${post._id}`,
  }));
}

router.get('/', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (query.length < 2) {
      return res.json({ query, categories: [] });
    }

    const teams = await searchTeams(query);
    const [
      competitions,
      countries,
      matches,
      analysts,
      posts,
    ] = await Promise.all([
      Promise.resolve(searchCatalogCompetitions(query)),
      Promise.resolve(searchCatalogCountries(query)),
      searchMatchesFromTeams(teams),
      searchAnalysts(query),
      searchPosts(query),
    ]);

    const predictions = teams.slice(0, 5).map((team) => ({
      id: team.id,
      label: `Predicciones: ${team.name}`,
      url: '/predicciones',
      meta: { teamId: team.id, teamName: team.name },
    }));

    const categories = [
      { id: 'teams', label: CATEGORY_LABELS.teams, items: teams },
      { id: 'matches', label: CATEGORY_LABELS.matches, items: matches },
      { id: 'competitions', label: CATEGORY_LABELS.competitions, items: competitions },
      { id: 'countries', label: CATEGORY_LABELS.countries, items: countries },
      { id: 'predictions', label: CATEGORY_LABELS.predictions, items: predictions },
      { id: 'analysts', label: CATEGORY_LABELS.analysts, items: analysts },
      { id: 'posts', label: CATEGORY_LABELS.posts, items: posts },
    ].filter((cat) => cat.items.length > 0);

    res.json({ query, categories });
  } catch (error) {
    console.error('Error en búsqueda global:', error);
    res.status(500).json({ error: 'No se pudo completar la búsqueda' });
  }
});

module.exports = router;
