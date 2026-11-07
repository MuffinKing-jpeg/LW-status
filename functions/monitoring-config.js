const net = require('net');
const crypto = require('crypto');

const httpError = (status, message) => Object.assign(new Error(message), {status});
const object = (value) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

const validHost = (value) => typeof value === 'string' && value.length <= 253 &&
  (net.isIP(value) !== 0 || value.split('.').every((label) =>
    /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label)));

const assertSafeJson = (value) => {
  if (Array.isArray(value)) return value.forEach(assertSafeJson);
  if (value !== null && typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) {
        throw httpError(400, 'Unsupported settings key');
      }
      assertSafeJson(value[key]);
    });
  }
};

// Preserve the exact input to the existing history hash for legacy equipment.
const editableServer = (server) => ({
  id: String(server.id || `${server.host}:${server.port}`),
  name: server.name || server.host,
  host: server.host,
  port: Number(server.port),
  icon: server.icon || 'fa-solid fa-server',
  enabled: server.enabled !== false,
});

const publicDevice = (server) => ({
  id: crypto.createHash('sha256')
      .update(String(server.id || `${server.host}:${server.port}`))
      .digest('hex').slice(0, 24),
  name: server.name || server.host,
  icon: server.icon || 'fa-solid fa-server',
});

const validateConfiguration = (body) => {
  if (!object(body) || typeof body.revision !== 'string' ||
      body.revision.length > 200 || !Array.isArray(body.servers) ||
      body.servers.length > 100 || !object(body.settings)) {
    throw httpError(400, 'Invalid configuration (maximum 100 devices)');
  }
  if (Buffer.byteLength(JSON.stringify(body.settings)) > 16384) {
    throw httpError(400, 'Settings must be smaller than 16 KB');
  }
  assertSafeJson(body.settings);
  if (!Number.isInteger(body.settings.timeout) ||
      body.settings.timeout < 100 || body.settings.timeout > 10000) {
    throw httpError(400, 'Timeout must be an integer from 100 to 10000 ms');
  }
  const ids = new Set();
  const endpoints = new Set();
  body.servers.forEach((server) => {
    if (!object(server) || typeof server.id !== 'string' ||
        !/^[a-z\d._:-]{1,300}$/i.test(server.id) || ids.has(server.id) ||
        typeof server.name !== 'string' || !server.name.trim() ||
        server.name.length > 80 || !validHost(server.host) ||
        !Number.isInteger(server.port) || server.port < 1 || server.port > 65535 ||
        typeof server.enabled !== 'boolean' || typeof server.icon !== 'string' ||
        !/^[a-z\d -]{1,160}$/i.test(server.icon)) {
      throw httpError(400, 'Invalid device: check name, host, port, icon and unique ID');
    }
    const endpoint = `${server.host.toLowerCase()}:${server.port}`;
    if (endpoints.has(endpoint)) throw httpError(400, 'Duplicate host and port');
    ids.add(server.id);
    endpoints.add(endpoint);
  });
  return {
    revision: body.revision,
    settings: body.settings,
    servers: body.servers.map((server) => ({...editableServer(server), name: server.name.trim()})),
  };
};

// Firestore timestamps include nanoseconds; milliseconds would miss fast edits.
const revisionOf = (...snapshots) => snapshots.map((snapshot) => {
  const time = snapshot.updateTime;
  return time ? `${time.seconds}.${time.nanoseconds}` : 'missing';
}).join('/');

module.exports = {httpError, editableServer, publicDevice, validateConfiguration, revisionOf};
