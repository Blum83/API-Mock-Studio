# API Mock Studio

Local developer tool: HTTP proxy + web UI for intercepting, inspecting, and mocking API responses.

## How it works

Point your app's base URL to `http://localhost:8080` instead of the real API.
Every request is logged in real time. You can freeze any request and return a custom response instead.

```
Your app → localhost:8080 (proxy) → real backend
                                  ↑
              mock matched? return mock instead
```

## Quick start

```bash
# Install
npm install

# Build the UI (first time and after UI changes)
npm run build

# Configure target backend
# Edit config.js → set target to your backend URL

# Start
npm start
# Proxy: http://localhost:8080  (point your app here)
# UI:    http://localhost:8081  (open in browser)
```

## Development mode (hot-reload UI)

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:ui
# UI dev server: http://localhost:5173
```

## Configuration (`config.js`)

| Key | Default | Description |
|-----|---------|-------------|
| `proxyPort` | `8080` | Port clients point to |
| `uiPort` | `8081` | Web UI port |
| `target` | `https://jsonplaceholder.typicode.com` | Real backend URL |
| `maxLogSize` | `200` | Max requests kept in log |

Override with env vars: `PROXY_PORT`, `UI_PORT`, `TARGET`.

## UI walkthrough

### Traffic tab
- Live feed of every request through the proxy (via SSE — no polling)
- Click a row to see request headers/body and response headers/body
- Click **Save as mock** to create a mock pre-filled with the real response

### Mocks tab
- All saved mocks with enable/disable toggle
- Click a mock to edit it in the editor
- Click **+ New** to create a mock from scratch
- Path supports `*` glob patterns — e.g. `/api/users/*` matches any user

## Mock storage

Mocks are saved to `data/mocks.json` — plain JSON, human-readable, commit to git to share with your team.

Request logs live in `data/requests.json` (gitignored).

## Mock shape

```json
{
  "id": "uuid",
  "name": "Get user profile",
  "method": "GET",
  "path": "/api/v1/user/profile",
  "enabled": true,
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "body": { "id": 1, "name": "Test User" }
  },
  "createdAt": "2025-04-05T10:00:00Z"
}
```

## REST API

```
GET    /api/requests          Last N intercepted requests
GET    /api/requests/stream   SSE stream for real-time updates
DELETE /api/requests          Clear request log

GET    /api/mocks             All saved mocks
POST   /api/mocks             Create mock
PUT    /api/mocks/:id         Update mock
DELETE /api/mocks/:id         Delete mock
POST   /api/mocks/:id/toggle  Enable/disable mock
```
