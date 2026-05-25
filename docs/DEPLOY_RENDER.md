# Deploy backend en Render

## Estructura del repo

- **Backend:** raíz del proyecto (`server.js`, `package.json`, `routes/`)
- **Frontend:** carpeta `frontend/` (Vercel; no es el entry de Render)

No hay otro `server.js` ni backend en subcarpetas.

## Configuración obligatoria en Render (Dashboard → Settings)

| Campo | Valor correcto |
|--------|----------------|
| **Root Directory** | vacío o `.` (raíz del repo) |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` (equivale a `node server.js`) |
| **Health Check Path** | `/api/health` |

No uses `node index.js` — ese archivo fue eliminado; el entry es `server.js` (`package.json` → `"main": "server.js"`).

## Tras cambios de código

1. Push a `main` en `goallogicadmi-jpg/goallogic`
2. En Render: **Manual Deploy** → **Clear build cache & deploy**
3. En logs de arranque debe aparecer:
   - `Deploy ref: fb76754...` (o el commit actual)
   - `GET /api/health`
   - `POST /api/payments/create-checkout-session`
4. Probar: `https://goallogic.onrender.com/api/health`  
   Debe incluir `"stripe": { "secretKeyMode": "live", ... }`

## Variables de entorno Stripe (producción)

- `STRIPE_SECRET_KEY` → `sk_live_...`
- `STRIPE_PRICE_ID` → `price_1Tb3eiE8KSBWzWIREl5xnpiW`
- `STRIPE_SUCCESS_URL` → `https://goallogic.vercel.app/pago-exitoso`
- `STRIPE_CANCEL_URL` → `https://goallogic.vercel.app/pago-cancelado`

En **Stripe Dashboard (LIVE)** → Developers → Checkout → Settings → **Allowed redirect URLs**, añade exactamente:

- `https://goallogic.vercel.app/pago-exitoso`
- `https://goallogic.vercel.app/pago-cancelado`

Tras cambiar variables en Render: **Save** y **Manual Deploy** (o reinicio). Comprueba en `/api/health` que `stripe.successUrl` y `stripe.cancelUrl` muestran esas rutas.
- `STRIPE_WEBHOOK_SECRET` → `whsec_...` (LIVE del Dashboard)
