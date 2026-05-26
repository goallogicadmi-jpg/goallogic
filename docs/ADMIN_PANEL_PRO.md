# Admin Panel PRO — estructura

## Rutas frontend (`/admin/*`)

| Ruta | Módulo | Estado |
|------|--------|--------|
| `/admin/dashboard` | Dashboard | Implementado (stats existentes) |
| `/admin/users` | Gestión usuarios | **Activo** (filtros, premium, Stripe, actividad) |
| `/admin/users/:userId` | Detalle usuario | **Activo** |
| `/admin/stripe` | Métricas Stripe | **Activo** (API LIVE + gráficas) |
| `/admin/cms` | CMS interno | **Activo** (noticias, comunicados, banners) |
| `/admin/leagues` | Ligas y datos | **Activo** (catálogo, sync API) |
| `/admin/moderation` | Comunidad | **Activo** (contenido, reportes, sanciones) |
| `/admin/logs` | Auditoría | **Activo** (Winston + MongoDB, CSV) |
| `/admin/coupons` | Cupones | **Activo** (Stripe LIVE, solo admin principal) |
| `/admin/settings` | Config global | **Activo** (solo admin principal) |
| `/admin/messages/send` | Enviar mensaje | Implementado |
| `/admin/messages/bulk` | Masivos PRO | **Activo** (segmentación, plantillas, programación) |
| `/admin/messages/sent` | Historial | **Activo** (campañas + mensajes con filtros) |

## Roles

- **admin / admin_secundario**: acceso al panel (`AdminRoute`)
- **admin principal** (`isMainAdmin`): cupones, settings, mensajes masivos (`MainAdminRoute`)

## Archivos clave

```
frontend/src/components/AdminPanel/
  AdminPanel.jsx          # Rutas anidadas
  AdminPanelLayout.jsx    # Sidebar + outlet
  AdminRoute.jsx          # Guard admin
  MainAdminRoute.jsx      # Guard admin principal
  adminNavConfig.js       # Menú
  AdminModuleShell.jsx    # Contenedor módulo WIP
  modules/*.jsx           # Un archivo por módulo

routes/adminPro.js        # API esqueleto /api/admin/pro/*
```

## API usuarios (`/api/admin`)

- `GET /users?email=&premium=&role=&q=&createdFrom=&createdTo=`
- `GET /user/:id` — incluye `activity[]` y stats comunidad/simulador
- `PUT /user/:id/premium` — `{ premium: true|false }` (solo admin principal)

## API moderación (`/api/admin/moderation`)

- `GET /content` — filtros: `contentType`, `userId`, `reported`, fechas, `q`
- `GET /content/:contentType/:id` — detalle + reportes + historial
- `GET /reports` — cola de reportes abiertos
- `DELETE /posts/:id`, `POST /posts/:id/restore`
- `DELETE /comments/:id`, `POST /comments/:id/restore`
- `POST /users/:userId/block|unblock|mute|unmute`
- `POST /reports/:contentType/:id/resolve` — `{ action: dismiss|delete_content, note }`

Logs: `admin_moderation_action` (Winston). Comunidad: soft-delete, bloqueo/silencio en posts/comentarios.

## API auditoría (`/api/admin/logs`)

- `GET /` — filtros: `module`, `level`, `actorId`, `userId`, `q`, fechas, `last24h`, paginación
- `GET /stats` — contadores por módulo (24h)
- `GET /:id` — detalle con payload
- `GET /export` — CSV (hasta 2000 filas)
- `POST /import-winston` — importar desde `logs/app-*.log`

Captura automática vía transport Winston → colección `audit_logs`. Eventos: webhook, auth, premium, moderación, admin, errores.

## API CMS (`/api/admin/cms`)

- `GET /items` — filtros: `type`, `status`, `q`, fechas
- `GET /items/:id`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id`
- `POST /items/:id/publish`, `POST /items/:id/unpublish`
- Público: `GET /api/cms/public` — `news`, `announcements`, `banners`

Logs: `admin_cms_action`. Tipos: `news`, `announcement`, `banner`. Estados: `draft`, `scheduled`, `published`, `archived`.

## API ligas (`/api/admin/leagues`)

- `GET /` — filtros: `domain`, `active`, `q`, fechas
- `GET /:leagueId` — detalle + salud + historial sync
- `PUT /:leagueId` — nombre/logo override, temporada, prioridad
- `POST /:leagueId/toggle-active`, `POST /:leagueId/sync`
- `POST /sync-all` — hasta 15 ligas activas
- `GET /:leagueId/sync-history`

Catálogo en MongoDB (`league_catalog`), seed desde `competitionCatalog.json`. Rutas públicas respetan `active`. Logs: `admin_league_action`.

## API cupones (`/api/admin/coupons`) — admin principal

- `GET /` — listado Stripe + filtros
- `POST /` — crear cupón + promotion code
- `GET /:couponId`, `POST /:couponId/activate|deactivate`
- `POST /:couponId/set-checkout-default`, `GET /:couponId/stats`

Público: `POST /api/payments/validate-coupon`, checkout con `promotionCode` en body.

Logs: `admin_coupon_action`. Meta local: `coupon_meta` (auto-checkout, programación).

## API configuración global (`/api/admin/settings`) — admin principal

- `GET /` — categorías agrupadas + estado servidor
- `GET /status` — uptime, versión, entorno, MongoDB
- `GET /history?key=&limit=` — revisiones (`system_setting_revisions`)
- `POST /preview` — `{ settings: [{ key, value }] }` diff sin persistir
- `PUT /` — `{ settings, note? }` validación por tipo + auditoría

Público: `GET /api/settings/public` — mantenimiento, banner operativo, flags comunidad/simulador.

Middleware: `maintenanceModeGuard` (503 en API pública si `general.maintenance_mode`). Integración: reportes comunidad, TTL posts (`communityPostCleanup`).

Logs: `admin_settings_action`. Modelos: `system_settings`, `system_setting_revisions`.

## API mensajería PRO (`/api/admin/messages`) — admin principal

- `GET /templates`, `POST /templates`, `PUT|DELETE /templates/:id`
- `POST /segment/preview` — conteo de destinatarios por segmento
- `POST /preview` — vista previa con variables `{{name}}`, `{{email}}`, `{{premium_since}}`
- `GET /campaigns` — filtros: `status`, `q`, `from`, `to`
- `GET /campaigns/:id` — detalle + métricas + errores
- `POST /campaigns` — `{ titulo, contenido, segment, sendMode, scheduledAt?, batchSize?, note? }`
- `POST /campaigns/:id/cancel` — cancelar programadas
- `GET /history` — mensajes enviados con filtros avanzados

Segmentación: `premium` (all|premium|free), `pais`, `activity` (all|active|inactive), `inactiveDays`, `userIds` manual.

Worker: `jobs/messageCampaignWorker.js` (cada 60s). Envío por lotes (10–200). Logs: `admin_message_action`.

Modelos: `message_campaigns`, `message_templates`. Mensajes con `campaign_id` opcional.

Legacy: `POST /api/admin/messages/bulk` y `broadcast` en `routes/admin.js` (compatibilidad).

## Admin Panel PRO — completo

Módulos 1–9 implementados. Mensajería cierra el panel PRO.

## Próximos pasos sugeridos

1. ~~Usuarios~~ ✅
2. ~~Stripe Analytics~~ ✅ — `GET /api/admin/stripe/analytics`
3. ~~Moderación~~ ✅ — `GET/POST/DELETE /api/admin/moderation/*`
4. ~~Logs del sistema~~ ✅ — `GET /api/admin/logs`
