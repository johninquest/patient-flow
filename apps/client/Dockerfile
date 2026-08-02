# Development Dockerfile for Client (Node.js + Vite)
FROM node:24-alpine

WORKDIR /app

# Install dependencies
# Use npm ci for reproducible, lockfile-driven installs
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run in development mode with hot reload
CMD ["npm", "run", "dev"]
