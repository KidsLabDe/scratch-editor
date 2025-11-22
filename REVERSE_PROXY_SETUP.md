# Reverse Proxy Setup for Local Development

This document describes how to set up a reverse proxy to run the Scratch Editor and your backend under the same origin, enabling seamless cookie-based authentication.

## Why a Reverse Proxy?

When running:
- **Backend**: `localhost:3000` (login, API, project management)
- **Editor**: `localhost:8601` (Scratch GUI)

Browsers treat these as different origins, blocking cookie sharing. A reverse proxy serves both through a single origin (e.g., `localhost:8080`), solving this problem.

## Architecture

```
Browser → localhost:8080 (Proxy)
              ├── /editor/*  → localhost:8601 (Scratch Editor)
              └── /*         → localhost:3000 (Backend - login, API, pages)
```

The backend handles everything by default (login pages, project lists, user pages, API). The editor is mounted at `/editor/`.

## Nginx Configuration

### Installation

**Ubuntu/Debian:**
```bash
sudo apt install nginx
```

**macOS:**
```bash
brew install nginx
```

**Arch/Manjaro:**
```bash
sudo pacman -S nginx
```

### Configuration File

Create `/etc/nginx/sites-available/scratch-local` (or use `nginx.conf` directly on macOS):

```nginx
server {
    listen 8080;
    server_name localhost;

    # Increase body size for project uploads
    client_max_body_size 50M;

    # Scratch Editor at /editor/
    location /editor/ {
        proxy_pass http://localhost:8601/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for hot module replacement
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Everything else goes to the Backend
    location / {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for cloud variables
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;  # Keep WebSocket alive
    }
}
```

### Enable the Configuration

**Ubuntu/Debian:**
```bash
sudo ln -s /etc/nginx/sites-available/scratch-local /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

**macOS (using Homebrew):**
```bash
# Edit /usr/local/etc/nginx/nginx.conf or /opt/homebrew/etc/nginx/nginx.conf
# Add the server block inside the http block
nginx -t  # Test configuration
brew services restart nginx
```

**Arch/Manjaro:**
```bash
sudo ln -s /etc/nginx/sites-available/scratch-local /etc/nginx/sites-enabled/
# Or add to /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx
```

## Update Scratch Editor Configuration

After setting up the proxy, update `packages/scratch-gui/src/playground/render-gui.jsx`:

```javascript
// Use the proxy port - all API calls go through the same origin
const LOCAL_BACKEND_HOST = 'http://localhost:8080';

const accountMenuOptions = {
    canHaveSession: true,
    canRegister: true,
    canLogin: true,
    canLogout: true,
    myStuffUrl: `${LOCAL_BACKEND_HOST}/mystuff/`,
    profileUrl: `${LOCAL_BACKEND_HOST}/users/`,
    accountSettingsUrl: `${LOCAL_BACKEND_HOST}/account/settings/`,
};
```

Also update the login form to use the proxy:
```javascript
fetch(`${LOCAL_BACKEND_HOST}/api/login`, {
    // ...
})
```

**Note:** The editor will be accessed at `http://localhost:8080/editor/` but all API calls use the same origin (`http://localhost:8080`), so cookies work seamlessly.

## Backend Requirements

Your backend at `localhost:3000` should handle these routes:

### Required Routes

| Route | Purpose |
|-------|---------|
| `POST /api/login` | User authentication |
| `POST /api/logout` | End session |
| `GET /api/session` | Check current session (optional) |
| `GET /projects/{id}` | Load project JSON |
| `PUT /projects/{id}` | Save project |
| `POST /projects/` | Create new project |
| `GET /assets/internalapi/asset/{id}.{format}/get/` | Load asset |
| `POST /assets/{id}.{format}` | Upload asset |

### Optional Routes

| Route | Purpose |
|-------|---------|
| `GET /mystuff/` | User's projects page |
| `GET /users/{username}` | User profile |
| `GET /account/settings/` | Account settings |
| `WS /cloud` | Cloud variables WebSocket |
| `GET/POST/DELETE /backpack/{username}` | Backpack API |

### Cookie Configuration

Since everything runs under the same origin, standard cookies work:

```javascript
// Express.js example
res.cookie('session', sessionId, {
    httpOnly: true,
    sameSite: 'Lax',  // or 'Strict'
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
});
```

No special CORS configuration is needed when using the proxy.

## Running the Stack

1. **Start your backend:**
   ```bash
   cd your-backend
   npm start  # Runs on localhost:3000
   ```

2. **Start the Scratch Editor:**
   ```bash
   cd scratch-editor/packages/scratch-gui
   npm start  # Runs on localhost:8601
   ```

3. **Start nginx** (if not already running):
   ```bash
   sudo systemctl start nginx
   # or
   brew services start nginx
   ```

4. **Access the application:**
   ```
   http://localhost:8080           # Backend (login, projects list, etc.)
   http://localhost:8080/editor/   # Scratch Editor
   ```

## Alternative: Caddy (Simpler Configuration)

If you prefer Caddy over nginx:

### Installation

```bash
# macOS
brew install caddy

# Ubuntu/Debian
sudo apt install caddy

# Arch/Manjaro
sudo pacman -S caddy
```

### Caddyfile

Create a `Caddyfile` in your project root:

```
:8080 {
    # Scratch Editor at /editor/
    handle /editor/* {
        uri strip_prefix /editor
        reverse_proxy localhost:8601
    }

    # Everything else goes to Backend
    handle {
        reverse_proxy localhost:3000
    }
}
```

### Run Caddy

```bash
caddy run
```

## Troubleshooting

### 502 Bad Gateway
- Ensure both backend (3000) and editor (8601) are running
- Check nginx/caddy logs: `sudo tail -f /var/log/nginx/error.log`

### WebSocket Connection Failed
- Ensure the `Upgrade` and `Connection` headers are set for WebSocket routes
- Check that `proxy_read_timeout` is set for long-lived connections

### Cookies Not Being Set
- Ensure your backend sets cookies without `Secure` flag for HTTP (local dev)
- Check cookie `Path` is set to `/` or the appropriate path

### Hot Module Replacement Not Working
- Ensure WebSocket headers are set for the editor route (`/`)
- The editor uses WebSocket for HMR at `ws://localhost:8080/ws`

### Large File Uploads Failing
- Increase `client_max_body_size` in nginx config
- Default is often 1MB, projects can be much larger

## Production Considerations

For production deployment:

1. **Use HTTPS** - Add SSL certificates
2. **Set proper domain** - Replace `localhost` with your domain
3. **Secure cookies** - Add `Secure` flag to cookies
4. **Rate limiting** - Add rate limits to API routes
5. **Caching** - Cache static assets from the editor
6. **Compression** - Enable gzip for responses

Example production nginx config additions:
```nginx
server {
    listen 443 ssl;
    server_name scratch.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Enable gzip
    gzip on;
    gzip_types application/json application/javascript text/css;

    # ... rest of config
}
```
