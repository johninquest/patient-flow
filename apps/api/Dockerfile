# Development Dockerfile for API (Node.js)
FROM node:24-alpine

WORKDIR /app

# Enable pnpm via Corepack (must run after package.json is copied)
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

# Install dependencies
# Use pnpm install --frozen-lockfile for reproducible, lockfile-driven installs
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/client/package.json ./apps/client/
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api

# Expose port
EXPOSE 3000

# Run in development mode with hot reload
CMD ["pnpm", "--filter", "patient-flow-api", "run", "start:dev"]