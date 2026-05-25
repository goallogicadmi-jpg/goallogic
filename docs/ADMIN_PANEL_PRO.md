# Admin Panel PRO — estructura

## Rutas frontend (`/admin/*`)

| Ruta | Módulo | Estado |
|------|--------|--------|
| `/admin/dashboard` | Dashboard | Implementado (stats existentes) |
| `/admin/users` | Gestión usuarios | **Activo** (filtros, premium, Stripe, actividad) |
| `/admin/users/:userId` | Detalle usuario | **Activo** |
| `/admin/stripe` | Métricas Stripe | Esqueleto |
| `/admin/cms` | CMS interno | Esqueleto |
| `/admin/leagues` | Ligas y datos | Esqueleto |
| `/admin/moderation` | Comunidad | Esqueleto (API delete ya existe) |
| `/admin/logs` | Auditoría | Esqueleto |
| `/admin/coupons` | Cupones | Esqueleto (solo admin principal) |
| `/admin/settings` | Config global | Esqueleto (solo admin principal) |
| `/admin/messages/send` | Enviar mensaje | Implementado |
| `/admin/messages/bulk` | Masivos | Implementado (admin principal) |
| `/admin/messages/sent` | Enviados | Implementado |

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

## Próximos pasos sugeridos

1. ~~Usuarios~~ ✅
2. Stripe: ingresos vía API Stripe + estado webhook
3. Moderación: UI sobre `/api/community` admin endpoints
4. Logs: lector de Winston o export desde Render
