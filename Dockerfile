# Build stage
FROM node:20-alpine AS builder

# Build argument for backend URL
ARG BACKEND_URL=https://gameslab.kidslab.de
ENV BACKEND_URL=${BACKEND_URL}

WORKDIR /app

# Copy everything first (npm ci needs scripts for prepare hooks)
COPY . .

# Install dependencies
RUN npm ci

# Build the project with BACKEND_URL environment variable
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy the built files from scratch-gui
COPY --from=builder /app/packages/scratch-gui/build /usr/share/nginx/html

# Copy nginx configuration for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
