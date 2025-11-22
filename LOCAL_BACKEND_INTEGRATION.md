# Local Backend Integration for Scratch Editor

This document describes how to configure the Scratch Editor playground to work with a local backend for authentication and account features.

## Overview

By default, the Scratch Editor playground disables account-related features (login, "My Stuff", "Save Now" button) because they require backend integration. This guide explains the changes made to enable these features for local development.

## Configuration Location

All configuration is in: `packages/scratch-gui/src/playground/render-gui.jsx`

## Key Configuration

### 1. Backend Host URL

```javascript
const LOCAL_BACKEND_HOST = 'http://localhost:3000';
```

Change this to match your local backend server address.

### 2. Account Menu Options

```javascript
const accountMenuOptions = {
    canHaveSession: true,          // Enable session/auth features
    canRegister: true,             // Show registration option
    canLogin: true,                // Show login option
    canLogout: true,               // Show logout option
    myStuffUrl: `${LOCAL_BACKEND_HOST}/mystuff/`,
    profileUrl: `${LOCAL_BACKEND_HOST}/users/`,
    accountSettingsUrl: `${LOCAL_BACKEND_HOST}/account/settings/`,
};
```

These URLs control where the account menu links navigate to.

### 3. Login Form Renderer

The `renderLogin` function provides the login form UI. It receives an `{onClose}` prop to close the dropdown after login.

```javascript
const renderLogin = ({onClose}) => (
    <form onSubmit={e => {
        e.preventDefault();
        // ... handle login
    }}>
        {/* Username and password fields */}
    </form>
);
```

Current implementation POSTs to `${LOCAL_BACKEND_HOST}/api/login` with:
- Method: POST
- Headers: `Content-Type: application/json`
- Body: `{username, password}`
- Credentials: `include` (for cookies/sessions)

### 4. GUI Component Props

The GUI component receives these props to enable features:

```jsx
<WrappedGui
    canSave                              // Enable "Save Now" button
    accountMenuOptions={accountMenuOptions}  // Account menu configuration
    renderLogin={renderLogin}            // Login form renderer
    // ... other props
/>
```

## Props Reference

### `canSave` (boolean)
- Enables the "Save Now" menu item in File menu
- Shows the SaveStatus component in the menu bar
- Required for project saving functionality

### `accountMenuOptions` (object)
Controls the account menu in the top-right corner:

| Property | Type | Description |
|----------|------|-------------|
| `canHaveSession` | boolean | Master switch for session features |
| `canRegister` | boolean | Show "Join Scratch" option |
| `canLogin` | boolean | Show "Sign In" option |
| `canLogout` | boolean | Show "Sign Out" option (when logged in) |
| `myStuffUrl` | string | URL for "My Stuff" link |
| `profileUrl` | string | URL for profile link |
| `accountSettingsUrl` | string | URL for account settings |
| `avatarUrl` | string | User's avatar image URL |
| `myClassesUrl` | string | URL for "My Classes" (educator accounts) |
| `myClassUrl` | string | URL for "My Class" (student accounts) |

### `renderLogin` (function)
- Required when `accountMenuOptions.canLogin` is true
- Receives `{onClose}` prop to close dropdown
- Should return a React element (the login form)

### `username` (string)
- When provided, shows the user as logged in
- Displays username in account menu
- Shows "My Stuff" icon if `myStuffUrl` is set

## Backend API Requirements

Your local backend should implement these endpoints:

### POST /api/login
Authentication endpoint for the login form.

**Request:**
```json
{
    "username": "string",
    "password": "string"
}
```

**Response:**
```json
{
    "success": true,
    "user": {
        "username": "string",
        "id": "number"
    }
}
```

Should set session cookies with `credentials: include`.

### GET /session (optional)
Check current session status. The Scratch GUI may call this to determine if user is logged in.

### Other Endpoints
- `GET /mystuff/` - User's projects page
- `GET /users/{username}` - User profile page
- `GET /account/settings/` - Account settings page

## Session Management

The Scratch Editor uses Redux for state management. To properly integrate authentication:

1. **Session Detection**: The editor checks for a logged-in user through the `username` prop
2. **After Login**: Reload the page or update Redux state to reflect login status
3. **Logout**: Implement logout handler that clears session and reloads

## Additional Features

### Backpack
Enable with `backpackVisible` prop and set `backpackHost` URL parameter:
```
http://localhost:8601/?backpack_host=http://localhost:3000/backpack
```

### Project Loading/Saving
For full project save functionality, you'll need to implement:
- Project storage API
- Asset storage API
- Cloud variables (optional)

See `scratch-storage` package for storage API requirements.

## Troubleshooting

### "LoginDropdown" Error
**Cause**: `canHaveSession` is true but `renderLogin` prop is missing.
**Fix**: Add `renderLogin={renderLogin}` prop to GUI component.

### Account Features Still Disabled
**Cause**: `canSave={false}` is still set.
**Fix**: Change to `canSave` (or `canSave={true}`).

### CORS Errors
**Cause**: Backend not allowing cross-origin requests from localhost:8601.
**Fix**: Configure CORS on your backend to allow:
- Origin: `http://localhost:8601`
- Credentials: true
- Methods: GET, POST, PUT, DELETE

### Session Not Persisting
**Cause**: Cookies not being set or sent.
**Fix**: Ensure:
- Backend sets cookies with `SameSite=Lax` or `SameSite=None; Secure`
- Frontend requests use `credentials: 'include'`

## Files Modified

- `packages/scratch-gui/src/playground/render-gui.jsx` - Main playground configuration

## Related Files

- `packages/scratch-gui/src/components/menu-bar/menu-bar.jsx` - Menu bar component
- `packages/scratch-gui/src/components/menu-bar/login-dropdown.jsx` - Login dropdown component
- `packages/scratch-gui/src/lib/account-menu-options.ts` - TypeScript interface for account options
- `packages/scratch-gui/src/containers/gui.jsx` - GUI container component

---

## Complete Backend API Reference

This section documents all API endpoints the Scratch Editor expects from a backend server.

### Authentication & Sessions

**Session Management:**
- Uses HTTP cookies with `withCredentials: true`
- No explicit session header or token - standard HTTP cookies
- User info (username) is passed as props to GUI, not fetched from API

**Important:** The editor does NOT call a user info API. The username must be provided as a prop when initializing the GUI.

### Project Loading

**Load Project by ID:**

| Method | Endpoint | Query Params | Response |
|--------|----------|--------------|----------|
| GET | `{projectHost}/{projectId}` | `?token={projectToken}` (optional) | Project JSON (SB3 format) |

- Default `projectHost`: `https://projects.scratch.mit.edu`
- Configure via `projectHost` prop

**Response Format:**
```json
{
  "targets": [...],
  "monitors": [...],
  "extensions": [...],
  "meta": {
    "semver": "3.0.0",
    "vm": "0.2.0",
    "agent": "..."
  }
}
```

### Project Saving

**Create New Project:**

| Method | Endpoint | Headers | Body | Response |
|--------|----------|---------|------|----------|
| POST | `{projectHost}/` | `Content-Type: application/json` | Project JSON | `{id: projectId}` |

**Update Existing Project:**

| Method | Endpoint | Headers | Body | Response |
|--------|----------|---------|------|----------|
| PUT | `{projectHost}/{projectId}` | `Content-Type: application/json` | Project JSON | `{id: projectId}` |

**Query Parameters (optional):**
- `?original_id={id}` - For remixes
- `&is_copy={boolean}` - Mark as copy
- `&is_remix={boolean}` - Mark as remix
- `&title={title}` - Project title

All requests include `credentials: 'include'` for cookies.

### Asset Storage (Costumes, Sounds)

**Download Asset:**

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `{assetHost}/internalapi/asset/{assetId}.{format}/get/` | Binary data |

**Upload Asset:**

| Method | Endpoint | Headers | Body | Response |
|--------|----------|---------|------|----------|
| POST | `{assetHost}/{assetId}.{format}` | `credentials: include` | Binary data | `{id: assetId}` |

**Asset Formats:**
- `png` - Bitmap images
- `svg` - Vector graphics
- `wav` - Audio files
- `jpg` - JPEG images
- `mp3` - MP3 audio

Default `assetHost`: `https://assets.scratch.mit.edu`

### Cloud Variables (WebSocket)

**Connection:**
- Protocol: `ws://` or `wss://` (based on page protocol)
- Endpoint: `{cloudHost}` (passed via prop)
- Messages are newline-separated JSON

**Handshake (Client → Server):**
```json
{"method": "handshake", "user": "{username}", "project_id": "{projectId}"}
```

**Set Variable (Client → Server):**
```json
{"method": "set", "user": "{username}", "project_id": "{projectId}", "name": "{varName}", "value": "{value}"}
```

**Variable Update (Server → Client):**
```json
{"method": "set", "name": "{varName}", "value": "{newValue}"}
```

**Other Methods:** `create`, `delete`, `rename`

Rate-limited to 10 messages/sec.

### Backpack (Optional)

**Get Backpack Contents:**

| Method | Endpoint | Headers | Query |
|--------|----------|---------|-------|
| GET | `{backpackHost}/{username}` | `x-token: {token}` | `?limit=20&offset=0` |

**Save to Backpack:**

| Method | Endpoint | Headers | Body |
|--------|----------|---------|------|
| POST | `{backpackHost}/{username}` | `x-token: {token}` | `{type, mime, name, body, thumbnail}` |

**Delete from Backpack:**

| Method | Endpoint | Headers |
|--------|----------|---------|
| DELETE | `{backpackHost}/{username}/{itemId}` | `x-token: {token}` |

### Configuration Props Summary

Pass these props to the GUI component:

```javascript
<GUI
    // Storage hosts
    projectHost="http://localhost:3000/projects"
    assetHost="http://localhost:3000/assets"
    cloudHost="ws://localhost:3000/cloud"

    // Auth
    username="currentUser"  // Set when logged in
    projectToken="..."      // Optional, for authenticated access

    // Features
    canSave={true}

    // Account menu URLs
    accountMenuOptions={{
        canHaveSession: true,
        myStuffUrl: "http://localhost:3000/mystuff/",
        // ...
    }}
/>
```

### Minimal Backend Implementation

For a basic working backend, implement these endpoints:

1. **GET /projects/{id}** - Return project JSON
2. **PUT /projects/{id}** - Save project JSON, return `{id}`
3. **POST /projects/** - Create project, return `{id}`
4. **GET /assets/internalapi/asset/{id}.{format}/get/** - Return asset binary
5. **POST /assets/{id}.{format}** - Store asset, return `{id}`

All endpoints should:
- Accept/send JSON for projects
- Handle binary data for assets
- Support CORS from `http://localhost:8601`
- Accept cookies (`credentials: include`)

### Example Express.js Routes

```javascript
// Project loading
app.get('/projects/:id', (req, res) => {
    const project = loadProject(req.params.id);
    res.json(project);
});

// Project saving
app.put('/projects/:id', (req, res) => {
    saveProject(req.params.id, req.body);
    res.json({ id: req.params.id });
});

// Asset loading
app.get('/assets/internalapi/asset/:assetId/get/', (req, res) => {
    const asset = loadAsset(req.params.assetId);
    res.send(asset);
});

// Asset uploading
app.post('/assets/:assetId', (req, res) => {
    saveAsset(req.params.assetId, req.body);
    res.json({ id: req.params.assetId });
});

// CORS configuration
app.use(cors({
    origin: 'http://localhost:8601',
    credentials: true
}));
```

### Key Source Files

- `/packages/scratch-gui/src/lib/legacy-storage.ts` - URL generation for all endpoints
- `/packages/scratch-gui/src/lib/save-project-to-server.js` - Project save logic
- `/packages/scratch-gui/src/lib/cloud-provider.js` - Cloud variable WebSocket
- `/packages/scratch-gui/src/lib/backpack-api.js` - Backpack API calls
