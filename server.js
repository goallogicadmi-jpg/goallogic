 const express = require('express'); 
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const axios = require('axios');
const helmet = require('helmet');
require('dotenv').config();
const { getCompetitionById, getCompetitionsByDomain } = require('./utils/competitionCatalog');
const { buildPredictionsLeagues } = require('./utils/predictionsLeagues');
const { findUpcomingFixtureBetweenTeams, normalizeTeamId } = require('./utils/upcomingFixtureUtils');
const { dedupeInjuriesByPlayer, buildInjuriesQueryPlans } = require('./utils/injuriesApiUtils');
const { logUpstream, GENERIC_API_ERROR } = require('./utils/upstreamError');
const { buildProductionCspDirectives } = require('./utils/cspDirectives');
const premiumApiGuard = require('./middleware/premiumApiGuard');
const publicCatalogRateLimit = require('./middleware/publicCatalogRateLimit');
const logger = require('./utils/logger');

const jwtSecret = process.env.JWT_SECRET || '';
if (process.env.NODE_ENV === 'production') {
  if (!jwtSecret || jwtSecret.length < 32) {
    logger.critical('server_jwt_secret_invalid', {
      message: 'JWT_SECRET debe existir y tener al menos 32 caracteres en producción',
    });
    process.exit(1);
  }
} else if (jwtSecret && jwtSecret.length < 32) {
  logger.warn('server_jwt_secret_short', {
    message: 'JWT_SECRET debería tener al menos 32 caracteres',
  });
}

// Validar que las variables de entorno estén configuradas
if (process.env.NODE_ENV !== 'production') {
  console.log('Verificando API_KEY...');
  if (!process.env.API_KEY) {
    console.error('ERROR: API_KEY no está definida en process.env');
  } else {
    console.log('API_KEY cargada correctamente');
  }
} else if (!process.env.API_KEY) {
  logger.critical('server_api_key_missing', {
    message: 'API_KEY no está definida en producción',
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const allowedOrigins = [
  'https://goallogic.vercel.app',
  'https://goal-logic.com',
  'https://www.goal-logic.com',
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.CORS_EXTRA_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
];

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/$/, '');
}

function isOriginAllowed(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;
  if (allowedOrigins.includes(normalized)) return true;
  // Deploy previews de Vercel: *.vercel.app
  if (/^https:\/\/[\w.-]+\.vercel\.app$/i.test(normalized)) return true;
  return false;
}

// CORS: PRIMERO — antes de helmet, compression, express.json() y rutas /api
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        const normalized = normalizeOrigin(origin);
        return callback(null, normalized || true);
      }
      console.log('[CORS] Rechazado:', origin);
      logger.security('cors_rejected', { origin });
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-apisports-key',
      'stripe-signature',
    ],
  })
);

if (process.env.NODE_ENV === 'production') {
  console.log('[CORS] Orígenes permitidos:', allowedOrigins.join(', '));
}

const isProduction = process.env.NODE_ENV === 'production';
const enableHsts =
  isProduction || process.env.ENABLE_HELMET_HSTS === 'true';

app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: buildProductionCspDirectives(),
        }
      : false,
    crossOriginEmbedderPolicy: false,
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: enableHsts
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  })
);

app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '0');
  next();
});

const stripeWebhook = require('./routes/stripeWebhook');

// Middleware: gzip (brotli suele ir en Nginx/Cloudflare frente a Node)
app.use(
  compression({
    filter: (req, res) => {
      if (req.path === '/api/payments/webhook') return false;
      return compression.filter(req, res);
    },
  })
);

const apiShortPublicCache = require('./middleware/apiShortPublicCache');
const requestContext = require('./utils/requestContext');
const globalLimiter = require('./middleware/globalRateLimit');
const optionalBlockedUserAgents = require('./middleware/optionalBlockedUserAgents');

app.use(optionalBlockedUserAgents);

/**
 * Stripe envía Content-Type `application/json` (a veces con `; charset=utf-8`).
 * Si express.raw no coincide, el body no es Buffer y constructEvent rompe la firma.
 */
function stripeWebhookJsonContentType(req) {
  const ct = req.headers['content-type'] || '';
  return /application\/json/i.test(ct);
}

// Webhook Stripe: SOLO esta ruta usa body raw; debe ir ANTES de express.json().
// La URL pública (p. ej. ngrok) se configura en Stripe Dashboard, no aquí.
app.post(
  '/api/payments/webhook',
  express.raw({ type: stripeWebhookJsonContentType, limit: '2mb' }),
  stripeWebhook
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(apiShortPublicCache);
app.use(requestContext.middleware);
app.use(globalLimiter);
app.use(publicCatalogRateLimit);
app.use(premiumApiGuard);

const { stripeApiModeFromEnv } = require('./utils/mongoUriHint');

function stripeCheckoutUrlHint(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '(invalid-url)';
  }
}

app.get('/api/health', (req, res) => {
  const priceId = (process.env.STRIPE_PRICE_ID || '').trim();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    stripe: {
      secretKeyMode: stripeApiModeFromEnv(),
      priceIdConfigured: Boolean(priceId),
      priceIdSuffix: priceId ? priceId.slice(-12) : null,
      successUrl: stripeCheckoutUrlHint(process.env.STRIPE_SUCCESS_URL),
      cancelUrl: stripeCheckoutUrlHint(process.env.STRIPE_CANCEL_URL),
      couponConfigured: Boolean((process.env.STRIPE_COUPON_ID || '').trim()),
      webhookSecretConfigured: Boolean((process.env.STRIPE_WEBHOOK_SECRET || '').trim()),
    },
  });
});

// MongoDB
const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'futbol_analytics';

let db;

// Conexión a MongoDB
async function connectToMongoDB() {
    try {
        if (!MONGODB_URI) {
            console.warn('⚠️ MONGO_URI no está definida, saltando conexión a MongoDB');
            return Promise.reject(new Error('MONGO_URI no configurada'));
        }
        
        // Opciones de conexión para MongoDB Atlas
        const options = {
            serverSelectionTimeoutMS: 10000 // Timeout de 10 segundos
        };
        
        // Usar la URI tal cual viene del .env, sin modificar TLS
        let mongoUri = MONGODB_URI;

        // Asegurar parámetros mínimos (sin tocar TLS)
        const uriParams = [];
        if (!mongoUri.includes('retryWrites')) {
            uriParams.push('retryWrites=true');
        }
        if (!mongoUri.includes('w=')) {
            uriParams.push('w=majority');
        }

        if (uriParams.length > 0) {
            mongoUri += (mongoUri.includes('?') ? '&' : '?') + uriParams.join('&');
        }
        
        console.log('🔄 Intentando conectar a MongoDB Atlas...');
        console.log('🔍 URI (sin credenciales):', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

        const client = new MongoClient(mongoUri, options);
        await client.connect();
        db = client.db(DB_NAME);

        console.log('✅ Conectado a MongoDB Atlas');

        // Conectar Mongoose para modelos de autenticación
        try {
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 10000
            });
            console.log('✅ Mongoose conectado para modelos de autenticación');
            const { registerMongoMonitoring } = require('./utils/mongoMonitor');
            registerMongoMonitoring();

            const { startCommunityPostCleanup } = require('./jobs/communityPostCleanup');
            startCommunityPostCleanup();
            
            // Crear administrador principal por defecto
            try {
                const createMainAdmin = require('./scripts/createMainAdmin.js');
                await createMainAdmin();
            } catch (adminError) {
                console.warn('⚠️ Error creando administrador principal:', adminError.message);
            }
        } catch (mongooseError) {
            logger.critical('mongoose_connect_failed', { message: mongooseError.message });
            console.warn('⚠️ Error conectando Mongoose (autenticación puede no funcionar):', mongooseError.message);
        }

        return Promise.resolve();

    } catch (error) {
        logger.critical('mongo_connect_failed', { message: error.message });
        console.error('❌ Error conectando a MongoDB:', error.message);

        if (error.message.includes('ReplicaSetNoPrimary')) {
            console.error('💡 Sugerencia: El cluster puede estar en mantenimiento o sin PRIMARY asignado');
            console.error('💡 Verifica el estado del cluster en MongoDB Atlas');
        }

        return Promise.reject(error);
    }
}

// ======================================================
// 📌 Headers correctos para API-SPORTS
// ======================================================
// IMPORTANTE: API-Football requiere SOLO el header "x-apisports-key"
const apiHeaders = {
    "x-apisports-key": process.env.API_KEY
};

// Validar que el header tenga la clave antes de hacer peticiones
if (!apiHeaders["x-apisports-key"]) {
    console.error("❌ ERROR: apiHeaders no tiene x-apisports-key configurado");
}

// ======================================================
// 📌 Obtener lista de ligas desde API-Football
// ======================================================
app.get('/api/leagues', async (req, res) => {
    try {
        // Validar que la API key esté disponible
        if (!process.env.API_KEY) {
            console.error("❌ [LEAGUES] ERROR: API_KEY no está definida en process.env");
            return res.status(500).json({ 
                error: "servicio_datos_no_configurado",
                message: "Servicio de datos no configurado. Contacta al administrador."
            });
        }

        const response = await axios.get(
            "https://v3.football.api-sports.io/leagues",
            { headers: apiHeaders }
        );

        console.log("🔍 [LEAGUES] Respuesta recibida - Status:", response.status);
        console.log("🔍 [LEAGUES] Respuesta recibida - Tiene data?:", !!response.data);
        console.log("🔍 [LEAGUES] Respuesta recibida - Tiene response?:", !!response.data?.response);
        if (response.data?.response) {
            console.log("🔍 [LEAGUES] Cantidad de ligas:", response.data.response.length);
        }

        res.json(response.data);

    } catch (error) {
        console.error("❌ [LEAGUES] Error completo:", error.message);
        console.error("❌ [LEAGUES] Error response data:", error.response?.data);
        console.error("❌ [LEAGUES] Error response status:", error.response?.status);
        res.status(500).json({ error: "Error al obtener ligas" });
    }
});

// ======================================================
// 🟢 Obtener temporada actual desde API-Football
// ======================================================
async function getCurrentSeasonFromAPI(leagueId) {
    // Validar y convertir leagueId a número entero
    const leagueIdNumber = parseInt(leagueId, 10);
    
    if (isNaN(leagueIdNumber) || leagueIdNumber <= 0) {
        throw new Error(`ID de liga inválido: ${leagueId}. Debe ser un número entero positivo.`);
    }
    
    const url = `https://v3.football.api-sports.io/leagues?id=${leagueIdNumber}`;

    try {
        const response = await axios.get(url, { headers: apiHeaders });

        const data = response.data;

        if (!data.response || data.response.length === 0) {
            console.log("🔥 ERROR REAL DE LA API:", data);
            throw new Error("No se pudo obtener la información de la liga");
        }

        const leagueData = data.response[0];

        if (!leagueData.seasons) {
            console.log("🔥 ERROR REAL DE LA API:", data);
            throw new Error("La API no devolvió temporadas para esta liga");
        }

        const currentSeason = leagueData.seasons.find(s => s.current === true);

        if (!currentSeason) {
            console.log("🔥 ERROR REAL DE LA API:", data);
            throw new Error("No se encontró temporada actual");
        }

        return currentSeason.year;

    } catch (err) {
        console.log("🔥 ERROR REAL DE LA API:", err.response?.data || err);
        throw new Error("No se pudo obtener la información de la liga");
    }
}// ======================================================
// 📌 Obtener información detallada de liga (temporadas)
// ======================================================
app.get('/api/league-info/:leagueId', async (req, res) => {
    try {
        const { leagueId } = req.params;
        
        const response = await axios.get(
            `https://v3.football.api-sports.io/leagues?id=${leagueId}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo info de liga:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener información de liga" });
    }
});

// ======================================================
// 📌 Buscar equipos por nombre
// ======================================================
app.get('/api/search-teams', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({ response: [] });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(q)}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error buscando equipos:", error.response?.data || error);
        res.status(500).json({ error: "Error al buscar equipos" });
    }
});

// ======================================================
// 📌 Obtener estadísticas de equipo
// ======================================================
app.get('/api/team-stats', async (req, res) => {
    try {
        const { teamId, leagueId, season } = req.query;
        
        if (!teamId || !leagueId || !season) {
            return res.status(400).json({ error: "Faltan parámetros: teamId, leagueId, season" });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo estadísticas:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener estadísticas del equipo" });
    }
});

// ======================================================
// 📌 Obtener información de equipo por ID
// ======================================================
app.get('/api/team-info/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ error: "Falta parámetro: id" });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/teams?id=${id}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo información del equipo:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener información del equipo" });
    }
});

// ======================================================
// 📌 Obtener plantilla del equipo
// ======================================================
app.get('/api/team-squad', async (req, res) => {
    try {
        const { teamId, season } = req.query;
        
        if (!teamId) {
            return res.status(400).json({ error: "Falta parámetro: teamId" });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/players/squads?team=${teamId}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo plantilla del equipo:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener plantilla del equipo" });
    }
});

// ======================================================
// 📌 Obtener últimos partidos de un equipo
// ======================================================
app.get('/api/team-last-matches', async (req, res) => {
    try {
        const { teamId, limit = 6 } = req.query;
        
        if (!teamId) {
            return res.status(400).json({ error: "Falta parámetro: teamId" });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=${limit}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo últimos partidos:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener últimos partidos" });
    }
});

// ======================================================
// 🔍 Función para filtrar ligas no deseadas
// ======================================================
function filtrarLigasPermitidas(fixtures) {
    if (!Array.isArray(fixtures)) {
        return [];
    }

    // Países/regiones a EXCLUIR
    const paisesExcluidos = [
        // África
        'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 
        'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', 'Congo', 'DR Congo',
        'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia',
        'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya',
        'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
        'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda',
        'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia',
        'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
        'Zambia', 'Zimbabwe',
        // Asia
        'Afghanistan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China',
        'East Timor', 'Hong Kong', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel',
        'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon',
        'Macau', 'Malaysia', 'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea',
        'Oman', 'Pakistan', 'Palestine', 'Philippines', 'Qatar',
        // 'Saudi Arabia', // Removido para permitir Saudi Pro League
        'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan',
        'Thailand', 'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam', 'Yemen',
        // Oceanía
        'American Samoa', 'Australia', 'Cook Islands', 'Fiji', 'Guam', 'Kiribati',
        'Marshall Islands', 'Micronesia', 'Nauru', 'New Caledonia', 'New Zealand',
        'Niue', 'Northern Mariana Islands', 'Palau', 'Papua New Guinea', 'Samoa',
        'Solomon Islands', 'Tahiti', 'Tonga', 'Tuvalu', 'Vanuatu'
    ];

    // Palabras clave para identificar ligas femeninas
    const palabrasFemeninas = ['women', 'femenino', 'femenina', 'womens', 'ladies', 'damen'];

    return fixtures.filter(fixture => {
        const league = fixture.league;
        if (!league) return false;

        const country = (league.country || '').toLowerCase();
        const leagueName = (league.name || '').toLowerCase();
        const leagueType = (league.type || '').toLowerCase();

        // Excluir ligas femeninas
        if (palabrasFemeninas.some(palabra => 
            leagueName.includes(palabra) || 
            leagueType.includes(palabra)
        )) {
            return false;
        }

        // Excluir países/regiones no deseadas
        if (paisesExcluidos.some(pais => 
            country === pais.toLowerCase() || 
            country.includes(pais.toLowerCase())
        )) {
            return false;
        }

        return true;
    });
}

// ======================================================
// 📌 Obtener partidos por fecha (OPTIMIZADO - Solo ligas prioritarias)
// ======================================================
app.get('/api/fixtures', async (req, res) => {
    try {
        const { date, leagueId } = req.query;

        if (!process.env.API_KEY) {
            return res.status(500).json({
                error: 'servicio_datos_no_configurado',
                message: 'Servicio de datos no disponible en este momento.',
            });
        }

        if (!date) {
            return res.json({ response: [] });
        }

        const url = leagueId
            ? `https://v3.football.api-sports.io/fixtures?date=${date}&league=${leagueId}`
            : `https://v3.football.api-sports.io/fixtures?date=${date}`;

        const response = await axios.get(url, { headers: apiHeaders });

        let fixtures = [];
        if (response.data?.response && Array.isArray(response.data.response)) {
            fixtures = response.data.response;
        } else if (Array.isArray(response.data)) {
            fixtures = response.data;
        }

        if (!leagueId) {
            fixtures = filtrarLigasPermitidas(fixtures);
        }

        res.json({ response: fixtures });
    } catch (error) {
        logUpstream('fixtures', error);
        res.json({ response: [] });
    }
});

// ======================================================
// 📌 Obtener eventos de un partido
// ======================================================
app.get('/api/fixtures/:fixtureId/events', async (req, res) => {
    try {
        const { fixtureId } = req.params;

        if (!fixtureId) {
            return res.status(400).json({ error: 'Falta parámetro: fixtureId' });
        }

        if (!process.env.API_KEY) {
            return res.status(500).json({
                error: 'servicio_datos_no_configurado',
                message: 'Servicio de datos no disponible en este momento.',
            });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
            { headers: apiHeaders }
        );

        res.json(response.data);
    } catch (error) {
        logUpstream('fixtures_events', error);
        const status = error.response?.status;
        res.status(status && status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Obtener alineaciones de un partido
// ======================================================
app.get('/api/fixtures/:fixtureId/lineups', async (req, res) => {
    try {
        const { fixtureId } = req.params;

        if (!fixtureId) {
            return res.status(400).json({ error: 'Falta parámetro: fixtureId' });
        }

        if (!process.env.API_KEY) {
            return res.status(500).json({
                error: 'servicio_datos_no_configurado',
                message: 'Servicio de datos no disponible en este momento.',
            });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
            { headers: apiHeaders }
        );

        res.json(response.data);
    } catch (error) {
        logUpstream('fixtures_lineups', error);
        const status = error.response?.status;
        res.status(status && status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Obtener estadísticas de un partido
// ======================================================
app.get('/api/fixtures/:fixtureId/statistics', async (req, res) => {
    try {
        const { fixtureId } = req.params;

        if (!fixtureId) {
            return res.status(400).json({ error: 'Falta parámetro: fixtureId' });
        }

        if (!process.env.API_KEY) {
            return res.status(500).json({
                error: 'servicio_datos_no_configurado',
                message: 'Servicio de datos no disponible en este momento.',
            });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
            { headers: apiHeaders }
        );

        res.json(response.data);
    } catch (error) {
        logUpstream('fixtures_statistics', error);
        const status = error.response?.status;
        res.status(status && status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Obtener fixture próximo y odds entre dos equipos
// ======================================================
app.get('/api/fixtures/upcoming', async (req, res) => {
    try {
        const { team1, team2, leagueId, season, fixtureId } = req.query;
        const team1Id = normalizeTeamId(team1);
        const team2Id = normalizeTeamId(team2);
        const leagueIdNum = normalizeTeamId(leagueId);
        const seasonNum = normalizeTeamId(season);
        const fixtureIdNum = normalizeTeamId(fixtureId);
        
        if (!team1Id || !team2Id) {
            return res.status(400).json({ 
                error: "Faltan parámetros válidos: team1, team2 (IDs numéricos)",
                fixture: null,
                odds: null
            });
        }

        if (!process.env.API_KEY) {
            return res.status(500).json({
                error: 'servicio_datos_no_configurado',
                fixture: null,
                odds: null,
            });
        }

        let resolvedSeason = seasonNum;
        if (leagueIdNum && !resolvedSeason) {
            try {
                resolvedSeason = await getCurrentSeasonFromAPI(leagueIdNum);
            } catch {
                resolvedSeason = new Date().getFullYear();
            }
        }

        const upcomingFixture = await findUpcomingFixtureBetweenTeams(team1Id, team2Id, apiHeaders, {
            leagueId: leagueIdNum,
            season: resolvedSeason,
            fixtureId: fixtureIdNum,
        });

        if (!upcomingFixture) {
            return res.json({
                fixture: null,
                odds: null,
                message: "No existe un partido programado entre estos dos equipos próximamente."
            });
        }

        // Obtener odds del fixture si existe
        let odds = null;
        try {
            const oddsResponse = await axios.get(
                `https://v3.football.api-sports.io/odds?fixture=${upcomingFixture.fixture.id}`,
                { headers: apiHeaders }
            );

            if (oddsResponse.data && oddsResponse.data.response && oddsResponse.data.response.length > 0) {
                // Buscar odds de tipo "Match Winner" (1X2)
                const matchOdds = oddsResponse.data.response.find(bookmaker => 
                    bookmaker.bookmakers && bookmaker.bookmakers.length > 0
                );

                if (matchOdds && matchOdds.bookmakers && matchOdds.bookmakers.length > 0) {
                    const bookmaker = matchOdds.bookmakers[0];
                    const matchWinner = bookmaker.bets?.find(bet => bet.name === 'Match Winner');
                    
                    if (matchWinner && matchWinner.values && matchWinner.values.length >= 3) {
                        odds = {
                            home: parseFloat(matchWinner.values[0].odd) || null,
                            draw: parseFloat(matchWinner.values[1].odd) || null,
                            away: parseFloat(matchWinner.values[2].odd) || null
                        };
                    }
                }
            }
        } catch (oddsError) {
            logUpstream('fixtures_upcoming_odds', oddsError);
        }

        res.json({
            fixture: upcomingFixture,
            odds: odds,
            message: odds ? null : "No hay probabilidades disponibles para este partido."
        });

    } catch (error) {
        logUpstream('fixtures_upcoming', error);
        res.status(500).json({
            error: GENERIC_API_ERROR,
            fixture: null,
            odds: null,
        });
    }
});

// ======================================================
// 📌 Obtener H2H (Head to Head) entre dos equipos
// ======================================================
app.get('/api/h2h', async (req, res) => {
    try {
        const { team1, team2 } = req.query;
        
        if (!team1 || !team2) {
            return res.status(400).json({ error: "Faltan parámetros: team1, team2" });
        }

        // Validar API_KEY
        if (!process.env.API_KEY) {
            console.error("❌ [H2H] ERROR: API_KEY no está definida");
            return res.status(500).json({ 
                error: "servicio_datos_no_configurado",
                message: "Servicio de datos no disponible en este momento."
            });
        }

        console.log(`📡 [H2H] Solicitando H2H entre equipos: ${team1} vs ${team2}`);

        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${team1}-${team2}`,
            { headers: apiHeaders }
        );

        console.log(`✅ [H2H] H2H obtenido correctamente`);
        res.json(response.data);

    } catch (error) {
        console.error("❌ [H2H] Error obteniendo H2H:");
        console.error("   Status:", error.response?.status);
        console.error("   Status Text:", error.response?.statusText);
        console.error("   Data:", error.response?.data);
        console.error("   Error completo:", error.message);
        
        logUpstream('h2h', error);
        const status = error.response?.status;
        res.status(status && status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
            response: [],
        });
    }
});

// ======================================================
// 📌 Obtener lesiones del equipo
// ======================================================
app.get('/api/team-injuries', async (req, res) => {
    try {
        const { teamId, leagueId, season, fixtureId } = req.query;
        const teamIdNum = normalizeTeamId(teamId);
        const leagueIdNum = normalizeTeamId(leagueId);
        const seasonNum = normalizeTeamId(season);
        const fixtureIdNum = normalizeTeamId(fixtureId);

        if (!teamIdNum && !fixtureIdNum) {
            return res.status(400).json({ error: "Falta parámetro: teamId o fixtureId" });
        }

        let resolvedSeason = seasonNum;
        if (teamIdNum && leagueIdNum && !resolvedSeason) {
            try {
                resolvedSeason = await getCurrentSeasonFromAPI(leagueIdNum);
            } catch {
                resolvedSeason = new Date().getFullYear();
            }
        }

        const plans = buildInjuriesQueryPlans({
            teamId: teamIdNum,
            leagueId: leagueIdNum,
            season: resolvedSeason,
            fixtureId: fixtureIdNum,
        });

        let merged = [];
        const tried = [];

        for (const plan of plans) {
            try {
                const response = await axios.get(
                    `https://v3.football.api-sports.io/injuries?${plan.query}`,
                    { headers: apiHeaders }
                );
                const batch = response.data?.response;
                const count = Array.isArray(batch) ? batch.length : 0;
                tried.push({ ...plan, count });
                if (count > 0) {
                    merged = merged.concat(batch);
                }
                // Si ya hay datos con league+season o team+season, no hace falta el fallback team-only (suele devolver 0 o duplicar)
                if (count > 0 && (plan.label === 'team-league-season' || plan.label === 'team-season' || plan.label === 'fixture')) {
                    break;
                }
            } catch (planError) {
                tried.push({ ...plan, count: 0, error: planError.message });
            }
        }

        const deduped = dedupeInjuriesByPlayer(merged);

        if (deduped.length === 0) {
            console.log(
                `⚠️ [INJURIES] Sin bajas para team=${teamIdNum} league=${leagueIdNum || '—'} season=${resolvedSeason || '—'} fixture=${fixtureIdNum || '—'}`,
                tried
            );
        } else {
            console.log(
                `✅ [INJURIES] ${deduped.length} jugador(es) para team=${teamIdNum} (estrategia: ${tried.filter((t) => t.count > 0).map((t) => t.label).join(', ') || 'ninguna'})`
            );
        }

        res.json({
            response: deduped,
            results: deduped.length,
            meta: {
                teamId: teamIdNum,
                leagueId: leagueIdNum,
                season: resolvedSeason,
                fixtureId: fixtureIdNum,
                strategies: tried,
            },
        });

    } catch (error) {
        console.error("❌ Error obteniendo lesiones:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener lesiones del equipo", response: [] });
    }
});

// ======================================================
// 📌 Obtener transferencias del equipo
// ======================================================
app.get('/api/team-transfers', async (req, res) => {
    try {
        const { teamId } = req.query;
        
        if (!teamId) {
            return res.status(400).json({ error: "Falta parámetro: teamId" });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/transfers?team=${teamId}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo transferencias:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener transferencias del equipo" });
    }
});

// ======================================================
// 📌 Top goleadores de una liga/temporada (API-Football)
// ======================================================
app.get('/api/players/topscorers', async (req, res) => {
    try {
        const leagueId = String(req.query.leagueId || req.query.league || '').trim();
        const season = String(req.query.season || '').trim();

        if (!leagueId || !season) {
            return res.status(400).json({ error: 'Faltan parámetros: leagueId, season' });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/players/topscorers?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(season)}`,
            { headers: apiHeaders }
        );

        const payload = response.data;
        const apiErrors = payload?.errors;
        if (apiErrors && typeof apiErrors === 'object' && Object.keys(apiErrors).length > 0) {
            console.warn('⚠️ API-Football topscorers:', apiErrors, { leagueId, season });
            return res.status(502).json({
                error: 'No hay datos de goleadores para esta liga/temporada',
                apiErrors,
            });
        }

        res.json(payload);
    } catch (error) {
        console.error('❌ Error obteniendo top goleadores:', error.response?.data || error);
        logUpstream('players_topscorers', error);
        const status = error.response?.status || 500;
        res.status(status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Top asistencias de una liga/temporada (API-Football)
// ======================================================
app.get('/api/players/topassists', async (req, res) => {
    try {
        const leagueId = String(req.query.leagueId || req.query.league || '').trim();
        const season = String(req.query.season || '').trim();

        if (!leagueId || !season) {
            return res.status(400).json({ error: 'Faltan parámetros: leagueId, season' });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/players/topassists?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(season)}`,
            { headers: apiHeaders }
        );

        const payload = response.data;
        const apiErrors = payload?.errors;
        if (apiErrors && typeof apiErrors === 'object' && Object.keys(apiErrors).length > 0) {
            console.warn('⚠️ API-Football topassists:', apiErrors, { leagueId, season });
            return res.status(502).json({
                error: 'No hay datos de asistencias para esta liga/temporada',
                apiErrors,
            });
        }

        res.json(payload);
    } catch (error) {
        console.error('❌ Error obteniendo top asistencias:', error.response?.data || error);
        logUpstream('players_topassists', error);
        const status = error.response?.status || 500;
        res.status(status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Obtener estadísticas de jugadores del equipo (sin datos personales)
// ======================================================
app.get('/api/team-players-stats', async (req, res) => {
    try {
        const { teamId, leagueId, season } = req.query;
        
        if (!teamId || !leagueId || !season) {
            return res.status(400).json({ error: "Faltan parámetros: teamId, leagueId, season" });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/players?team=${teamId}&league=${leagueId}&season=${season}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo estadísticas de jugadores:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener estadísticas de jugadores" });
    }
});

// ======================================================
// 📌 Comparar dos equipos
// ======================================================
app.get('/api/compare', async (req, res) => {
    try {
        const { teamA, teamB, leagueId, season } = req.query;
        
        if (!teamA || !teamB || !leagueId || !season) {
            return res.status(400).json({ error: "Faltan parámetros: teamA, teamB, leagueId, season" });
        }

        // Validar que los equipos existan en la liga seleccionada
        try {
            // Obtener información de la liga para obtener su nombre
            const leagueInfoResponse = await axios.get(
                `https://v3.football.api-sports.io/leagues?id=${leagueId}`,
                { headers: apiHeaders }
            );

            if (!leagueInfoResponse.data.response || leagueInfoResponse.data.response.length === 0) {
                return res.status(400).json({ error: "Liga no encontrada" });
            }

            const liga = leagueInfoResponse.data.response[0].league.name;

            // Obtener nombres de los equipos por sus IDs
            const [teamAInfoResponse, teamBInfoResponse] = await Promise.all([
                axios.get(`https://v3.football.api-sports.io/teams?id=${teamA}`, { headers: apiHeaders }),
                axios.get(`https://v3.football.api-sports.io/teams?id=${teamB}`, { headers: apiHeaders })
            ]);

            const local = teamAInfoResponse.data.response?.[0]?.team?.name;
            const visitante = teamBInfoResponse.data.response?.[0]?.team?.name;

            if (!local || !visitante) {
                return res.status(400).json({ error: "No se pudieron obtener los nombres de los equipos" });
            }

            // Validación exacta como se solicita
            const equiposValidos = await obtenerEquiposDeLiga(liga);
            if (!equiposValidos.includes(local) || !equiposValidos.includes(visitante)) {
                return res.status(400).json({
                    error: "Equipo inválido. Selecciona un equipo existente."
                });
            }

        } catch (validationError) {
            console.error("❌ Error en validación de equipos:", validationError);
            return res.status(400).json({ error: "Error validando equipos de la liga" });
        }

        // Obtener datos de ambos equipos en paralelo
        const [statsA, matchesA, statsB, matchesB] = await Promise.all([
            axios.get(`https://v3.football.api-sports.io/teams/statistics?team=${teamA}&league=${leagueId}&season=${season}`, { headers: apiHeaders }),
            axios.get(`https://v3.football.api-sports.io/fixtures?team=${teamA}&last=6`, { headers: apiHeaders }),
            axios.get(`https://v3.football.api-sports.io/teams/statistics?team=${teamB}&league=${leagueId}&season=${season}`, { headers: apiHeaders }),
            axios.get(`https://v3.football.api-sports.io/fixtures?team=${teamB}&last=6`, { headers: apiHeaders })
        ]);

        res.json({
            teamA: {
                stats: statsA.data.response,
                lastMatches: matchesA.data.response
            },
            teamB: {
                stats: statsB.data.response,
                lastMatches: matchesB.data.response
            }
        });

    } catch (error) {
        console.error("❌ Error comparando equipos:", error.response?.data || error);
        res.status(500).json({ error: "Error al comparar equipos" });
    }
});

// ======================================================
// 📌 Guardar tabla de apuestas
// ======================================================
app.post('/api/betting-table', async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB no conectada" });

    try {
        const { tableData, timestamp } = req.body;

        const result = await db.collection('betting_tables').insertOne({
            data: tableData,
            timestamp: timestamp || new Date(),
            createdAt: new Date()
        });

        res.json({ success: true, id: result.insertedId });
    } catch (error) {
        console.error('❌ Error guardando tabla:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================================================
// 📌 Obtener última tabla guardada
// ======================================================
app.get('/api/betting-table/latest', async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB no conectada" });

    try {
        const latestTable = await db.collection('betting_tables')
            .findOne({}, { sort: { createdAt: -1 } });

        res.json({ success: true, data: latestTable });
    } catch (error) {
        console.error('❌ Error obteniendo tabla:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================================================
// 📌 Buscar equipos
// ======================================================
app.get('/api/teams/search', async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB no conectada" });

    try {
        const { query } = req.query;

        const teams = await db.collection('teams')
            .find({ name: { $regex: query, $options: 'i' } })
            .limit(10)
            .toArray();

        res.json({ success: true, data: teams });
    } catch (error) {
        console.error('❌ Error buscando equipos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================================================
// 📌 Guardar estadísticas de equipo
// ======================================================
app.post('/api/teams/stats', async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB no conectada" });

    try {
        const { teamName, stats } = req.body;

        const result = await db.collection('team_stats').updateOne(
            { teamName },
            {
                $set: {
                    ...stats,
                    lastUpdated: new Date()
                }
            },
            { upsert: true }
        );

        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error guardando estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================================================
// 📌 Obtener estadísticas de equipo
// ======================================================
app.get('/api/teams/stats/:teamName', async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB no conectada" });

    try {
        const { teamName } = req.params;

        const stats = await db.collection('team_stats')
            .findOne({ teamName: { $regex: teamName, $options: 'i' } });

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================================================
// 📌 Obtener equipos de una liga específica
// ======================================================
async function obtenerEquiposDeLiga(liga) {
    try {
        // Mapeo de nombres de ligas a IDs de la API
        const ligasMap = {
            'Premier League': 39,
            'La Liga': 140,
            'Serie A': 135,
            'Bundesliga': 78,
            'Ligue 1': 61,
            'Champions League': 2,
            'Europa League': 3,
            'Copa del Rey': 143,
            'FA Cup': 45,
            'Coppa Italia': 137,
            'DFB Pokal': 81,
            'Coupe de France': 66,
            'Saudi Pro League': 307,
            'Saudi Professional League': 307,
            'Premier Liga': 235,
            'Russian Premier League': 235,
            'Premier League Russia': 235,
            'Categoría Primera A': 239,
            'Primera A Colombia': 239,
            'Liga BetPlay': 239,
            'Liga BetPlay Dimayor': 239
        };

        const leagueId = ligasMap[liga];
        if (!leagueId) {
            throw new Error(`Liga "${liga}" no encontrada`);
        }

        // Obtener temporada actual
        const currentSeason = await getCurrentSeasonFromAPI(leagueId);

        // Obtener equipos de la liga
        const response = await axios.get(
            `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${currentSeason}`,
            { headers: apiHeaders }
        );

        if (!response.data.response || response.data.response.length === 0) {
            return [];
        }

        // Extraer solo los nombres de los equipos
        const equipos = response.data.response.map(item => item.team.name);
        return equipos.sort(); // Ordenar alfabéticamente

    } catch (error) {
        console.error(`❌ Error obteniendo equipos de ${liga}:`, error);
        return [];
    }
}

app.get('/api/equipos', async (req, res) => {
    try {
        const { liga } = req.query;
        
        if (!liga) {
            return res.status(400).json({ error: "Falta parámetro: liga" });
        }

        const equipos = await obtenerEquiposDeLiga(liga);
        res.json(equipos);

    } catch (error) {
        console.error("❌ Error obteniendo equipos:", error);
        res.status(500).json({ error: "Error al obtener equipos de la liga" });
    }
});

// ======================================================
// 📌 Funciones auxiliares para análisis
// ======================================================

// Función para mapear nombres de ligas a IDs
function mapLeagueNameToId(ligaNombre) {
    const ligasMap = {
        'Premier League': 39,
        'La Liga': 140,
        'Serie A': 135,
        'Bundesliga': 78,
        'Ligue 1': 61,
        'Champions League': 2,
        'Europa League': 3,
        'Copa del Rey': 143,
        'FA Cup': 45,
        'Coppa Italia': 137,
        'DFB Pokal': 81,
        'Coupe de France': 66,
        'Saudi Pro League': 307,
        'Saudi Professional League': 307,
        'Premier Liga': 235,
        'Russian Premier League': 235,
        'Premier League Russia': 235,
        'Categoría Primera A': 239,
        'Primera A Colombia': 239,
        'Liga BetPlay': 239,
        'Liga BetPlay Dimayor': 239
    };
    return ligasMap[ligaNombre];
}

function normalizarNombreLiga(liga) {
    if (!liga) return null;
    
    // Quitar país entre paréntesis: "La Liga (Spain)" → "La Liga"
    liga = liga.replace(/\s*\(.*?\)\s*/g, '').trim();
    
    // Correcciones de nombres comunes
    const equivalencias = {
        "UEFA Champions League": "Champions League",
        "Champions League": "Champions League",
        "Primeira Liga": "Primeira Liga",
        "Liga Portugal": "Primeira Liga",
        "Premier League": "Premier League",
        "La Liga": "La Liga",
        "Serie A": "Serie A",
        "Bundesliga": "Bundesliga",
        "Ligue 1": "Ligue 1",
        "Saudi Pro League": "Saudi Pro League",
        "Saudi Professional League": "Saudi Pro League",
        "Premier Liga": "Premier Liga",
        "Russian Premier League": "Premier Liga",
        "Categoría Primera A": "Categoría Primera A",
        "Primera A Colombia": "Categoría Primera A",
        "Liga BetPlay": "Liga BetPlay Dimayor",
        "Liga BetPlay Dimayor": "Liga BetPlay Dimayor"
    };
    
    return equivalencias[liga] || liga;
}

// Función para buscar equipo por nombre
async function searchTeamByName(teamName) {
    try {
        const response = await axios.get(
            `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(teamName)}`,
            { headers: apiHeaders }
        );
        
        if (response.data.response && response.data.response.length > 0) {
            return response.data.response[0].team;
        }
        return null;
    } catch (error) {
        console.error(`Error buscando equipo ${teamName}:`, error);
        return null;
    }
}

// Función para obtener últimos partidos
async function getLastMatches(teamId, liga) {
    try {
        const ligaNormalizada = normalizarNombreLiga(liga);
        const leagueId = mapLeagueNameToId(ligaNormalizada);
        
        if (!leagueId) {
            throw new Error(`Liga "${liga}" no encontrada después de normalizar ("${ligaNormalizada}")`);
        }

        const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
            params: {
                team: teamId,
                league: leagueId,
                last: 6
            },
            headers: apiHeaders
        });
        
        return response.data.response || [];
    } catch (error) {
        console.error(`Error obteniendo partidos del equipo ${teamId}:`, error);
        return [];
    }
}

// Función para calcular estadísticas del equipo
function computeTeamStats(teamInfo, fixtures) {
    let wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0;
    
    fixtures.forEach(fix => {
        const isHome = fix.teams.home.id === teamInfo.id;
        const gf = isHome ? fix.goals.home : fix.goals.away;
        const ga = isHome ? fix.goals.away : fix.goals.home;
        
        goalsFor += gf;
        goalsAgainst += ga;
        
        if (gf > ga) wins++;
        else if (gf === ga) draws++;
        else losses++;
    });

    const games = fixtures.length || 1;
    
    return {
        teamName: teamInfo.name,
        games,
        wins,
        draws,
        losses,
        avgGoalsFor: (goalsFor / games).toFixed(2),
        avgGoalsAgainst: (goalsAgainst / games).toFixed(2),
        avgTotalGoals: ((goalsFor + goalsAgainst) / games).toFixed(2),
        bttsProb: ((fixtures.filter(f => f.goals.home > 0 && f.goals.away > 0).length / games) * 100).toFixed(0),
        over25Prob: ((fixtures.filter(f => (f.goals.home + f.goals.away) > 2.5).length / games) * 100).toFixed(0),
        resultsStrip: fixtures.map(fix => {
            const isHome = fix.teams.home.id === teamInfo.id;
            const gf = isHome ? fix.goals.home : fix.goals.away;
            const ga = isHome ? fix.goals.away : fix.goals.home;
            if (gf > ga) return "V";
            if (gf === ga) return "E";
            return "P";
        })
    };
}

// Función para calcular predicciones del partido
function computeMatchPredictions(a, b) {
    const totalGoals = ((Number(a.avgTotalGoals) + Number(b.avgTotalGoals)) / 2).toFixed(1);
    return {
        totalGoals,
        btts: ((Number(a.bttsProb) + Number(b.bttsProb)) / 2).toFixed(0),
        over25: ((Number(a.over25Prob) + Number(b.over25Prob)) / 2).toFixed(0)
    };
}

// ======================================================
// 📌 Endpoint de análisis para analisis-futbol.html
// ======================================================
app.get('/api/analizar', async (req, res) => {
    try {
        const { liga, local, visitante } = req.query;
        
        if (!liga || !local || !visitante) {
            return res.status(400).json({ error: "Faltan parámetros." });
        }

        // 1. Buscar IDs de los equipos
        const localTeam = await searchTeamByName(local);
        const awayTeam = await searchTeamByName(visitante);
        
        if (!localTeam || !awayTeam) {
            return res.status(404).json({ error: "No se encontraron los equipos." });
        }

        // 2. Obtener últimos partidos de cada equipo
        const localMatches = await getLastMatches(localTeam.id, liga);
        const awayMatches = await getLastMatches(awayTeam.id, liga);

        // 3. Calcular estadísticas
        const localStats = computeTeamStats(localTeam, localMatches);
        const awayStats = computeTeamStats(awayTeam, awayMatches);

        // 4. Calcular predicciones cruzando ambos equipos
        const predictions = computeMatchPredictions(localStats, awayStats);

        // 5. Respuesta final
        res.json({
            localTeam: localStats,
            awayTeam: awayStats,
            predictions
        });

    } catch (err) {
        logUpstream('analizar', err);
        res.status(500).json({ error: GENERIC_API_ERROR });
    }
});

// ======================================================
// 📌 Motor de Predicción
// ======================================================
const { predictionEngine } = require('./engine/predictionEngine');
// Usar getProfileWeights desde predictionConfig (predictionProfiles ahora delega allí)
const { getProfileWeights } = require('./engine/predictionConfig');
const { logPrediction } = require('./engine/loggingPredictions');
const { obtenerPrediccionesCompletas } = require('./engine/predictionHelpers');

// ======================================================
// 📌 Obtener predicciones de un partido
// ======================================================
app.get('/api/predictions', async (req, res) => {
    try {
        const { fixtureId } = req.query;
        
        if (!fixtureId) {
            return res.status(400).json({ error: "Falta parámetro: fixtureId" });
        }

        // Validar API_KEY
        if (!process.env.API_KEY) {
            console.error("❌ [PREDICTIONS] ERROR: API_KEY no está definida");
            return res.status(500).json({ 
                error: "servicio_datos_no_configurado",
                message: "Servicio de datos no disponible en este momento."
            });
        }

        // Log solo en desarrollo o si está habilitado
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOGS === 'true') {
            console.log(`📡 [PREDICTIONS] Solicitando predicciones para fixture: ${fixtureId}`);
        }

        // Obtener datos del fixture
        const fixtureResponse = await axios.get(
            `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
            { headers: apiHeaders }
        );

        if (!fixtureResponse.data.response || fixtureResponse.data.response.length === 0) {
            return res.status(404).json({ error: "Fixture no encontrado" });
        }

        const fixture = fixtureResponse.data.response[0];
        const homeTeamId = fixture.teams?.home?.id;
        const awayTeamId = fixture.teams?.away?.id;
        const leagueId = fixture.league?.id;
        const season = fixture.league?.season;

        if (!homeTeamId || !awayTeamId || !leagueId || !season) {
            return res.status(400).json({ error: "Datos incompletos del fixture" });
        }

        // Obtener estadísticas y últimos partidos de ambos equipos - CON CACHE
        const predictionCache = require('./engine/cache');
        
        // Intentar obtener desde cache
        const homeStatsCacheKey = { teamId: homeTeamId, leagueId, season, type: 'stats' };
        const awayStatsCacheKey = { teamId: awayTeamId, leagueId, season, type: 'stats' };
        const homeFixturesCacheKey = { teamId: homeTeamId, leagueId, type: 'fixtures', limit: 5 };
        const awayFixturesCacheKey = { teamId: awayTeamId, leagueId, type: 'fixtures', limit: 5 };
        
        let homeStats = predictionCache.get('teamStats', homeStatsCacheKey);
        let awayStats = predictionCache.get('teamStats', awayStatsCacheKey);
        let homeFixtures = predictionCache.get('teamFixtures', homeFixturesCacheKey);
        let awayFixtures = predictionCache.get('teamFixtures', awayFixturesCacheKey);
        
        // Obtener datos que no están en cache
        const promises = [];
        
        if (!homeStats) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/teams/statistics?team=${homeTeamId}&league=${leagueId}&season=${season}`,
                    { headers: apiHeaders }
                ).then(res => {
                    const stats = res.data.response;
                    predictionCache.set('teamStats', homeStatsCacheKey, stats, 5 * 60 * 1000); // 5 min
                    return stats;
                }).catch(() => {
                    return null;
                })
            );
        }
        
        if (!awayStats) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/teams/statistics?team=${awayTeamId}&league=${leagueId}&season=${season}`,
                    { headers: apiHeaders }
                ).then(res => {
                    const stats = res.data.response;
                    predictionCache.set('teamStats', awayStatsCacheKey, stats, 5 * 60 * 1000); // 5 min
                    return stats;
                }).catch(() => {
                    return null;
                })
            );
        }
        
        if (!homeFixtures) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/fixtures?team=${homeTeamId}&last=5&league=${leagueId}`,
                    { headers: apiHeaders }
                ).then(res => {
                    const fixtures = res.data.response || [];
                    predictionCache.set('teamFixtures', homeFixturesCacheKey, fixtures, 5 * 60 * 1000); // 5 min
                    return fixtures;
                }).catch(() => {
                    return [];
                })
            );
        }
        
        if (!awayFixtures) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/fixtures?team=${awayTeamId}&last=5&league=${leagueId}`,
                    { headers: apiHeaders }
                ).then(res => {
                    const fixtures = res.data.response || [];
                    predictionCache.set('teamFixtures', awayFixturesCacheKey, fixtures, 5 * 60 * 1000); // 5 min
                    return fixtures;
                }).catch(() => {
                    return [];
                })
            );
        }
        
        // Ejecutar promesas y obtener resultados
        const results = await Promise.all(promises);
        let resultIndex = 0;
        
        if (!homeStats) {
            homeStats = results[resultIndex++];
        }
        if (!awayStats) {
            awayStats = results[resultIndex++];
        }
        if (!homeFixtures) {
            homeFixtures = results[resultIndex++];
        }
        if (!awayFixtures) {
            awayFixtures = results[resultIndex++];
        }
        
        // Si todo estaba en cache, no se hizo ninguna llamada
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOGS === 'true') {
            if (promises.length === 0) {
                console.log(`✅ [PREDICTIONS] Datos obtenidos completamente desde cache`);
            } else {
                console.log(`📡 [PREDICTIONS] ${promises.length} llamadas a API realizadas (${4 - promises.length} desde cache)`);
            }
        }

        // ============================================
        // CALCULAR MÉTRICAS AVANZADAS
        // ============================================

        // Promedios de goles
        const homeGoalsFor = homeStats?.goals?.for?.average?.total || 0;
        const homeGoalsAgainst = homeStats?.goals?.against?.average?.total || 0;
        const awayGoalsFor = awayStats?.goals?.for?.average?.total || 0;
        const awayGoalsAgainst = awayStats?.goals?.against?.average?.total || 0;

        // xG y xGA (Expected Goals)
        // Validar disponibilidad y marcar cuando se usa fallback
        const xG_local_api = homeStats?.goals?.for?.expected?.total;
        const xGA_local_api = homeStats?.goals?.against?.expected?.total;
        const xG_visita_api = awayStats?.goals?.for?.expected?.total;
        const xGA_visita_api = awayStats?.goals?.against?.expected?.total;
        
        // Determinar si xG está disponible o se usa fallback
        const xG_local_disponible = xG_local_api !== null && xG_local_api !== undefined;
        const xGA_local_disponible = xGA_local_api !== null && xGA_local_api !== undefined;
        const xG_visita_disponible = xG_visita_api !== null && xG_visita_api !== undefined;
        const xGA_visita_disponible = xGA_visita_api !== null && xGA_visita_api !== undefined;
        
        // Usar xG de la API si está disponible, sino usar promedio de goles como estimación
        const xG_local = parseFloat(xG_local_disponible ? xG_local_api : homeGoalsFor).toFixed(2);
        const xGA_local = parseFloat(xGA_local_disponible ? xGA_local_api : homeGoalsAgainst).toFixed(2);
        const xG_visita = parseFloat(xG_visita_disponible ? xG_visita_api : awayGoalsFor).toFixed(2);
        const xGA_visita = parseFloat(xGA_visita_disponible ? xGA_visita_api : awayGoalsAgainst).toFixed(2);
        
        // Marcar fuente de xG para transparencia
        const xgSource = {
          xG_local: xG_local_disponible ? 'api' : 'estimated',
          xGA_local: xGA_local_disponible ? 'api' : 'estimated',
          xG_visita: xG_visita_disponible ? 'api' : 'estimated',
          xGA_visita: xGA_visita_disponible ? 'api' : 'estimated'
        };

        // Calcular forma reciente (últimos 5 partidos)
        const calcularForma = (fixtures, teamId) => {
            if (!Array.isArray(fixtures) || fixtures.length === 0) return { forma: "N/A", racha: 0 };
            
            // Filtrar solo partidos finalizados y ordenar por fecha (más reciente primero)
            const partidosFinalizados = fixtures
                .filter(f => f.fixture?.status?.short === 'FT' && f.goals?.home !== null && f.goals?.away !== null)
                .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
                .slice(0, 5);
            
            if (partidosFinalizados.length === 0) return { forma: "N/A", racha: 0 };
            
            let forma = "";
            let racha = 0;
            let rachaTipo = null; // 'W' para ganados consecutivos, 'U' para invicto (sin perder)

            // Calcular forma y racha desde el partido más reciente hacia atrás
            for (const fixture of partidosFinalizados) {
                const isHome = fixture.teams?.home?.id === teamId;
                const homeGoals = fixture.goals?.home;
                const awayGoals = fixture.goals?.away;
                
                if (homeGoals === null || awayGoals === null || homeGoals === undefined || awayGoals === undefined) {
                    forma += "?";
                    continue;
                }

                const gano = isHome ? (homeGoals > awayGoals) : (awayGoals > homeGoals);
                const empato = homeGoals === awayGoals;
                const perdio = isHome ? (homeGoals < awayGoals) : (awayGoals < homeGoals);

                if (gano) {
                    forma += "W";
                    if (rachaTipo === 'W' || rachaTipo === null) {
                        racha++;
                        rachaTipo = 'W';
                    } else if (rachaTipo === 'U') {
                        racha++;
                        rachaTipo = 'W';
                    } else {
                        break; // Rompe la racha
                    }
                } else if (empato) {
                    forma += "D";
                    if (rachaTipo === 'U' || rachaTipo === null) {
                        racha++;
                        rachaTipo = 'U';
                    } else if (rachaTipo === 'W') {
                        racha++;
                        rachaTipo = 'U';
                    } else {
                        break; // Rompe la racha
                    }
                } else if (perdio) {
                    forma += "L";
                    if (rachaTipo === null) {
                        racha = 0;
                        rachaTipo = 'L';
                    } else {
                        break; // Rompe la racha
                    }
                }
            }

            return { forma: forma || "N/A", racha: racha || 0 };
        };

        const formaLocal = calcularForma(homeFixtures, homeTeamId);
        const formaVisita = calcularForma(awayFixtures, awayTeamId);

        // Calcular rendimiento (porcentaje de puntos obtenidos)
        const calcularRendimiento = (stats, isHome) => {
            if (!stats) return 0;
            
            const played = isHome 
                ? (stats.fixtures?.played?.home || 0)
                : (stats.fixtures?.played?.away || 0);
            const wins = isHome
                ? (stats.fixtures?.wins?.home || 0)
                : (stats.fixtures?.wins?.away || 0);
            const draws = isHome
                ? (stats.fixtures?.draws?.home || 0)
                : (stats.fixtures?.draws?.away || 0);
            
            if (played === 0) return 0;
            const puntos = (wins * 3) + draws;
            const puntosMaximos = played * 3;
            return parseFloat((puntos / puntosMaximos) * 100).toFixed(1);
        };

        const rendimiento_local = calcularRendimiento(homeStats, true);
        const rendimiento_visita = calcularRendimiento(awayStats, false);

        // ============================================
        // CALCULAR PROMEDIO DE TIROS DE ESQUINA ESPERADOS
        // ============================================
        const { calculateExpectedCorners } = require('./engine/cornersCalculator');
        const cornersResult = calculateExpectedCorners(
            homeStats,
            awayStats,
            homeFixtures,
            awayFixtures,
            homeTeamId,
            awayTeamId
        );

        // ============================================
        // PREPARAR MÉTRICAS AVANZADAS
        // ============================================
        const metricas = {
            xG_local: parseFloat(xG_local),
            xGA_local: parseFloat(xGA_local),
            xG_visita: parseFloat(xG_visita),
            xGA_visita: parseFloat(xGA_visita),
            forma_local: formaLocal.forma,
            forma_visita: formaVisita.forma,
            racha_local: formaLocal.racha,
            racha_visita: formaVisita.racha,
            rendimiento_local: parseFloat(rendimiento_local),
            rendimiento_visita: parseFloat(rendimiento_visita),
            // Agregar información de fuente de xG para transparencia
            xgSource: xgSource,
            // Agregar promedio de corners esperados
            promedio_corners_esperados: cornersResult.expectedCorners,
            cornersSource: cornersResult.source,
            cornersDetails: cornersResult.details
        };

        // ============================================
        // CALCULAR PROMEDIOS DE LIGA (para normalización) - CON CACHE
        // ============================================
        // predictionCache ya está declarado arriba (línea 1277)
        
        // Intentar obtener desde cache
        const cacheKey = { leagueId, season };
        let leagueAverages = predictionCache.get('leagueAverages', cacheKey);
        
        if (!leagueAverages) {
            // No está en cache, calcular
            leagueAverages = {
                goalsFor: null,
                goalsAgainst: null,
                xG: null,
                xGA: null,
                source: 'fallback' // 'api', 'calculated', 'fallback'
            };
            
            try {
                // Intentar obtener últimos 10 partidos de la liga para calcular promedios reales
                const leagueFixturesResponse = await axios.get(
                    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&last=10`,
                    { headers: apiHeaders }
                ).catch(() => ({ data: { response: [] } }));
                
                const leagueFixtures = leagueFixturesResponse.data.response || [];
                
                if (leagueFixtures.length > 0) {
                    // Calcular promedios desde partidos reales de la liga
                    let totalGoalsFor = 0;
                    let totalGoalsAgainst = 0;
                    let validFixtures = 0;
                    
                    for (const fixture of leagueFixtures) {
                        if (fixture.goals?.home !== null && fixture.goals?.away !== null) {
                            totalGoalsFor += fixture.goals.home;
                            totalGoalsAgainst += fixture.goals.away;
                            validFixtures++;
                        }
                    }
                    
                    if (validFixtures > 0) {
                        // Promedio de goles por partido (suma de goles locales y visitantes)
                        const totalGoals = totalGoalsFor + totalGoalsAgainst;
                        leagueAverages.goalsFor = totalGoals / (validFixtures * 2); // Promedio por equipo
                        leagueAverages.goalsAgainst = totalGoals / (validFixtures * 2);
                        leagueAverages.source = 'calculated';
                    }
                }
            } catch (error) {
                console.log(`⚠️ [PREDICTIONS] No se pudieron obtener partidos de liga para promedios: ${error.message}`);
            }
            
            // Fallback: usar promedio de los dos equipos si no se pudieron calcular promedios reales
            if (leagueAverages.goalsFor === null) {
                leagueAverages.goalsFor = (homeGoalsFor + awayGoalsFor) / 2;
                leagueAverages.goalsAgainst = (homeGoalsAgainst + awayGoalsAgainst) / 2;
                leagueAverages.source = 'fallback';
            }
            
            // Calcular promedio de xG de la liga si ambos equipos tienen xG disponible
            if (xG_local_disponible && xG_visita_disponible) {
                leagueAverages.xG = (parseFloat(xG_local) + parseFloat(xG_visita)) / 2;
                if (leagueAverages.source === 'calculated') {
                    leagueAverages.source = 'calculated_with_xg';
                }
            }
            if (xGA_local_disponible && xGA_visita_disponible) {
                leagueAverages.xGA = (parseFloat(xGA_local) + parseFloat(xGA_visita)) / 2;
            }
            
            // Guardar en cache (10 minutos TTL)
            predictionCache.set('leagueAverages', cacheKey, leagueAverages, 10 * 60 * 1000);
        } else {
            if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOGS === 'true') {
                console.log(`✅ [PREDICTIONS] Promedios de liga obtenidos desde cache`);
            }
        }

        // ============================================
        // OBTENER PERFIL DE PREDICCIÓN
        // ============================================
        const { profile = 'balanceado' } = req.query;
        const { getProfileConfig } = require('./engine/predictionConfig');
        const profileConfig = getProfileConfig(profile);
        const weights = profileConfig.weights;
        
        // Log solo en desarrollo
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOGS === 'true') {
            console.log(`📊 [PREDICTIONS] Usando perfil: ${profile}`);
        }

        // ============================================
        // USAR MOTOR DE PREDICCIÓN
        // ============================================
        const predictionResult = predictionEngine({
            homeStats,
            awayStats,
            metricas,
            weights,
            config: profileConfig,
            leagueAverages: leagueAverages,
            usePoisson: true // Activar modelo Poisson
        });

        // ============================================
        // CONSTRUIR RESPUESTA FINAL
        // ============================================
        const predictions = {
            prob_local: predictionResult.prob_local,
            prob_empate: predictionResult.prob_empate,
            prob_visita: predictionResult.prob_visita,
            goles_local: predictionResult.goles_local,
            goles_visita: predictionResult.goles_visita,
            recomendacion: predictionResult.recomendacion,
            profile: profile, // Incluir perfil usado
            // Métricas avanzadas
            metricas_avanzadas: {
                ...metricas,
                promedio_goles_local: {
                    a_favor: parseFloat(homeGoalsFor.toFixed(2)),
                    en_contra: parseFloat(homeGoalsAgainst.toFixed(2))
                },
                promedio_goles_visita: {
                    a_favor: parseFloat(awayGoalsFor.toFixed(2)),
                    en_contra: parseFloat(awayGoalsAgainst.toFixed(2))
                },
                // Promedio de tiros de esquina esperados
                promedio_corners_esperados: cornersResult.expectedCorners,
                corners_source: cornersResult.source,
                corners_details: cornersResult.details,
                // Información sobre métodos usados
                poisson_used: predictionResult.poisson_used || false,
                xg_normalized: predictionResult.xg_normalized || false
            }
        };

        // Log solo en desarrollo
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOGS === 'true') {
            console.log(`✅ [PREDICTIONS] Predicciones generadas para fixture: ${fixtureId}`);
        }
        res.json(predictions);

    } catch (error) {
        // Log detallado solo en desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.error("❌ [PREDICTIONS] Error obteniendo predicciones:");
            console.error("   Status:", error.response?.status);
            console.error("   Status Text:", error.response?.statusText);
            console.error("   Data:", error.response?.data);
            console.error("   Error completo:", error.message);
        } else {
            // Log simplificado en producción
            console.error(`❌ [PREDICTIONS] Error para fixture ${req.query.fixtureId}: ${error.message}`);
        }
        
        logUpstream('predictions', error, { fixtureId: req.query.fixtureId });
        const statusCode = error.response?.status || 500;
        res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Comparar predicciones de dos partidos
// ======================================================
app.get('/api/predictions/compare', async (req, res) => {
    try {
        const { fixtureIdA, fixtureIdB, profile = 'balanceado' } = req.query;
        
        if (!fixtureIdA || !fixtureIdB) {
            return res.status(400).json({ error: "Faltan parámetros: fixtureIdA y fixtureIdB" });
        }

        // Validar API_KEY
        if (!process.env.API_KEY) {
            console.error("❌ [PREDICTIONS COMPARE] ERROR: API_KEY no está definida");
            return res.status(500).json({ 
                error: "servicio_datos_no_configurado",
                message: "Servicio de datos no disponible en este momento."
            });
        }

        console.log(`📡 [PREDICTIONS COMPARE] Comparando partidos: ${fixtureIdA} vs ${fixtureIdB} con perfil: ${profile}`);

        // Función auxiliar para obtener predicciones de un fixture
        const obtenerPredicciones = async (fixtureId) => {
            // Obtener datos del fixture
            const fixtureResponse = await axios.get(
                `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
                { headers: apiHeaders }
            );

            if (!fixtureResponse.data.response || fixtureResponse.data.response.length === 0) {
                throw new Error(`Fixture ${fixtureId} no encontrado`);
            }

            const fixture = fixtureResponse.data.response[0];
            const homeTeamId = fixture.teams?.home?.id;
            const awayTeamId = fixture.teams?.away?.id;
            const leagueId = fixture.league?.id;
            const season = fixture.league?.season;

            if (!homeTeamId || !awayTeamId || !leagueId || !season) {
                throw new Error(`Datos incompletos del fixture ${fixtureId}`);
            }

            // Obtener estadísticas y últimos partidos
            const [homeStatsRes, awayStatsRes, homeFixturesRes, awayFixturesRes] = await Promise.all([
                axios.get(
                    `https://v3.football.api-sports.io/teams/statistics?team=${homeTeamId}&league=${leagueId}&season=${season}`,
                    { headers: apiHeaders }
                ).catch(() => ({ data: { response: null } })),
                axios.get(
                    `https://v3.football.api-sports.io/teams/statistics?team=${awayTeamId}&league=${leagueId}&season=${season}`,
                    { headers: apiHeaders }
                ).catch(() => ({ data: { response: null } })),
                axios.get(
                    `https://v3.football.api-sports.io/fixtures?team=${homeTeamId}&last=5&league=${leagueId}`,
                    { headers: apiHeaders }
                ).catch(() => ({ data: { response: [] } })),
                axios.get(
                    `https://v3.football.api-sports.io/fixtures?team=${awayTeamId}&last=5&league=${leagueId}`,
                    { headers: apiHeaders }
                ).catch(() => ({ data: { response: [] } }))
            ]);

            const homeStats = homeStatsRes.data.response;
            const awayStats = awayStatsRes.data.response;
            const homeFixtures = homeFixturesRes.data.response || [];
            const awayFixtures = awayFixturesRes.data.response || [];

            // Calcular métricas avanzadas (reutilizar lógica del endpoint principal)
            const homeGoalsFor = homeStats?.goals?.for?.average?.total || 0;
            const homeGoalsAgainst = homeStats?.goals?.against?.average?.total || 0;
            const awayGoalsFor = awayStats?.goals?.for?.average?.total || 0;
            const awayGoalsAgainst = awayStats?.goals?.against?.average?.total || 0;

            const xG_local = parseFloat(homeStats?.goals?.for?.expected?.total || homeGoalsFor).toFixed(2);
            const xGA_local = parseFloat(homeStats?.goals?.against?.expected?.total || homeGoalsAgainst).toFixed(2);
            const xG_visita = parseFloat(awayStats?.goals?.for?.expected?.total || awayGoalsFor).toFixed(2);
            const xGA_visita = parseFloat(awayStats?.goals?.against?.expected?.total || awayGoalsAgainst).toFixed(2);

            // Calcular forma (reutilizar función del endpoint principal)
            const calcularForma = (fixtures, teamId) => {
                if (!Array.isArray(fixtures) || fixtures.length === 0) return { forma: "N/A", racha: 0 };
                
                const partidosFinalizados = fixtures
                    .filter(f => f.fixture?.status?.short === 'FT' && f.goals?.home !== null && f.goals?.away !== null)
                    .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
                    .slice(0, 5);
                
                if (partidosFinalizados.length === 0) return { forma: "N/A", racha: 0 };
                
                let forma = "";
                let racha = 0;
                let rachaTipo = null;

                for (const fixture of partidosFinalizados) {
                    const isHome = fixture.teams?.home?.id === teamId;
                    const homeGoals = fixture.goals?.home;
                    const awayGoals = fixture.goals?.away;
                    
                    if (homeGoals === null || awayGoals === null || homeGoals === undefined || awayGoals === undefined) {
                        forma += "?";
                        continue;
                    }

                    const gano = isHome ? (homeGoals > awayGoals) : (awayGoals > homeGoals);
                    const empato = homeGoals === awayGoals;
                    const perdio = isHome ? (homeGoals < awayGoals) : (awayGoals < homeGoals);

                    if (gano) {
                        forma += "W";
                        if (rachaTipo === 'W' || rachaTipo === null) {
                            racha++;
                            rachaTipo = 'W';
                        } else if (rachaTipo === 'U') {
                            racha++;
                            rachaTipo = 'W';
                        } else {
                            break;
                        }
                    } else if (empato) {
                        forma += "D";
                        if (rachaTipo === 'U' || rachaTipo === null) {
                            racha++;
                            rachaTipo = 'U';
                        } else if (rachaTipo === 'W') {
                            racha++;
                            rachaTipo = 'U';
                        } else {
                            break;
                        }
                    } else if (perdio) {
                        forma += "L";
                        if (rachaTipo === null) {
                            racha = 0;
                            rachaTipo = 'L';
                        } else {
                            break;
                        }
                    }
                }

                return { forma: forma || "N/A", racha: racha || 0 };
            };

            const formaLocal = calcularForma(homeFixtures, homeTeamId);
            const formaVisita = calcularForma(awayFixtures, awayTeamId);

            const calcularRendimiento = (stats, isHome) => {
                if (!stats) return 0;
                
                const played = isHome 
                    ? (stats.fixtures?.played?.home || 0)
                    : (stats.fixtures?.played?.away || 0);
                const wins = isHome
                    ? (stats.fixtures?.wins?.home || 0)
                    : (stats.fixtures?.wins?.away || 0);
                const draws = isHome
                    ? (stats.fixtures?.draws?.home || 0)
                    : (stats.fixtures?.draws?.away || 0);
                
                if (played === 0) return 0;
                const puntos = (wins * 3) + draws;
                const puntosMaximos = played * 3;
                return parseFloat((puntos / puntosMaximos) * 100).toFixed(1);
            };

            const rendimiento_local = calcularRendimiento(homeStats, true);
            const rendimiento_visita = calcularRendimiento(awayStats, false);

            const metricas = {
                xG_local: parseFloat(xG_local),
                xGA_local: parseFloat(xGA_local),
                xG_visita: parseFloat(xG_visita),
                xGA_visita: parseFloat(xGA_visita),
                forma_local: formaLocal.forma,
                forma_visita: formaVisita.forma,
                racha_local: formaLocal.racha,
                racha_visita: formaVisita.racha,
                rendimiento_local: parseFloat(rendimiento_local),
                rendimiento_visita: parseFloat(rendimiento_visita),
                promedio_goles_local: {
                    a_favor: parseFloat(homeGoalsFor.toFixed(2)),
                    en_contra: parseFloat(homeGoalsAgainst.toFixed(2))
                },
                promedio_goles_visita: {
                    a_favor: parseFloat(awayGoalsFor.toFixed(2)),
                    en_contra: parseFloat(awayGoalsAgainst.toFixed(2))
                }
            };

            // Obtener pesos del perfil
            const weights = getProfileWeights(profile);

            // Usar motor de predicción
            const predictionResult = predictionEngine({
                homeStats,
                awayStats,
                metricas,
                weights
            });

            return {
                fixture: {
                    id: parseInt(fixtureId),
                    homeTeam: fixture.teams?.home,
                    awayTeam: fixture.teams?.away,
                    league: fixture.league,
                    date: fixture.fixture?.date,
                },
                ...predictionResult,
                metricas_avanzadas: metricas,
                profile: profile
            };
        };

        // Obtener predicciones de ambos partidos en paralelo
        const [partidoA, partidoB] = await Promise.all([
            obtenerPredicciones(fixtureIdA),
            obtenerPredicciones(fixtureIdB)
        ]);

        console.log(`✅ [PREDICTIONS COMPARE] Comparación completada para ${fixtureIdA} vs ${fixtureIdB}`);
        res.json({
            partidoA,
            partidoB
        });

    } catch (error) {
        console.error("❌ [PREDICTIONS COMPARE] Error comparando predicciones:");
        console.error("   Status:", error.response?.status);
        console.error("   Status Text:", error.response?.statusText);
        console.error("   Data:", error.response?.data);
        console.error("   Error completo:", error.message);
        
        logUpstream('predictions_compare', error);
        const status = error.response?.status;
        res.status(status && status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Historial de predicciones de un equipo
// ======================================================
app.get('/api/predictions/history', async (req, res) => {
    try {
        const { teamId, limit = 10 } = req.query;
        
        if (!teamId) {
            return res.status(400).json({ error: "Falta parámetro: teamId" });
        }

        // Validar API_KEY
        if (!process.env.API_KEY) {
            console.error("❌ [PREDICTIONS HISTORY] ERROR: API_KEY no está definida");
            return res.status(500).json({ 
                error: "servicio_datos_no_configurado",
                message: "Servicio de datos no disponible en este momento."
            });
        }

        console.log(`📡 [PREDICTIONS HISTORY] Solicitando historial para equipo: ${teamId}`);

        // Obtener últimos partidos del equipo
        const fixturesResponse = await axios.get(
            `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=${limit}`,
            { headers: apiHeaders }
        );

        if (!fixturesResponse.data.response || fixturesResponse.data.response.length === 0) {
            return res.json([]);
        }

        const fixtures = fixturesResponse.data.response;
        const historial = [];

        // Para cada fixture, obtener predicciones (si está finalizado, incluir resultado real)
        for (const fixture of fixtures) {
            if (fixture.fixture?.status?.short !== 'FT') continue;

            const fixtureId = fixture.fixture.id;
            const leagueId = fixture.league?.id;
            const season = fixture.league?.season;
            const homeTeamId = fixture.teams?.home?.id;
            const awayTeamId = fixture.teams?.away?.id;

            if (!leagueId || !season || !homeTeamId || !awayTeamId) continue;

            try {
                // Obtener estadísticas (simplificado para historial)
                const [homeStatsRes, awayStatsRes] = await Promise.all([
                    axios.get(
                        `https://v3.football.api-sports.io/teams/statistics?team=${homeTeamId}&league=${leagueId}&season=${season}`,
                        { headers: apiHeaders }
                    ).catch(() => ({ data: { response: null } })),
                    axios.get(
                        `https://v3.football.api-sports.io/teams/statistics?team=${awayTeamId}&league=${leagueId}&season=${season}`,
                        { headers: apiHeaders }
                    ).catch(() => ({ data: { response: null } }))
                ]);

                const homeStats = homeStatsRes.data.response;
                const awayStats = awayStatsRes.data.response;

                if (!homeStats || !awayStats) continue;

                // Calcular métricas básicas
                const homeGoalsFor = homeStats?.goals?.for?.average?.total || 0;
                const homeGoalsAgainst = homeStats?.goals?.against?.average?.total || 0;
                const awayGoalsFor = awayStats?.goals?.for?.average?.total || 0;
                const awayGoalsAgainst = awayStats?.goals?.against?.average?.total || 0;

                const xG_local = parseFloat(homeStats?.goals?.for?.expected?.total || homeGoalsFor).toFixed(2);
                const xGA_local = parseFloat(homeStats?.goals?.against?.expected?.total || homeGoalsAgainst).toFixed(2);
                const xG_visita = parseFloat(awayStats?.goals?.for?.expected?.total || awayGoalsFor).toFixed(2);
                const xGA_visita = parseFloat(awayStats?.goals?.against?.expected?.total || awayGoalsAgainst).toFixed(2);

                const metricas = {
                    xG_local: parseFloat(xG_local),
                    xGA_local: parseFloat(xGA_local),
                    xG_visita: parseFloat(xG_visita),
                    xGA_visita: parseFloat(xGA_visita),
                    forma_local: "N/A",
                    forma_visita: "N/A",
                    racha_local: 0,
                    racha_visita: 0,
                    rendimiento_local: 0,
                    rendimiento_visita: 0,
                };

                // Usar motor de predicción con perfil balanceado
                const weights = getProfileWeights('balanceado');
                const predictionResult = predictionEngine({
                    homeStats,
                    awayStats,
                    metricas,
                    weights
                });

                // Determinar resultado real
                const homeGoals = fixture.goals?.home;
                const awayGoals = fixture.goals?.away;
                let resultado_real = null;
                if (homeGoals !== null && awayGoals !== null) {
                    if (homeGoals > awayGoals) {
                        resultado_real = 'W';
                    } else if (homeGoals === awayGoals) {
                        resultado_real = 'D';
                    } else {
                        resultado_real = 'L';
                    }
                }

                historial.push({
                    fixture_id: fixtureId,
                    fecha: fixture.fixture?.date,
                    homeTeam: fixture.teams?.home,
                    awayTeam: fixture.teams?.away,
                    prob_local: predictionResult.prob_local,
                    prob_empate: predictionResult.prob_empate,
                    prob_visita: predictionResult.prob_visita,
                    recomendacion: predictionResult.recomendacion,
                    resultado_real: resultado_real,
                    goles_local: homeGoals,
                    goles_visita: awayGoals,
                });
            } catch (err) {
                console.error(`Error procesando fixture ${fixtureId}:`, err);
                continue;
            }
        }

        console.log(`✅ [PREDICTIONS HISTORY] Historial generado: ${historial.length} partidos`);
        res.json(historial);

    } catch (error) {
        console.error("❌ [PREDICTIONS HISTORY] Error obteniendo historial:");
        console.error("   Status:", error.response?.status);
        console.error("   Status Text:", error.response?.statusText);
        console.error("   Data:", error.response?.data);
        console.error("   Error completo:", error.message);
        
        logUpstream('predictions_history', error);
        const status = error.response?.status;
        res.status(status && status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Exportar análisis de predicción
// ======================================================
app.get('/api/predictions/export', async (req, res) => {
    try {
        const { fixtureId, profile = 'balanceado' } = req.query;
        
        if (!fixtureId) {
            return res.status(400).json({ error: "Falta parámetro: fixtureId" });
        }

        // Validar API_KEY
        if (!process.env.API_KEY) {
            console.error("❌ [PREDICTIONS EXPORT] ERROR: API_KEY no está definida");
            return res.status(500).json({ 
                error: "servicio_datos_no_configurado",
                message: "Servicio de datos no disponible en este momento."
            });
        }

        console.log(`📡 [PREDICTIONS EXPORT] Exportando análisis para fixture: ${fixtureId}`);

        // Obtener predicciones completas usando función auxiliar
        const datosCompletos = await obtenerPrediccionesCompletas(fixtureId, profile);

        // Generar insights (simplificado, se puede mejorar con función del frontend)
        const insights = []; // Por ahora vacío, se puede agregar lógica de insights aquí

        // Estructura de exportación
        const exportData = {
            metadata: {
                fixture_id: parseInt(fixtureId),
                fecha_exportacion: new Date().toISOString(),
                profile: profile,
                version: "1.0",
            },
            fixture: datosCompletos.fixture,
            predicciones: datosCompletos.predicciones,
            metricas_avanzadas: datosCompletos.metricas_avanzadas,
            insights: insights,
            resultado_real: datosCompletos.resultadoReal,
            // Estructura preparada para CSV (array de filas)
            csv_ready: [
                {
                    fixture_id: parseInt(fixtureId),
                    prob_local: datosCompletos.predicciones.prob_local,
                    prob_empate: datosCompletos.predicciones.prob_empate,
                    prob_visita: datosCompletos.predicciones.prob_visita,
                    goles_local: datosCompletos.predicciones.goles_local,
                    goles_visita: datosCompletos.predicciones.goles_visita,
                    recomendacion: datosCompletos.predicciones.recomendacion,
                    xg_local: datosCompletos.metricas_avanzadas.xG_local,
                    xga_local: datosCompletos.metricas_avanzadas.xGA_local,
                    xg_visita: datosCompletos.metricas_avanzadas.xG_visita,
                    xga_visita: datosCompletos.metricas_avanzadas.xGA_visita,
                    rendimiento_local: datosCompletos.metricas_avanzadas.rendimiento_local,
                    rendimiento_visita: datosCompletos.metricas_avanzadas.rendimiento_visita,
                    resultado_real: datosCompletos.resultadoReal?.resultado || null,
                }
            ],
        };

        console.log(`✅ [PREDICTIONS EXPORT] Análisis exportado para fixture: ${fixtureId}`);
        res.json(exportData);

    } catch (error) {
        console.error("❌ [PREDICTIONS EXPORT] Error exportando análisis:");
        console.error("   Status:", error.response?.status);
        console.error("   Status Text:", error.response?.statusText);
        console.error("   Data:", error.response?.data);
        console.error("   Error completo:", error.message);
        
        logUpstream('predictions_export', error);
        const status = error.response?.status;
        res.status(status && status >= 400 && status < 600 ? status : 500).json({
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Rutas de Estadísticas
// ======================================================
const estadisticasRoutes = require('./routes/estadisticasRoutes.js');
app.use("/estadisticas", estadisticasRoutes);
const estadisticasTorneoRoutes = require('./routes/estadisticasTorneoRoutes.js');
app.use("/estadisticas", estadisticasTorneoRoutes);
const estadisticasAvanzadasRoutes = require('./routes/estadisticasAvanzadasRoutes.js');
app.use("/estadisticas", estadisticasAvanzadasRoutes);

// ======================================================
// 📌 Rutas de Autenticación
// ======================================================
const authRoutes = require('./routes/auth.js');
app.use('/api/auth', authRoutes);

// ======================================================
// 📌 Rutas de Apuestas
// ======================================================
const betsRoutes = require('./routes/bets.js');
app.use('/api/bets', betsRoutes);

// Simulator routes
const simulatorRoutes = require('./routes/simulator.js');
app.use('/api/simulator', simulatorRoutes);

// Favorites routes
const favoritesRoutes = require('./routes/favorites.js');
app.use('/api/favorites', favoritesRoutes);

// Stats routes
const statsRoutes = require('./routes/stats.js');
app.use('/api/stats', statsRoutes);

// Messages routes
const messagesRoutes = require('./routes/messages.js');
app.use('/api/messages', messagesRoutes);

// Admin routes
const adminRoutes = require('./routes/admin.js');
app.use('/api/admin', adminRoutes);

// ======================================================
// 📌 Rutas de Comunidad
// ======================================================
const communityRoutes = require('./routes/community.js');
app.use('/api/community', communityRoutes);

const paymentsRoutes = require('./routes/payments.js');
app.use('/api/payments', paymentsRoutes);

// ======================================================
// 📌 Rutas de Football
// ======================================================
const footballRoutes = require('./routes/footballRoutes.js');
app.use("/api", footballRoutes);
const domainCompetitionRoutes = require('./routes/domainCompetitionRoutes.js');
app.use("/api", domainCompetitionRoutes);

// ======================================================
// 📌 Rutas de Predicciones - Listar Ligas
// ======================================================
async function fetchPredictionsLeaguesList(domain = "club") {
    const domainParam = domain === "selection" ? "selection" : "club";
    let apiRows = [];

    if (process.env.API_KEY) {
        try {
            const response = await axios.get("https://v3.football.api-sports.io/leagues", {
                headers: apiHeaders,
            });
            apiRows = response.data?.response || [];
        } catch (error) {
            console.warn(
                "⚠️ [LIGAS] API masiva no disponible, usando solo catálogo:",
                error.response?.data || error.message
            );
        }
    }

    return buildPredictionsLeagues(domainParam, apiRows);
}

app.get("/api/predicciones/ligas", async (req, res) => {
    try {
        const domainParam = (req.query.domain || "club").toString().toLowerCase();
        const ligas = await fetchPredictionsLeaguesList(domainParam);
        res.json({ success: true, ligas });
    } catch (error) {
        console.error("❌ [PREDICCIONES/LIGAS] Error:", error.message);
        res.json({ success: true, ligas: buildPredictionsLeagues("club", []) });
    }
});

app.get('/api/ligas', async (req, res) => {
    try {
        const domainParam = (req.query.domain || 'club').toString().toLowerCase();
        const ligasImportantes = await fetchPredictionsLeaguesList(domainParam);

        console.log("🔍 [LIGAS] Ligas filtradas:", ligasImportantes.length);
        if (ligasImportantes.length > 0) {
            console.log(
                "🔍 [LIGAS] Primeras 3:",
                ligasImportantes.slice(0, 3).map((l) => `${l.nombre} (${l.pais})`)
            );
        }

        res.json({
            success: true,
            ligas: ligasImportantes,
        });
    } catch (error) {
        console.error("❌ [LIGAS] Error obteniendo ligas:", error.response?.data || error.message);
        const domainParam = (req.query.domain || "club").toString().toLowerCase();
        res.json({
            success: true,
            ligas: buildPredictionsLeagues(domainParam === "selection" ? "selection" : "club", []),
        });
    }
});

// ======================================================
// 📌 Rutas de Predicciones - Listar Equipos por Liga
// ======================================================
app.get('/api/ligas/:id/equipos', async (req, res) => {
    try {
        const { id } = req.params;
        const leagueId = parseInt(id, 10);
        const domainFilter = (req.query.domain || '').toString().toLowerCase();
        const seasonQuery = req.query.season ? parseInt(req.query.season, 10) : null;

        console.log(`🔍 [LIGAS/EQUIPOS] Solicitando equipos para liga ID: ${leagueId}`);

        if (!leagueId || isNaN(leagueId)) {
            console.error(`❌ [LIGAS/EQUIPOS] ID de liga inválido: ${id}`);
            return res.json({
                success: true,
                equipos: []
            });
        }

        // Aislar dominios cuando el cliente envía ?domain= (Predicciones). Sin query = comportamiento histórico.
        if (domainFilter === 'selection') {
            const meta = getCompetitionById(leagueId);
            if (!meta || meta.domain !== 'selection') {
                return res.json({ success: true, equipos: [] });
            }
        } else if (domainFilter === 'club') {
            const meta = getCompetitionById(leagueId);
            if (meta && meta.domain === 'selection') {
                return res.json({ success: true, equipos: [] });
            }
        }

        // Temporada: query param > API current > fallback por tipo de liga
        let season;
        if (seasonQuery && !Number.isNaN(seasonQuery)) {
            season = seasonQuery;
            console.log(`🔍 [LIGAS/EQUIPOS] Temporada desde query: ${season}`);
        } else {
            try {
                season = await getCurrentSeasonFromAPI(leagueId);
                console.log(`🔍 [LIGAS/EQUIPOS] Temporada obtenida de API: ${season}`);
            } catch (err) {
                const catalogMeta = getCompetitionById(leagueId);
                const today = new Date();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth() + 1;
                if (catalogMeta?.seasonMode === "calendar_year") {
                    season = currentYear;
                } else {
                    season = currentMonth >= 8 ? currentYear : currentYear - 1;
                }
                console.log(`⚠️ [LIGAS/EQUIPOS] Fallback de temporada: ${season}`);
            }
        }

        // Intentar obtener equipos con la temporada obtenida
        let response;
        try {
            response = await axios.get(
                `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`,
                { headers: apiHeaders }
            );

            console.log(`🔍 [LIGAS/EQUIPOS] Respuesta API - Status: ${response.status}`);
            console.log(`🔍 [LIGAS/EQUIPOS] Tiene response?: ${!!response.data?.response}`);
            console.log(`🔍 [LIGAS/EQUIPOS] Es array?: ${Array.isArray(response.data?.response)}`);
            console.log(`🔍 [LIGAS/EQUIPOS] Cantidad: ${response.data?.response?.length || 0}`);

            // Si no hay equipos, intentar con la temporada anterior
            if (!response.data?.response || response.data.response.length === 0) {
                console.log(`⚠️ [LIGAS/EQUIPOS] No se encontraron equipos con temporada ${season}, intentando con ${season - 1}`);
                try {
                    response = await axios.get(
                        `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season - 1}`,
                        { headers: apiHeaders }
                    );
                    console.log(`🔍 [LIGAS/EQUIPOS] Respuesta con temporada ${season - 1} - Cantidad: ${response.data?.response?.length || 0}`);
                } catch (err2) {
                    console.warn(`⚠️ [LIGAS/EQUIPOS] Error al intentar temporada anterior:`, err2.message);
                }
            }
        } catch (err) {
            console.error(`❌ [LIGAS/EQUIPOS] Error al obtener equipos con temporada ${season}:`, err.message);
            // Intentar con temporada anterior como último recurso
            try {
                response = await axios.get(
                    `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season - 1}`,
                    { headers: apiHeaders }
                );
                console.log(`🔍 [LIGAS/EQUIPOS] Respuesta con temporada ${season - 1} (fallback) - Cantidad: ${response.data?.response?.length || 0}`);
            } catch (err2) {
                throw err; // Lanzar el error original
            }
        }

        if (response.data?.response && Array.isArray(response.data.response) && response.data.response.length > 0) {
            const equipos = response.data.response
                .map(item => ({
                    id: item.team?.id,
                    nombre: item.team?.name || "Equipo desconocido",
                    logo: item.team?.logo || null,
                    pais: item.team?.country || item.country?.name || "País desconocido"
                }))
                .filter(equipo => equipo.id && equipo.nombre !== "Equipo desconocido")
                // Ordenar por nombre
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            console.log(`✅ [LIGAS/EQUIPOS] Equipos procesados: ${equipos.length}`);
            if (equipos.length > 0) {
                console.log(`🔍 [LIGAS/EQUIPOS] Primeros 3 equipos:`, equipos.slice(0, 3).map(e => e.nombre));
            }

            // Log detallado de la respuesta que se envía
            const respuestaFinal = {
                success: true,
                equipos: equipos
            };
            console.log(`📤 [LIGAS/EQUIPOS] BACKEND EQUIPOS (respuesta completa):`, JSON.stringify(respuestaFinal, null, 2));
            console.log(`📤 [LIGAS/EQUIPOS] BACKEND EQUIPOS (cantidad):`, equipos.length);
            console.log(`📤 [LIGAS/EQUIPOS] BACKEND EQUIPOS (tipo):`, typeof respuestaFinal.equipos, Array.isArray(respuestaFinal.equipos));

            res.json(respuestaFinal);
        } else {
            console.log(`⚠️ [LIGAS/EQUIPOS] La API no devolvió equipos para liga ${leagueId} con temporada ${season}`);
            res.json({
                success: true,
                equipos: []
            });
        }

    } catch (error) {
        console.error("❌ [LIGAS/EQUIPOS] Error obteniendo equipos de liga:", error.response?.data || error.message);
        console.error("❌ [LIGAS/EQUIPOS] Stack:", error.stack);
        // Siempre devolver success: true con array vacío para no romper el frontend
        res.json({
            success: true,
            equipos: []
        });
    }
});

// ======================================================
// 📌 Rutas de Predicciones - Búsqueda de Equipos (DEPRECADO - Mantener por compatibilidad)
// ======================================================
app.get('/api/equipos', async (req, res) => {
    try {
        const { search } = req.query;
        
        if (!search || search.length < 3) {
            return res.json({
                success: true,
                equipos: []
            });
        }

        const response = await axios.get(
            `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(search)}`,
            { headers: apiHeaders }
        );

        if (response.data?.response && Array.isArray(response.data.response)) {
            const equipos = response.data.response.slice(0, 10).map(item => ({
                id: item.team?.id,
                nombre: item.team?.name,
                liga: item.league?.name || "Liga desconocida",
                pais: item.country?.name || item.team?.country || "País desconocido",
                logo: item.team?.logo || null
            })).filter(e => e.id && e.nombre);

            res.json({
                success: true,
                equipos: equipos
            });
        } else {
            res.json({
                success: true,
                equipos: []
            });
        }

    } catch (error) {
        console.error("❌ Error buscando equipos:", error.response?.data || error);
        res.status(500).json({
            success: false,
            error: "Error al buscar equipos",
            equipos: []
        });
    }
});

// ======================================================
// 📌 Rutas de Predicciones - Detalle de Equipo
// ======================================================
// Función auxiliar para escribir logs en archivo (para debugging)
const fs = require('fs');
// Nota: 'path' ya está declarado al inicio del archivo (línea 4)
const logFile = path.join(__dirname, 'logs-equipos-detalle.txt');

function escribirLog(mensaje) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${mensaje}\n`;
    try {
        fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (err) {
        // Si falla escribir en archivo, no hacer nada (no es crítico)
    }
    // También mostrar en consola
    console.log(mensaje);
}

app.get('/api/equipos/:id/detalle', async (req, res) => {
    try {
        // Limpiar archivo de log al inicio de cada petición (para debugging)
        try {
            fs.writeFileSync(logFile, '', 'utf8');
        } catch (err) {}
        
        const { id } = req.params;
        const { leagueId: leagueIdQuery, season: seasonQuery } = req.query;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Falta parámetro: id"
            });
        }

        // Obtener información básica del equipo
        const teamResponse = await axios.get(
            `https://v3.football.api-sports.io/teams?id=${id}`,
            { headers: apiHeaders }
        );

        if (!teamResponse.data?.response || teamResponse.data.response.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Equipo no encontrado"
            });
        }

        const teamData = teamResponse.data.response[0];
        const teamId = teamData.team?.id;
        
        // Determinar leagueId: primero del query param, luego del teamData, luego de últimos partidos
        let leagueId = leagueIdQuery ? parseInt(leagueIdQuery, 10) : null;
        
        if (!leagueId) {
            // Fallback 1: Intentar obtener de teamData
            leagueId = teamData.league?.id;
        }
        
        escribirLog(`📌 [EQUIPOS/DETALLE] TeamId: ${teamId}, LeagueId inicial: ${leagueId}`);

        // Obtener últimos partidos primero (para poder obtener leagueId si no lo tenemos)
        let ultimosPartidos = [];
        let fixturesRaw = [];
        try {
            const fixturesResponse = await axios.get(
                `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5`,
                { headers: apiHeaders }
            );
            
            if (fixturesResponse.data?.response && Array.isArray(fixturesResponse.data.response)) {
                fixturesRaw = fixturesResponse.data.response;
                
                // Fallback 2: Si aún no tenemos leagueId, intentar obtenerlo del primer partido
                if (!leagueId && fixturesRaw.length > 0 && fixturesRaw[0].league?.id) {
                    leagueId = fixturesRaw[0].league.id;
                    escribirLog(`📌 [EQUIPOS/DETALLE] LeagueId obtenido de últimos partidos: ${leagueId}`);
                }
                
                ultimosPartidos = fixturesRaw.map(fixture => {
                    const homeGoals = fixture.goals?.home || 0;
                    const awayGoals = fixture.goals?.away || 0;
                    const isHome = fixture.teams?.home?.id === teamId;
                    const equipoGoles = isHome ? homeGoals : awayGoals;
                    const rivalGoles = isHome ? awayGoals : homeGoals;
                    
                    let resultado = "E";
                    if (equipoGoles > rivalGoles) resultado = "G";
                    else if (equipoGoles < rivalGoles) resultado = "P";
                    
                    return {
                        resultado: resultado,
                        golesFavor: equipoGoles,
                        golesContra: rivalGoles,
                        fixtureId: fixture.fixture?.id // Guardar ID para obtener estadísticas
                    };
                });
            }
        } catch (fixturesError) {
            console.warn(`⚠️ No se pudieron obtener últimos partidos para equipo ${teamId}:`, fixturesError.message);
        }

        // Obtener estadísticas detalladas de los últimos partidos (shots, xG, xGA)
        let tirosAlArcoTotal = 0;
        let tirosAlArcoPromedio = null;
        let tirosEnContraTotal = 0;
        let tirosEnContraPromedio = null;
        let xGTotal = 0;
        let xGATotal = 0; // xGA = Expected Goals Against (del rival)
        let xGAPromedio = null;
        let partidosConEstadisticas = 0;

        escribirLog(`📊 [EQUIPOS/DETALLE] FixturesRaw length: ${fixturesRaw.length}`);
        
        if (fixturesRaw.length > 0) {
            escribirLog(`📡 [EQUIPOS/DETALLE] Obteniendo estadísticas detalladas de ${fixturesRaw.length} partidos recientes...`);
            
            // Obtener estadísticas de cada fixture (con delay para evitar rate limiting)
            for (let i = 0; i < fixturesRaw.length; i++) {
                const fixture = fixturesRaw[i];
                const fixtureId = fixture.fixture?.id;
                
                if (!fixtureId) continue;
                
                try {
                    // Delay entre peticiones para evitar rate limiting
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                    
                    const statsResponse = await axios.get(
                        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
                        { headers: apiHeaders }
                    );
                    
                    if (statsResponse.data?.response && Array.isArray(statsResponse.data.response)) {
                        // Buscar estadísticas del equipo (puede ser home o away)
                        const isHome = fixture.teams?.home?.id === teamId;
                        const teamStats = statsResponse.data.response.find(s => 
                            (isHome && s.team?.id === fixture.teams?.home?.id) ||
                            (!isHome && s.team?.id === fixture.teams?.away?.id)
                        );
                        const rivalStats = statsResponse.data.response.find(s => 
                            (isHome && s.team?.id === fixture.teams?.away?.id) ||
                            (!isHome && s.team?.id === fixture.teams?.home?.id)
                        );
                        
                        if (teamStats && teamStats.statistics) {
                            // Extraer shots on goal
                            const shotsOnGoal = teamStats.statistics.find(s => 
                                s.type === 'Shots on Goal' || s.type === 'Shots on Target'
                            );
                            if (shotsOnGoal && shotsOnGoal.value !== null) {
                                tirosAlArcoTotal += parseInt(shotsOnGoal.value) || 0;
                            }
                            
                            // Extraer total shots
                            const totalShots = teamStats.statistics.find(s => 
                                s.type === 'Total Shots' || s.type === 'Shots Total'
                            );
                            
                            // Extraer xG
                            const xG = teamStats.statistics.find(s => 
                                s.type === 'Expected Goals' || s.type === 'expected_goals'
                            );
                            if (xG && xG.value !== null) {
                                const xGValue = parseFloat(xG.value) || 0;
                                xGTotal += xGValue;
                            }
                            
                            // Extraer xGA desde el rival (expected goals del equipo contrario = goles esperados en contra)
                            if (rivalStats && rivalStats.statistics) {
                                const xGA = rivalStats.statistics.find(s => 
                                    s.type === 'Expected Goals' || s.type === 'expected_goals'
                                );
                                if (xGA && xGA.value !== null) {
                                    const xGAValue = parseFloat(xGA.value) || 0;
                                    xGATotal += xGAValue; // xGA = goles esperados del rival (lo que recibimos)
                                }
                            }
                            
                            // Extraer shots recibidos desde el rival
                            if (rivalStats && rivalStats.statistics) {
                                const shotsOnGoalRival = rivalStats.statistics.find(s => 
                                    s.type === 'Shots on Goal' || s.type === 'Shots on Target'
                                );
                                if (shotsOnGoalRival && shotsOnGoalRival.value !== null) {
                                    tirosEnContraTotal += parseInt(shotsOnGoalRival.value) || 0;
                                }
                            }
                            
                            partidosConEstadisticas++;
                        }
                    }
                } catch (statsError) {
                    escribirLog(`⚠️ No se pudieron obtener estadísticas del fixture ${fixtureId}: ${statsError.message}`);
                    // Continuar con el siguiente fixture
                }
            }
            
            // Calcular promedios
            if (partidosConEstadisticas > 0) {
                tirosAlArcoPromedio = (tirosAlArcoTotal / partidosConEstadisticas).toFixed(1);
                tirosEnContraPromedio = (tirosEnContraTotal / partidosConEstadisticas).toFixed(1);
                xGAPromedio = (xGATotal / partidosConEstadisticas).toFixed(2); // xGA = promedio de xG del rival
                
                escribirLog(`✅ [EQUIPOS/DETALLE] Estadísticas de partidos: ${partidosConEstadisticas} partidos procesados`);
                escribirLog(`📊 [EQUIPOS/DETALLE] Promedios: tirosAlArco=${tirosAlArcoPromedio}, tirosEnContra=${tirosEnContraPromedio}, xG=${(xGTotal / partidosConEstadisticas).toFixed(2)}, xGA=${xGAPromedio}`);
            } else {
                escribirLog(`⚠️ [EQUIPOS/DETALLE] No se pudieron obtener estadísticas de ningún partido`);
            }
        }

        // Determinar season: primero del query param, luego calcular con getCurrentSeasonFromAPI, luego manual
        let season = seasonQuery ? parseInt(seasonQuery, 10) : null;
        
        if (!season && leagueId) {
            try {
                season = await getCurrentSeasonFromAPI(leagueId);
                escribirLog(`📌 [EQUIPOS/DETALLE] Season obtenida de API: ${season} para liga ${leagueId}`);
            } catch (seasonError) {
                console.warn(`⚠️ No se pudo obtener season de API para liga ${leagueId}, usando cálculo manual:`, seasonError.message);
                // Fallback: calcular temporada manualmente
                const today = new Date();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth() + 1;
                season = currentMonth >= 8 ? currentYear : currentYear - 1;
            }
        } else if (!season) {
            // Si no hay leagueId, calcular temporada manualmente
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth() + 1;
            season = currentMonth >= 8 ? currentYear : currentYear - 1;
        }
        
        escribirLog(`📌 [EQUIPOS/DETALLE] Season final: ${season}, LeagueId final: ${leagueId}`);

        // Obtener estadísticas del equipo en su liga
        let estadisticas = null;
        if (leagueId) {
            try {
                escribirLog(`📡 [EQUIPOS/DETALLE] Solicitando estadísticas: team=${teamId}&league=${leagueId}&season=${season}`);
                const statsResponse = await axios.get(
                    `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
                    { headers: apiHeaders }
                );
                // La API devuelve los datos directamente en response, no en response[0]
                estadisticas = statsResponse.data?.response || null;
                escribirLog(`✅ [EQUIPOS/DETALLE] Estadísticas obtenidas: ${estadisticas ? 'Sí' : 'No'}`);
                if (estadisticas) {
                    escribirLog(`📊 [EQUIPOS/DETALLE] Estructura: tiene goals=${!!estadisticas.goals}, tiene fixtures=${!!estadisticas.fixtures}`);
                    escribirLog(`📊 [EQUIPOS/DETALLE] Keys de estadisticas: ${Object.keys(estadisticas).join(', ')}`);
                }
            } catch (statsError) {
                escribirLog(`⚠️ No se pudieron obtener estadísticas para equipo ${teamId}: ${statsError.message}`);
                if (statsError.response) {
                    escribirLog(`⚠️ Status: ${statsError.response.status}, Data: ${JSON.stringify(statsError.response.data)}`);
                }
            }
        } else {
            escribirLog(`⚠️ [EQUIPOS/DETALLE] No se puede obtener estadísticas: falta leagueId`);
        }

        // Procesar estadísticas
        // La estructura de la API es: response.goals, response.fixtures (no response.statistics[0])
        const stats = estadisticas || {};
        const fixtures = estadisticas?.fixtures || {};
        
        // Calcular promedios
        const partidosJugados = fixtures.played?.total || 0;
        const golesFavor = stats.goals?.for?.total?.total || 0;
        const golesContra = stats.goals?.against?.total?.total || 0;
        const promedioGolesFavor = partidosJugados > 0 ? golesFavor / partidosJugados : 0;
        const promedioGolesContra = partidosJugados > 0 ? golesContra / partidosJugados : 0;

        // Obtener posición en la tabla (si está disponible)
        let posicion = null;
        let puntos = null;
        if (leagueId) {
            try {
                escribirLog(`📡 [EQUIPOS/DETALLE] Solicitando standings: league=${leagueId}&season=${season}`);
                const standingsResponse = await axios.get(
                    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
                    { headers: apiHeaders }
                );
                
                if (standingsResponse.data?.response?.[0]?.league?.standings?.[0]) {
                    const standings = standingsResponse.data.response[0].league.standings[0];
                    const equipoStanding = standings.find(s => s.team?.id === teamId);
                    if (equipoStanding) {
                        posicion = equipoStanding.rank || null;
                        puntos = equipoStanding.points || null;
                        escribirLog(`✅ [EQUIPOS/DETALLE] Posición obtenida: ${posicion}, Puntos: ${puntos}`);
                    } else {
                        escribirLog(`⚠️ [EQUIPOS/DETALLE] Equipo ${teamId} no encontrado en standings`);
                    }
                } else {
                    escribirLog(`⚠️ [EQUIPOS/DETALLE] No se encontraron standings en la respuesta`);
                }
            } catch (standingsError) {
                escribirLog(`⚠️ No se pudo obtener posición en tabla para equipo ${teamId}: ${standingsError.message}`);
                if (standingsError.response) {
                    escribirLog(`⚠️ Status: ${standingsError.response.status}, Data: ${JSON.stringify(standingsError.response.data)}`);
                }
            }
        } else {
            escribirLog(`⚠️ [EQUIPOS/DETALLE] No se puede obtener standings: falta leagueId`);
        }

        const equipoDetalle = {
            id: teamId,
            nombre: teamData.team?.name || "Equipo desconocido",
            liga: teamData.league?.name || "Liga desconocida",
            pais: teamData.country?.name || teamData.team?.country || "País desconocido",
            logo: teamData.team?.logo || null,
            posicion: posicion,
            puntos: puntos,
            golesFavor: golesFavor,
            golesContra: golesContra,
            promedioGolesFavor: promedioGolesFavor,
            promedioGolesContra: promedioGolesContra,
            ultimosPartidos: ultimosPartidos,
            estadisticasOfensivas: {
                // Datos obtenidos de los últimos 5 partidos (fixtures/statistics)
                tirosAlArco: partidosConEstadisticas > 0 ? tirosAlArcoTotal : null,
                tirosAlArcoPromedio: tirosAlArcoPromedio ? parseFloat(tirosAlArcoPromedio) : null,
                xG: partidosConEstadisticas > 0 ? parseFloat((xGTotal / partidosConEstadisticas).toFixed(2)) : null
            },
            estadisticasDefensivas: {
                // Datos obtenidos de los últimos 5 partidos (fixtures/statistics)
                tirosEnContra: partidosConEstadisticas > 0 ? tirosEnContraTotal : null,
                tirosEnContraPromedio: tirosEnContraPromedio ? parseFloat(tirosEnContraPromedio) : null,
                xGA: xGAPromedio ? parseFloat(xGAPromedio) : null
            }
        };

        // Incluir información de debugging en la respuesta (temporalmente)
        const debugInfo = {
            leagueIdRecibido: leagueIdQuery,
            leagueIdFinal: leagueId,
            seasonRecibida: seasonQuery,
            seasonFinal: season,
            tieneEstadisticas: estadisticas !== null,
            tienePosicion: posicion !== null,
            tienePuntos: puntos !== null,
            estructuraEstadisticas: estadisticas ? {
                tieneGoals: !!estadisticas.goals,
                tieneFixtures: !!estadisticas.fixtures,
                keys: Object.keys(estadisticas)
            } : null
        };

        res.json({
            success: true,
            equipo: equipoDetalle,
            debug: debugInfo // Temporal: para debugging
        });

    } catch (error) {
        console.error("❌ Error obteniendo detalle del equipo:", error.response?.data || error);
        logUpstream('equipo_detalle', error);
        res.status(500).json({
            success: false,
            error: GENERIC_API_ERROR,
        });
    }
});

// ======================================================
// 📌 Rutas de Noticias
// ======================================================
app.get('/api/news', async (req, res) => {
    try {
        if (!process.env.API_KEY) {
            return res.status(500).json({
                error: 'servicio_datos_no_configurado',
                message: 'Servicio de datos no configurado.',
            });
        }

        const { league, team, page = 1 } = req.query;
        const ligasPrincipales = [39, 140, 135, 78, 61, 2, 307, 239];
        let todasLasNoticias = [];
        const maxNoticias = 20;

        if (league || team) {
            const params = [];
            if (league) params.push(`league=${league}`);
            if (team) params.push(`team=${team}`);
            if (page) params.push(`page=${page}`);

            const url =
                params.length > 0
                    ? `https://v3.football.api-sports.io/news?${params.join('&')}`
                    : 'https://v3.football.api-sports.io/news';

            const response = await axios.get(url, { headers: apiHeaders });
            if (Array.isArray(response.data?.response)) {
                todasLasNoticias = response.data.response.slice(0, maxNoticias);
            }
        } else {
            for (const leagueId of ligasPrincipales) {
                if (todasLasNoticias.length >= maxNoticias) break;

                try {
                    const response = await axios.get(
                        `https://v3.football.api-sports.io/news?league=${leagueId}`,
                        { headers: apiHeaders }
                    );

                    if (Array.isArray(response.data?.response)) {
                        const espacio = maxNoticias - todasLasNoticias.length;
                        todasLasNoticias.push(...response.data.response.slice(0, espacio));
                    }
                } catch (leagueError) {
                    logUpstream('news_league', leagueError, { leagueId });
                }
            }
        }
        
        // Ordenar noticias por fecha (más recientes primero)
        todasLasNoticias.sort((a, b) => {
            const fechaA = new Date(a.date || a.publishedAt || 0);
            const fechaB = new Date(b.date || b.publishedAt || 0);
            return fechaB - fechaA;
        });
        
        // Limitar a máximo 20 noticias
        const noticiasFinales = todasLasNoticias.slice(0, maxNoticias);
        
        res.json({
            response: noticiasFinales,
            results: noticiasFinales.length,
            message: noticiasFinales.length > 0 
                ? `Se encontraron ${noticiasFinales.length} noticias` 
                : "No hay noticias disponibles en este momento"
        });

    } catch (error) {
        logUpstream('news', error);
        return res.status(error.response?.status || 500).json({
            error: true,
            message: GENERIC_API_ERROR,
            response: [],
            results: 0,
        });
    }
});

// ======================================================
// 📌 Standings por liga (TEMPORADA ACTUAL + FALLBACK)
// ======================================================
// Esta ruta debe estar DESPUÉS de footballRoutes para que /api/league/seasons se maneje primero
app.get('/api/league/:leagueId', async (req, res) => {
    try {
        const { leagueId } = req.params;

        const currentSeason = await getCurrentSeasonFromAPI(leagueId);

        console.log(`📊 Intentando standings de temporada actual: ${currentSeason}`);

        let response = await axios.get(
            `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${currentSeason}`,
            { headers: apiHeaders }
        );

        let data = response.data;

        if (!data.response || data.response.length === 0) {
            console.log("⚠️ No hay standings para la temporada actual. Usando temporada anterior…");

            const fallbackSeason = currentSeason - 1;

            response = await axios.get(
                `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${fallbackSeason}`,
                { headers: apiHeaders }
            );

            data = response.data;

            return res.json({
                seasonUsed: fallbackSeason,
                response: data.response
            });
        }

        res.json({
            seasonUsed: currentSeason,
            response: data.response
        });

    } catch (error) {
        console.error("❌ Error obteniendo standings:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener standings" });
    }
});

// ======================================================
// 📌 MÓDULO DE JUGADORES - Nuevas rutas
// ======================================================

// A) Obtener lista de jugadores por equipo
app.get('/api/jugadores/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        
        if (!teamId) {
            return res.status(400).json({ error: "Falta parámetro: teamId" });
        }

        // Calcular temporada actual
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const season = currentMonth >= 8 ? currentYear : currentYear - 1;

        const response = await axios.get(
            `https://v3.football.api-sports.io/players?team=${teamId}&season=${season}`,
            { headers: apiHeaders }
        );

        // Formatear respuesta para incluir solo los datos necesarios
        if (response.data.response && Array.isArray(response.data.response)) {
            const jugadores = response.data.response.map(player => ({
                id: player.player?.id,
                nombre: player.player?.name,
                foto: player.player?.photo,
                edad: player.player?.age,
                nacionalidad: player.player?.nationality,
                posicion: player.statistics?.[0]?.games?.position || player.player?.position,
                numero: player.statistics?.[0]?.games?.number,
                estatus: player.player?.injured ? "Lesionado" : "Disponible"
            })).filter(p => p.id); // Filtrar jugadores sin ID

            res.json({ response: jugadores });
        } else {
            res.json({ response: [] });
        }

    } catch (error) {
        console.error("❌ Error obteniendo jugadores:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener jugadores del equipo" });
    }
});

// B) Obtener información completa de un jugador
app.get('/api/jugador/:playerId', async (req, res) => {
    try {
        const { playerId } = req.params;
        
        if (!playerId) {
            return res.status(400).json({ error: "Falta parámetro: playerId" });
        }

        // Calcular temporada actual
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const season = currentMonth >= 8 ? currentYear : currentYear - 1;

        const response = await axios.get(
            `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo información del jugador:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener información del jugador" });
    }
});

// C) Obtener últimos partidos del jugador
app.get('/api/jugador/:playerId/partidos', async (req, res) => {
    try {
        const { playerId } = req.params;
        
        if (!playerId) {
            return res.status(400).json({ error: "Falta parámetro: playerId" });
        }

        // Calcular temporada actual
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const season = currentMonth >= 8 ? currentYear : currentYear - 1;

        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures/players?player=${playerId}&season=${season}`,
            { headers: apiHeaders }
        );

        res.json(response.data);

    } catch (error) {
        console.error("❌ Error obteniendo partidos del jugador:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener partidos del jugador" });
    }
});

app.use((err, req, res, next) => {
    const log = require('./utils/logger');
    log.critical('express_unhandled_error', {
        message: err.message,
        stack: err.stack,
    });
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
        });
    }
});

// ======================================================
// 📌 Rutas API no definidas → JSON (nunca HTML)
// ======================================================
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
  });
});

// ======================================================
// 📌 Frontend SPA (después de TODAS las rutas de API)
// ======================================================
// Producción: FRONTEND_DIST=dist (relativo a la raíz del proyecto) o ruta absoluta.
// Por defecto: build de Vite en frontend/build.
const FRONTEND_DIST = process.env.FRONTEND_DIST
    ? path.resolve(__dirname, process.env.FRONTEND_DIST)
    : path.join(__dirname, 'frontend', 'build');

app.use(
  express.static(FRONTEND_DIST, {
    maxAge: '30d',
    etag: true,
    immutable: true,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// ======================================================
// 📌 Fallback SPA (React Router) — solo rutas no /api
// ======================================================
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'Ruta no encontrada',
        });
    }
    const fs = require('fs');
    const indexPath = path.join(FRONTEND_DIST, 'index.html');
    if (!fs.existsSync(indexPath)) {
        return res.status(404).type('text/plain').send('index.html no encontrado (ejecuta npm run build en frontend o ajusta FRONTEND_DIST)');
    }
    res.sendFile(indexPath);
});

// ======================================================
// 🚀 Iniciar servidor
// ======================================================
// Intentar conectar a MongoDB, pero iniciar el servidor de todas formas
connectToMongoDB().then(() => {
    console.log('✅ MongoDB conectado, iniciando servidor...');
    startServer();
}).catch((error) => {
    console.warn('⚠️ MongoDB no disponible, pero iniciando servidor de todas formas...');
    console.warn('⚠️ Algunas funcionalidades que requieren MongoDB pueden no estar disponibles');
    startServer();
});

function startServer() {
    const metrics = require('./utils/metrics');
    metrics.persistSync();

    const liga235 = getCompetitionById(235);
    const liga239 = getCompetitionById(239);
    console.log(
        `[catalog] 235=${liga235?.name ?? 'N/D'} (${liga235?.country ?? '?'}) · 239=${liga239?.name ?? 'N/D'} (${liga239?.country ?? '?'})`
    );

    app.listen(PORT, () => {
        const deployRef =
            process.env.RENDER_GIT_COMMIT ||
            process.env.RENDER_COMMIT ||
            process.env.VERCEL_GIT_COMMIT_SHA ||
            'local';
        console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
        console.log(`📦 Deploy ref: ${deployRef}`);
        console.log(`📡 Rutas clave:`);
        console.log(`   - GET /api/health`);
        console.log(`   - POST /api/payments/create-checkout-session`);
        console.log(`   - POST /api/payments/webhook`);
        console.log(`   - GET /api/leagues`);
        console.log(`   - GET /estadisticas/torneo?leagueId=X&season=Y`);
        console.log(`   - GET /api/players/topscorers?leagueId=X&season=Y`);
        console.log(`   - GET /api/team-info/:teamId`);
    });
}