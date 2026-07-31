# Development Dockerfile for API (Node.js)
FROM node:24-alpine

WORKDIR /app

# Install dependencies
# Use npm ci for reproducible, lockfile-driven installs
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Run in development mode with hot reload
CMD ["npm", "run", "start:dev"]