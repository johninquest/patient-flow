# Patient Flow - Patient Workflow Orchestration System

A lightweight patient workflow orchestration system for clinics and healthcare organizations. Tracks patients through care stages, assigns tasks to staff, and ensures clear handoffs across the care journey.

## Features

- 👥 Patient Management
- 🏥 Encounter Workflow Tracking
- ✅ Task Assignment & Management
- 📊 Audit Logging
- 🔐 Role-Based Access Control
- 🌍 Multi-language Support (i18n)

## Tech Stack

### Backend (API)
- **Framework:** NestJS
- **Database:** PostgreSQL with Drizzle ORM
- **Language:** TypeScript
- **Authentication:** Better Auth

### Frontend (Client)
- **Framework:** React 19
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Build Tool:** Vite 7

## Project Structure

```
patient-flow/
├── apps/
│   ├── api/      # NestJS backend API
│   └── client/   # React frontend
└── requirements/ # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Docker & Docker Compose (optional)

### Option 1: Local Development (without Docker)

> **Dependency policy:** The root `.npmrc` contains `minimumReleaseAge=10080` (7 days). This tells npm to avoid versions published within the last 7 days when resolving updates, reducing supply-chain risk. Docker builds and CI use `npm ci` for reproducible installs.

**Backend:**
```bash
cd api
npm ci
cp .env.example .env  # Configure your environment variables
npm run start:dev
```

**Frontend:**
```bash
cd client
npm ci
cp .env.example .env  # Configure your environment variables
npm run dev
```

**Updating dependencies:**
- Use `npm install` (or `npm update`, or `npm install <package>@latest`) locally when you intentionally want to update packages.
- Review the resulting `package-lock.json` diff, run tests, then commit both `package.json` and `package-lock.json`.
- CI and Docker use `npm ci`, which installs exactly the committed lockfile versions.

### Option 2: Docker Development

**Start database only (recommended for local development):**
```bash
docker-compose up -d
```
Then run API and client locally with hot-reload.

**Start full stack for testing:**
```bash
docker-compose -f docker-compose.test.yml up
```

**Start in background:**
```bash
docker-compose -f docker-compose.test.yml up -d
```

**View logs:**
```bash
docker-compose -f docker-compose.test.yml logs -f
```

**Stop services:**
```bash
docker-compose -f docker-compose.test.yml down
```

**Access containers:**
```bash
# API shell
docker-compose -f docker-compose.test.yml exec api sh

# Client shell
docker-compose -f docker-compose.test.yml exec client sh

# Run migrations
docker-compose -f docker-compose.test.yml exec api npm run db:migrate
```

**Docker Compose Files:**
- `docker-compose.yml` - Database only (for local development)
- `docker-compose.test.yml` - Full stack (API + Client + Database)
- `docker-compose.prod.yml` - Production deployment

## Deployment

### Client Build Options

The client supports two build modes via the `ADAPTER` environment variable:

| Command | Adapter | Output | Use Case |
|---------|---------|--------|----------|
| `npm run build` | Node | `build/` (server) | Docker self-hosted |
| `npm run build:static` | Static | `build/` (static) | Firebase Hosting |
| `npm run deploy:firebase` | Static | Firebase | Deploy to Firebase |

### Production Deployment with Docker

**Prerequisites:**
- Docker & Docker Compose installed on server
- Traefik reverse proxy configured
- Domain names pointed to server (api.popaty.com, app.popaty.com)

**Deploy:**
```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

**Update deployment:**
```bash
# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Or pull latest and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

**Monitoring:**
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View API logs only
docker-compose -f docker-compose.prod.yml logs -f api

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100

# Check resource usage
docker stats popaty-api popaty-client
```

**Maintenance:**
```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec api npm run migration:run

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop and remove containers
docker-compose -f docker-compose.prod.yml down
```

### Firebase Hosting Deployment

**Prerequisites:**
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created

**Deploy:**
```bash
cd client

# Login to Firebase (first time only)
firebase login

# Build and deploy
npm run deploy:firebase
```

## Environment Variables

Environment configuration is split by responsibility:

- **`apps/api/.env`** — Server-side secrets and configuration for the NestJS API.
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `API_URL`
  - `CLIENT_URL`
  - `ADMIN_EMAIL`
  - `PORT` (optional, defaults to `3000`)

- **`apps/client/.env`** — Browser-safe build-time variables for the Vite client.
  - `VITE_API_URL`

- **`.env` at repo root** — Used only by Docker Compose for orchestration.
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `API_URL`
  - `CLIENT_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

Example API `.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/patientflow
AUTH_SECRET=your-secret-key
API_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
ADMIN_EMAIL=admin@patientflow.app
```

Example client `.env`:

```env
VITE_API_URL=http://localhost:3000
```

## License

Private/Proprietary