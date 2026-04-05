'use strict';

const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { v4: uuidv4 } = require('uuid');
const micromatch = require('micromatch');
const config = require('../config');
const store = require('./store');
const recorder = require('./recorder');

function tryParseJSON(str) {
  try { return JSON.parse(str); } catch { return str; }
}

function findMatchingMock(method, pathname) {
  const mocks = store.getMocks().filter(m => m.enabled);
  for (const mock of mocks) {
    if (mock.method !== method.toUpperCase()) continue;
    if (mock.path === pathname || micromatch.isMatch(pathname, mock.path)) {
      return mock;
    }
  }
  return null;
}

/**
 * Middleware that runs before the proxy. If a mock matches the incoming
 * request it sends the mock response immediately; otherwise calls next()
 * to let the real proxy middleware handle it.
 */
function mockMiddleware(req, res, next) {
  const mock = findMatchingMock(req.method, req.path);
  if (!mock) return next();

  const duration = Date.now() - req._startTime;

  recorder.recordRequest({
    id: uuidv4(),
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    requestHeaders: req.headers,
    requestBody: req.body || null,
    status: mock.response.status,
    responseHeaders: mock.response.headers || { 'Content-Type': 'application/json' },
    responseBody: mock.response.body,
    mocked: true,
    mockId: mock.id,
    mockName: mock.name,
    timestamp: new Date().toISOString(),
    duration,
  });

  if (mock.response.headers) {
    Object.entries(mock.response.headers).forEach(([k, v]) => res.set(k, v));
  }

  const body = mock.response.body;
  if (typeof body === 'object' && body !== null) {
    res.status(mock.response.status).json(body);
  } else {
    res.status(mock.response.status).send(body != null ? String(body) : '');
  }
}

/**
 * Proxy middleware: forwards to the real backend and captures the response
 * for logging.  Uses responseInterceptor (selfHandleResponse: true) so we
 * can inspect the body before piping it to the client.
 */
const proxyMiddleware = createProxyMiddleware({
  target: config.target,
  changeOrigin: true,
  selfHandleResponse: true,

  // express.json() consumes the stream; re-write the raw body so the
  // upstream server still receives it.
  onProxyReq(proxyReq, req) {
    if (req.rawBody && req.rawBody.length > 0) {
      proxyReq.setHeader('Content-Length', req.rawBody.length);
      proxyReq.write(req.rawBody);
      proxyReq.end();
    }
  },

  onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req) => {
    const bodyStr = responseBuffer.toString('utf8');
    recorder.recordRequest({
      id: uuidv4(),
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      query: req.query,
      requestHeaders: req.headers,
      requestBody: req.body || null,
      status: proxyRes.statusCode,
      responseHeaders: proxyRes.headers,
      responseBody: tryParseJSON(bodyStr),
      mocked: false,
      timestamp: new Date().toISOString(),
      duration: Date.now() - req._startTime,
    });
    return responseBuffer;
  }),

  onError(err, req, res) {
    console.error('[proxy] error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Proxy error', message: err.message });
    }
  },
});

module.exports = { mockMiddleware, proxyMiddleware };
