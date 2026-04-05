'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('./store');
const recorder = require('./recorder');

const router = express.Router();

// ── Requests ────────────────────────────────────────────────────────────────

router.get('/requests', (req, res) => {
  const requests = store.getRequests();
  res.json([...requests].reverse()); // most recent first
});

router.get('/requests/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  recorder.addSSEClient(res);

  // Send current log as the initial snapshot
  const existing = store.getRequests();
  res.write(`event: init\ndata: ${JSON.stringify(existing)}\n\n`);
});

router.delete('/requests', (req, res) => {
  store.clearRequests();
  res.json({ ok: true });
});

// ── Mocks ────────────────────────────────────────────────────────────────────

router.get('/mocks', (req, res) => {
  res.json(store.getMocks());
});

router.post('/mocks', (req, res) => {
  const { name, method, path, enabled, response } = req.body;
  if (!method || !path) {
    return res.status(400).json({ error: 'method and path are required' });
  }
  const mock = {
    id: uuidv4(),
    name: name || `${method.toUpperCase()} ${path}`,
    method: method.toUpperCase(),
    path,
    enabled: enabled !== undefined ? Boolean(enabled) : true,
    response: {
      status: response?.status || 200,
      headers: response?.headers || { 'Content-Type': 'application/json' },
      body: response?.body !== undefined ? response.body : {},
    },
    createdAt: new Date().toISOString(),
  };
  store.createMock(mock);
  res.status(201).json(mock);
});

router.put('/mocks/:id', (req, res) => {
  const mock = store.getMock(req.params.id);
  if (!mock) return res.status(404).json({ error: 'Mock not found' });
  const updated = store.updateMock(req.params.id, req.body);
  res.json(updated);
});

router.delete('/mocks/:id', (req, res) => {
  const mock = store.getMock(req.params.id);
  if (!mock) return res.status(404).json({ error: 'Mock not found' });
  store.deleteMock(req.params.id);
  res.json({ ok: true });
});

router.post('/mocks/:id/toggle', (req, res) => {
  const mock = store.getMock(req.params.id);
  if (!mock) return res.status(404).json({ error: 'Mock not found' });
  const updated = store.updateMock(req.params.id, { enabled: !mock.enabled });
  res.json(updated);
});

module.exports = router;
