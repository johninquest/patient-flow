# Lanlod - Property Management System

A fullstack application for landlords to track rental income and property expenses across their portfolio.

## Features

- 🏠 Property & Unit Management
- 👥 Tenant Management
- 💰 Rent Payment Tracking
- 📊 Expense Management
- 🔐 User Access Control
- 🌍 Multi-language Support (i18n)

## Tech Stack

### Backend (API)
- **Framework:** NestJS
- **Database:** PostgreSQL with Drizzle ORM
- **Language:** TypeScript
- **Authentication:** Better Auth

### Frontend (Client)
- **Framework:** SvelteKit
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Build Tool:** Vite

## Project Structure

```
lanlod/
├── api/          # NestJS backend API
├── client/       # SvelteKit frontend
└── plans/        # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Installation

**Backend:**
```bash
cd api
npm install
cp .env.example .env  # Configure your environment variables
npm run start:dev
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

## License

Private/Proprietary