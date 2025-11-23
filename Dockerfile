# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/scratch-gui/package*.json ./packages/scratch-gui/
COPY packages/scratch-vm/package*.json ./packages/scratch-vm/
COPY packages/scratch-render/package*.json ./packages/scratch-render/
COPY packages/scratch-svg-renderer/package*.json ./packages/scratch-svg-renderer/
COPY packages/task-herder/package*.json ./packages/task-herder/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files from scratch-gui
COPY --from=builder /app/packages/scratch-gui/build /usr/share/nginx/html

# Custom nginx config for SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
