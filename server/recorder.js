'use strict';

const store = require('./store');

const sseClients = new Set();

function addSSEClient(res) {
  sseClients.add(res);
  res.on('close', () => sseClients.delete(res));
}

function emitToClients(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function recordRequest(entry) {
  store.addRequest(entry);
  emitToClients('request', entry);
}

module.exports = { addSSEClient, recordRequest, emitToClients };
