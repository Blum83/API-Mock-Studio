'use strict';

const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const config = require('../config');

const dataDir = path.join(__dirname, '../data');

const mocksDb = low(new FileSync(path.join(dataDir, 'mocks.json')));
const requestsDb = low(new FileSync(path.join(dataDir, 'requests.json')));

mocksDb.defaults({ mocks: [] }).write();
requestsDb.defaults({ requests: [] }).write();

module.exports = {
  // --- Mocks ---

  getMocks() {
    return mocksDb.get('mocks').value();
  },

  getMock(id) {
    return mocksDb.get('mocks').find({ id }).value();
  },

  createMock(data) {
    mocksDb.get('mocks').push(data).write();
    return data;
  },

  updateMock(id, updates) {
    mocksDb.get('mocks').find({ id }).assign(updates).write();
    return mocksDb.get('mocks').find({ id }).value();
  },

  deleteMock(id) {
    mocksDb.get('mocks').remove({ id }).write();
  },

  // --- Requests ---

  getRequests() {
    return requestsDb.get('requests').value();
  },

  addRequest(entry) {
    requestsDb.get('requests').push(entry).write();
    const all = requestsDb.get('requests').value();
    if (all.length > config.maxLogSize) {
      requestsDb.set('requests', all.slice(all.length - config.maxLogSize)).write();
    }
  },

  clearRequests() {
    requestsDb.set('requests', []).write();
  },
};
