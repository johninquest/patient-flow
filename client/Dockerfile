# Development Dockerfile for Client (npm/Node)
FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Run in development mode with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]