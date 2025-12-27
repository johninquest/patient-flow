# Lanlod - Property Management API

A NestJS backend API for managing rental properties, units, tenants, rent payments, and expenses. Built with TypeScript, PostgreSQL, and Drizzle ORM.

## Features

- **Property Management** - Create and manage rental properties with details like location and construction year
- **Unit Management** - Organize properties into individual rental units
- **Tenant Management** - Track tenant information and their assigned units
- **Rent Tracking** - Record and monitor monthly rent payments from tenants
- **Expense Management** - Log property expenses across categories (maintenance, utilities, taxes, insurance, etc.)
- **Access Control** - Share property access with other users with configurable roles (manager/viewer)
- **Authentication** - Secure authentication using Better Auth

## Project setup

```bash
$ bun install
```

## Compile and run the project

```bash
# development
$ bun run start

# watch mode
$ bun run start:dev

# production mode
$ bun run start:prod
```

## Run tests

```bash
# unit tests
$ bun test

# e2e tests
$ bun run test:e2e

# test coverage
$ bun test --coverage
```

## Database

```bash
# Generate migrations
$ bun run db:generate

# Run migrations
$ bun run db:migrate

# View database in studio
$ bun run db:studio
```

## API Endpoints

- `GET/POST/PUT/DELETE /properties` - Property management
- `GET/POST/PUT/DELETE /units` - Unit management
- `GET/POST/PUT/DELETE /tenants` - Tenant management
- `GET/POST/PUT/DELETE /rent` - Rent payment tracking
- `GET/POST/PUT/DELETE /expenses` - Expense management
- `GET/POST/PUT/DELETE /user-access` - User access control
- `POST /api/auth/*` - Authentication endpoints

## License

Proprietary
