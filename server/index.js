'use strict';

const express = require('express');
const path = require('path');
const config = require('../config');
const { mockMiddleware, proxyMiddleware } = require('./proxy');
const routes = require('./routes');

// ── Proxy server (port 8080) ─────────────────────────────────────────────────
// All traffic from the client app hits this server. Mocked requests are
// answered immediately; everything else is forwarded to config.target.

const proxyApp = express();

proxyApp.use((req, res, next) => {
  req._startTime = Date.now();
  next();
});

// Capture raw body for forwarding, parse JSON for mock matching / logging.
proxyApp.use(
  express.json({
    strict: false,
    type: ['application/json', 'text/json'],
    verify: (req, _res, buf) => { req.rawBody = buf; },
  })
);

proxyApp.use(mockMiddleware);
proxyApp.use(proxyMiddleware);

proxyApp.listen(config.proxyPort, () => {
  console.log(`[proxy] Listening on http://localhost:${config.proxyPort}  →  ${config.target}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[proxy] Port ${config.proxyPort} is already in use. Kill the old process and retry.`);
  } else {
    console.error('[proxy] Server error:', err.message);
  }
  process.exit(1);
});

// ── UI server (port 8081) ────────────────────────────────────────────────────
// Serves the REST API consumed by the Vue UI, and (in production) the built
// static assets from ui/dist.

const uiApp = express();

uiApp.use(express.json());

// REST API
uiApp.use('/api', routes);

// Static UI (only available after `npm run build`)
const distDir = path.join(__dirname, '../ui/dist');
uiApp.use(express.static(distDir));
uiApp.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

uiApp.listen(config.uiPort, () => {
  console.log(`[ui]    Listening on http://localhost:${config.uiPort}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ui] Port ${config.uiPort} is already in use. Kill the old process and retry.`);
  } else {
    console.error('[ui] Server error:', err.message);
  }
  process.exit(1);
});
