# Development Dockerfile for API (Bun)
FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Run in development mode with hot reload
CMD ["bun", "run", "start:dev"]