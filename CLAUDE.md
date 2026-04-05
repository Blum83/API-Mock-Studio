# API Mock Studio — CLAUDE.md

## What are we building

A local developer tool: HTTP proxy server + web UI for intercepting, inspecting, and mocking API
responses. Works with any HTTP client — browser, Electron app, mobile emulator, Postman, curl.
The user redirects their app's base URL to this proxy during testing/development.

Primary user: QA engineer or developer who needs to:
- See all outgoing API requests in real time
- Freeze any request and return a custom response
- Save mocks to disk and share with the team via git
- Replay mocked responses without a real backend

---

## Tech stack

| Layer         | Choice                        | Reason                                             |
|---------------|-------------------------------|----------------------------------------------------|
| Proxy server  | Node.js + http-proxy-middleware + express | Full control over req/res pipeline      |
| Storage       | lowdb (JSON file-based)       | Zero config, human-readable, committable to repo   |
| UI server     | Express (same process)        | Serves Vue UI + REST API for UI interactions       |
| Real-time     | SSE (Server-Sent Events)      | Push new requests to UI without polling            |
| Frontend      | Vue 3 + Vite                  | Lightweight, no framework overhead                 |
| Styling       | Plain CSS with CSS variables  | Dark terminal aesthetic, no build complexity       |
| Runtime       | Node.js 18+                   |                                                    |

---

## Project structure

```
api-mock-studio/
├── server/
│   ├── index.js              # Entry point: starts proxy server + UI API server
│   ├── proxy.js              # http-proxy-middleware setup, intercept logic
│   ├── recorder.js           # Captures req/res, emits SSE events, saves to store
│   ├── store.js              # lowdb wrapper: read/write mocks and request log
│   └── routes.js             # Express REST routes for UI (GET /requests, POST /mocks, etc.)
├── ui/
│   ├── index.html
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   └── components/
│   │       ├── RequestList.vue     # Live list of intercepted requests (SSE-powered)
│   │       ├── RequestDetail.vue   # Shows headers, body, status of selected request
│   │       ├── MockEditor.vue      # Edit response body/status, toggle mock on/off
│   │       └── MockList.vue        # All saved mocks with enable/disable toggle
│   └── vite.config.js
├── data/
│   ├── requests.json         # Request log (last N requests, not committed)
│   └── mocks.json            # Saved mocks (committed to repo, shared with team)
├── .gitignore                # ignore requests.json, node_modules
├── config.js                 # Proxy target URL, ports, max log size
├── package.json
└── README.md
```

---

## Core concepts

### Mock matching
A mock is matched against an incoming request by:
1. Method (GET, POST, etc.)
2. URL path (exact or glob pattern, e.g. `/api/users/*`)
3. Optional: request body contains key (for POST disambiguation)

If a mock is enabled and matches — proxy returns the mock response immediately, real backend is NOT called.
If no mock matches — request is forwarded to the real backend normally.

### Request lifecycle
```
Client request
  → proxy.js intercepts
  → recorder.js checks mock store
      → mock found & enabled?  → return mock response → record to log
      → no mock?               → forward to real backend → record real response to log
  → SSE event emitted → UI updates in real time
```

### Mock object shape (mocks.json)
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
    "body": { "id": 1, "name": "Test User", "role": "admin" }
  },
  "createdAt": "2025-04-05T10:00:00Z"
}
```

---

## API routes (server → UI communication)

```
GET  /api/requests          # Last N intercepted requests
GET  /api/requests/stream   # SSE stream for real-time updates
DELETE /api/requests        # Clear request log

GET  /api/mocks             # All saved mocks
POST /api/mocks             # Create new mock (from request or manual)
PUT  /api/mocks/:id         # Update mock (body, status, enabled toggle)
DELETE /api/mocks/:id       # Delete mock
POST /api/mocks/:id/toggle  # Enable/disable mock
```

---

## Config (config.js)

```js
module.exports = {
  proxyPort: 8080,        // Port clients point their base URL to
  uiPort: 8081,           // Port for the web UI
  target: 'https://api.example.com',  // Real backend to forward to
  maxLogSize: 200,        // Max requests kept in memory/file
}
```

User sets `target` before starting. Everything else works out of the box.

---

## UI behaviour

### Request list (left panel)
- Live feed of intercepted requests via SSE
- Each row: METHOD badge, path, status code, response time, mock indicator (if mocked)
- Click row → opens RequestDetail panel
- Color coding: green 2xx, amber 3xx/4xx, red 5xx, purple = mocked

### Request detail (right panel, top)
- Shows: method, full URL, request headers, request body
- Shows: response status, response headers, response body (pretty-printed JSON)
- Button: "Save as mock" → pre-fills MockEditor with this request's data

### Mock editor (right panel, bottom, appears after "Save as mock" or clicking existing mock)
- Editable fields: name, method, path (supports * glob), response status, response body (JSON editor)
- Toggle: enabled / disabled
- Save / Delete buttons

### Mock list (separate tab or sidebar section)
- All saved mocks
- Quick toggle enabled/disabled per mock
- Click to edit in MockEditor

---

## Aesthetic / UI style

Dark terminal theme. Inspired by DevTools Network tab but cleaner.
- Background: #0d0d0d
- Surface: #141414
- Border: #2a2a2a
- Text primary: #e8e8e8
- Text muted: #666
- Accent: #a78bfa (purple)
- Font: JetBrains Mono for code/values, system-ui for labels
- Method badges: color-coded (GET=teal, POST=blue, PUT=amber, DELETE=red, PATCH=purple)

---

## MVP scope (v1)

Must have:
- [x] Proxy server with configurable target
- [x] Request interception + real-time SSE feed to UI
- [x] "Save as mock" from any intercepted request
- [x] Mock enable/disable toggle
- [x] Mock matching by method + path (exact + glob)
- [x] Persistent storage in mocks.json
- [x] Basic web UI (request list + detail + mock editor)

Out of scope for v1:
- [ ] HTTPS proxy / SSL interception
- [ ] GraphQL support
- [ ] Multiple proxy targets / profiles
- [ ] Team sync via cloud
- [ ] Browser extension for auto-redirect

---

## How to run (target README content)

```bash
# Install
npm install

# Configure target
# Edit config.js → set target to your backend URL

# Start
npm start
# Proxy runs on http://localhost:8080
# UI opens on  http://localhost:8081

# Point your app/browser to localhost:8080 instead of the real API
# Watch requests appear in the UI in real time
```

---

## Implementation notes for Claude Code

- Start with `server/index.js` — get proxy + express running first, verify requests forward correctly
- Add `recorder.js` next — intercept response, log to lowdb, emit SSE
- Build UI last — start with RequestList (SSE consumer) as the hardest real-time piece
- Use `http-proxy-middleware` v2 (not v3, API differs)
- For SSE: set headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, keep connection open
- lowdb v3 is ESM only — either use v1 (CommonJS) or switch server to ESM (`"type": "module"` in package.json). Recommend lowdb v1 to avoid ESM complexity.
- For glob matching in mock paths use `micromatch` npm package
