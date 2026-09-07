# Production Dockerfile for Fusion High School Backend on Google Cloud Run
FROM node:20-slim

# Install necessary runtime dependencies (e.g. for canvas, fonts if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy root package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application codebase
COPY . .

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run listens on port 8080
EXPOSE 8080

# Start Express server
CMD ["node", "server.js"]
