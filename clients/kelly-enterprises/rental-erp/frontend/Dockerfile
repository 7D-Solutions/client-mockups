# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build arguments for Vite environment variables
ARG VITE_API_URL
ARG NODE_ENV=production

# Make build args available as environment variables during build
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=$NODE_ENV

# Debug: Show what API URL is being used for build
RUN echo "Building with VITE_API_URL=${VITE_API_URL}"

# Build the application
# Force rebuild on Railway by adding timestamp
RUN echo "Build timestamp: $(date)" && npm run build

# Verify the build used correct API URL
RUN if [ -f dist/assets/*.js ]; then \
      echo "Checking built files for API URL..." && \
      grep -r "fire-proof-erp-sandbox-production" dist/ || echo "✓ No hardcoded backend URL found"; \
    fi

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Railway will provide PORT env variable
EXPOSE 8080

# Use entrypoint to configure port dynamically
ENTRYPOINT ["/docker-entrypoint.sh"]