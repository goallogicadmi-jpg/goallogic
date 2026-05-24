# API de Predicciones - Documentación

## Endpoint: `/api/predictions`

Obtiene predicciones de un partido específico usando el motor de predicciones avanzado.

### Método
`GET`

### Parámetros de Query

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fixtureId` | number | ✅ Sí | ID del fixture (partido) a predecir |
| `profile` | string | ❌ No | Perfil de predicción. Valores: `conservador`, `balanceado`, `agresivo`. Default: `balanceado` |

### Ejemplo de Request

```bash
GET /api/predictions?fixtureId=123456&profile=balanceado
```

### Respuesta Exitosa (200 OK)

```json
{
  "fixture": {
    "id": 123456,
    "date": "2024-01-15T20:00:00Z",
    "venue": {
      "name": "Stadium Name",
      "city": "City Name"
    },
    "status": {
      "long": "Match Finished",
      "short": "FT"
    },
    "teams": {
      "home": {
        "id": 50,
        "name": "Team Home",
        "logo": "https://..."
      },
      "away": {
        "id": 51,
        "name": "Team Away",
        "logo": "https://..."
      }
    },
    "league": {
      "id": 39,
      "name": "Premier League",
      "season": 2024
    },
    "goals": {
      "home": 2,
      "away": 1
    }
  },
  "prediction": {
    "prob_local": 0.45,
    "prob_empate": 0.28,
    "prob_visita": 0.27,
    "goles_local": 1.8,
    "goles_visita": 1.5,
    "recomendacion": "Victoria Local",
    "profile": "balanceado"
  },
  "metricas_avanzadas": {
    "xG_local": 1.65,
    "xGA_local": 1.20,
    "xG_visita": 1.45,
    "xGA_visita": 1.35,
    "forma_local": "WWDLW",
    "forma_visita": "LDWDL",
    "racha_local": 3,
    "racha_visita": 1,
    "rendimiento_local": 68.5,
    "rendimiento_visita": 52.3,
    "promedio_goles_local": {
      "a_favor": 1.85,
      "en_contra": 1.15
    },
    "promedio_goles_visita": {
      "a_favor": 1.50,
      "en_contra": 1.40
    },
    "xgSource": {
      "xG_local": "api",
      "xGA_local": "api",
      "xG_visita": "estimated",
      "xGA_visita": "estimated"
    },
    "poisson_used": true,
    "xg_normalized": true
  }
}
```

### Campos de la Respuesta

#### `prediction`
- `prob_local` (number): Probabilidad de victoria local (0-1)
- `prob_empate` (number): Probabilidad de empate (0-1)
- `prob_visita` (number): Probabilidad de victoria visitante (0-1)
- `goles_local` (number): Goles esperados del equipo local
- `goles_visita` (number): Goles esperados del equipo visitante
- `recomendacion` (string): Recomendación basada en las probabilidades
- `profile` (string): Perfil usado para la predicción

#### `metricas_avanzadas`
- `xG_local`, `xGA_local`, `xG_visita`, `xGA_visita` (number): Expected Goals
- `forma_local`, `forma_visita` (string): Forma reciente (W=Victoria, D=Empate, L=Derrota)
- `racha_local`, `racha_visita` (number): Partidos consecutivos sin perder
- `rendimiento_local`, `rendimiento_visita` (number): Porcentaje de puntos obtenidos
- `promedio_goles_local`, `promedio_goles_visita` (object): Promedios de goles
- `xgSource` (object): Fuente de xG/xGA (`api` o `estimated`)
- `poisson_used` (boolean): Indica si se usó modelo Poisson
- `xg_normalized` (boolean): Indica si se usó normalización basada en liga

### Errores Posibles

#### 400 Bad Request
```json
{
  "error": "Falta parámetro: fixtureId"
}
```

#### 404 Not Found
```json
{
  "error": "Fixture no encontrado"
}
```

#### 500 Internal Server Error
```json
{
  "error": "API_KEY no configurada",
  "message": "La API_KEY no está disponible en el servidor"
}
```

### Notas

- Las probabilidades siempre suman 1.0 (100%)
- Los goles esperados se calculan usando modelo Poisson cuando está disponible
- El xG puede ser estimado si la API no lo provee (se indica en `xgSource`)
- El cache reduce llamadas a la API para mejorar rendimiento
- Los promedios de liga se calculan desde últimos 10 partidos cuando están disponibles

### Ejemplos de Uso

#### JavaScript (Fetch)
```javascript
const response = await fetch('/api/predictions?fixtureId=123456&profile=balanceado');
const data = await response.json();
console.log('Probabilidad Local:', data.prediction.prob_local * 100 + '%');
```

#### cURL
```bash
curl "http://localhost:3000/api/predictions?fixtureId=123456&profile=balanceado"
```

#### Axios
```javascript
const axios = require('axios');
const response = await axios.get('/api/predictions', {
  params: {
    fixtureId: 123456,
    profile: 'balanceado'
  }
});
console.log(response.data.prediction);
```
