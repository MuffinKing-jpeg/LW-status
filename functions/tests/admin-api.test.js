const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createAdminHandler, trustedOrigin} = require('../admin-api');

const fixture = ({member = true, tokenError = false} = {}) => {
  const data = new Map([
    ['config/config', {timeout: 1000, preserved: 'setting'}],
    ['config/servers', {legacyTopLevel: true, servers: [
      {name: 'Legacy', host: 'server.example.net', port: 443, icon: 'fas fa-server', custom: 12},
    ]}],
    ['admins/uid', {enabled: member}],
  ]);
  let version = 1;
  let id = 0;
  const writes = [];
  const snapshot = path => ({
    exists: data.has(path), data: () => data.get(path),
    updateTime: data.has(path) ? {seconds: version, nanoseconds: 0} : undefined,
  });
  const db = {
    doc: path => ({path, get: async () => snapshot(path)}),
    collection: path => ({
      doc: () => ({path: `${path}/event-${++id}`}),
      orderBy: () => ({limit: () => ({get: async () => ({docs: []})})}),
    }),
    runTransaction: async callback => {
      const pending = [];
      const result = await callback({
        get: async ref => snapshot(ref.path),
        set: (ref, value) => pending.push([ref.path, value]),
      });
      pending.forEach(([path, value]) => { data.set(path, value); writes.push([path, value]); });
      if (pending.length) version++;
      return result;
    },
  };
  const authCalls = [];
  const auth = {verifyIdToken: async (...args) => {
    authCalls.push(args);
    if (tokenError) throw Object.assign(new Error('verification failed'), {
      code: typeof tokenError === 'string' ? tokenError : 'auth/invalid-id-token',
    });
    return {uid: 'uid', email: 'admin@example.net'};
  }};
  const handler = createAdminHandler({db, auth, serverTimestamp: () => 'SERVER_TIME', logger: {error: () => {}}});
  const request = async ({method = 'GET', token = 'valid', origin = 'https://status.logixy.net', body, json = true} = {}) => {
    const result = {status: 200, headers: {}, body: null};
    const response = {
      set: (key, value) => { result.headers[key] = value; },
      status: status => { result.status = status; return response; },
      json: body => { result.body = body; }, send: body => { result.body = body; },
    };
    await handler({method, body,
      get: key => key === 'Origin' ? origin : token ? `Bearer ${token}` : undefined,
      is: () => json,
    }, response);
    return result;
  };
  return {request, data, writes, authCalls};
};

test('rejects unauthenticated, revoked and non-admin users without leaking config', async () => {
  for (const [options, query, status] of [
    [{}, {token: ''}, 401], [{tokenError: true}, {}, 401], [{member: false}, {}, 403],
  ]) {
    const state = fixture(options);
    const result = await state.request(query);
    assert.equal(result.status, status);
    assert.equal(result.body.servers, undefined);
    assert.equal(state.writes.length, 0);
  }
});

test('checks revoked tokens, returns legacy IDs and disables caching', async () => {
  const state = fixture();
  const result = await state.request();
  assert.equal(result.status, 200);
  assert.deepEqual(state.authCalls, [['valid', true]]);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.body.servers[0].id, 'server.example.net:443');
  assert.equal(result.body.servers[0].enabled, true);
  assert.equal(result.body.settings.preserved, 'setting');
});

test('reports Auth service permission failures without leaking internals', async () => {
  const state = fixture({tokenError: 'auth/insufficient-permission'});
  const result = await state.request();
  assert.equal(result.status, 500);
  assert.equal(result.body.error, 'Administration is temporarily unavailable');
  assert.equal(state.writes.length, 0);
});

test('membership must exist and be the explicit boolean true', async () => {
  const missing = fixture();
  missing.data.delete('admins/uid');
  assert.equal((await missing.request()).status, 403);
  assert.equal((await fixture({member: 'true'}).request()).status, 403);
});

test('membership is checked again on every save, not just at login', async () => {
  const state = fixture();
  const initial = await state.request();
  state.data.set('admins/uid', {enabled: false});
  const result = await state.request({method: 'PUT', body: {
    revision: initial.body.revision, settings: initial.body.settings, servers: initial.body.servers,
  }});
  assert.equal(result.status, 403);
  assert.equal(state.writes.length, 0);
});

test('saves atomically, retains unknown device fields and adds an audit record', async () => {
  const state = fixture();
  const initial = await state.request();
  const body = {revision: initial.body.revision, settings: {...initial.body.settings, timeout: 2000},
    servers: [{...initial.body.servers[0], host: 'new.example.net', enabled: false}]};
  const result = await state.request({method: 'PUT', body});
  assert.equal(result.status, 200);
  assert.equal(state.data.get('config/servers').servers[0].custom, 12);
  assert.equal(state.data.get('config/servers').legacyTopLevel, true);
  assert.equal(state.data.get('config/servers').servers[0].id, 'server.example.net:443');
  assert.equal(state.data.get('config/config').preserved, 'setting');
  const event = state.writes.find(([path]) => path.startsWith('adminAudit/'))[1];
  assert.equal(event.uid, 'uid');
  assert.deepEqual(event.settingsKeys, ['timeout', 'checkAttempts']);
  assert.deepEqual(event.changedDevices, ['server.example.net:443']);
});

test('rejects stale saves without overwriting configuration or auditing failed writes', async () => {
  const state = fixture();
  const initial = await state.request();
  const body = {revision: initial.body.revision, settings: initial.body.settings, servers: initial.body.servers};
  assert.equal((await state.request({method: 'PUT', body})).status, 200);
  const count = state.writes.length;
  assert.equal((await state.request({method: 'PUT', body})).status, 409);
  assert.equal(state.writes.length, count);
});

test('rejects invalid configuration without writes', async () => {
  const state = fixture();
  assert.equal((await state.request({method: 'PUT', body: {}})).status, 400);
  assert.equal(state.writes.length, 0);
});

test('rejects unsupported content types and oversized payloads without writes', async () => {
  const state = fixture();
  assert.equal((await state.request({method: 'PUT', json: false, body: {}})).status, 415);
  assert.equal((await state.request({method: 'PUT', body: {large: 'x'.repeat(129 * 1024)}})).status, 413);
  assert.equal(state.writes.length, 0);
});

test('enforces CORS, allows trusted preflight, and restricts methods', async () => {
  const state = fixture();
  assert.equal((await state.request({origin: 'https://evil.example'})).status, 403);
  assert.equal((await state.request({method: 'OPTIONS', token: ''})).status, 204);
  assert.equal((await state.request({method: 'POST'})).status, 405);
  assert.equal(trustedOrigin('http://localhost:4200'), true);
  assert.equal(trustedOrigin('https://lw-status--dev-123.web.app'), true);
  assert.equal(trustedOrigin('https://lw-status.web.app.evil.example'), false);
});
