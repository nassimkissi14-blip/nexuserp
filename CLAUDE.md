# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NexusERP** is a full-stack multi-tenant ERP application built with React + Express + PostgreSQL. It covers HR, CRM, Sales, Inventory, Projects, and real-time messaging. Many module pages are still in development (show "Coming Soon" placeholders).

## Development Commands

### Running the Full Stack (recommended)
```bash
docker-compose up          # Start all services: PostgreSQL, Redis, backend (3001), frontend (5173)
docker-compose up --build  # Rebuild after dependency changes
```

### Frontend Only
```bash
cd frontend
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

### Backend Only
```bash
cd backend
npm install
npm run dev       # nodemon with hot-reload
npm start         # Production start
```

### Database (from backend/)
```bash
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:push       # Push schema changes to database
npm run db:seed       # Seed the database with initial data
```

**No lint, test, or type-check scripts are configured** — ESLint, Prettier, and any test framework are absent from the project.

## Architecture

### Structure
```
nexuserp/
├── frontend/src/
│   ├── api/client.js          # Axios instance, all API endpoint functions, auth interceptors
│   ├── store/index.js         # All Zustand stores (auth, modules, notifications, messages)
│   ├── App.jsx                # Central router — 40+ routes defined here
│   ├── pages/                 # Feature pages organized by module (rh/, crm/, sales/, stock/, projects/)
│   ├── components/auth/       # ProtectedRoute, ModuleGuard
│   ├── components/layout/     # MainLayout (sidebar, header)
│   └── hooks/useSocket.js     # Socket.IO singleton integration
└── backend/src/
    ├── server.js              # Express setup, middleware, route mounting
    ├── middleware/auth.middleware.js  # JWT verify, authorize(roles), bcrypt
    ├── routes/                # auth, modules, employees, messages, dashboard
    ├── socket/index.js        # Socket.IO event handlers
    └── prisma/schema.prisma   # Complete DB schema (~20 models)
```

### Key Patterns

**Multi-tenancy:** Every database operation is scoped to `companyId` extracted from the authenticated JWT. Never perform queries without this scope.

**Module system:** Features are toggled per company via `Module` and `SubModule` models. The `ModuleGuard` component on the frontend gates routes by enabled modules. Changes broadcast in real-time via `module:toggled` Socket.IO events.

**Auth flow:** JWT access tokens (15–30 min) + refresh tokens. The Axios interceptor in `api/client.js` auto-attaches the `Authorization` header and handles 401s by redirecting to login. The Zustand `useAuthStore` persists tokens to localStorage.

**State:** Zustand stores for client state (auth, modules, notifications, messages) persisted to localStorage. TanStack React Query (staleTime: 30s, retry: 1) for server state fetching in components.

**Real-time:** Socket.IO rooms are namespaced as `company:<id>` and `user:<id>`. The `useSocket` hook maintains a singleton connection.

**RBAC:** Backend uses `authorize('ADMIN', 'MANAGER')` middleware. User roles: `OPERATOR < MANAGER < DIRECTOR < ADMIN < SUPER_ADMIN`.

**API base path:** All backend routes are under `/api/v1/`.

**Locale:** Currency formatted with French/Algerian locale (`fr-DZ`, DZD).

### Database Schema (Prisma)
Core models: `Company`, `User`, `Module`, `SubModule`, `Employee`, `Customer`, `Supplier`, `Product`, `Order`, `Invoice`, `Quote`, `Project`, `Task`, `Message`, `Notification`, `LeaveRequest`, `ExpenseReport`, `Payroll`, `StockMovement`, `AuditLog`.

After any change to `backend/src/prisma/schema.prisma`, run `npm run db:generate` then `npm run db:push`.

## Environment Variables

Set via `docker-compose.yml` for local dev. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — Token signing keys
- `VITE_API_URL` — Frontend API base URL (defaults to `http://localhost:3001`)
- `FRONTEND_URL` — Used for CORS allowlist on backend
