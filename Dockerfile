# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all source code first (simpler for workspaces)
COPY . .

# Install dependencies with npm install (more forgiving than npm ci for workspaces)
RUN npm install --frozen-lockfile || npm install

# Build the dev playground (simpler, single build)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build --workspace=@scratch/task-herder && \
    npm run build --workspace=@scratch/scratch-svg-renderer && \
    npm run build --workspace=@scratch/scratch-render && \
    npm run build --workspace=@scratch/scratch-vm && \
    npm run build:dev --workspace=@scratch/scratch-gui

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
