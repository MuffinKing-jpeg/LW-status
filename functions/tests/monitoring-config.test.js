const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {validateConfiguration, editableServer, revisionOf} = require('../monitoring-config');

const device = () => ({
  id: 'router-1', name: 'Router', host: 'router.example.net',
  port: 443, icon: 'fa-solid fa-server', enabled: true,
});
const configuration = () => ({revision: 'missing/missing', settings: {timeout: 1000}, servers: [device()]});

test('validates domain, IP, IPv6 and private-network equipment', () => {
  for (const host of ['example.net', 'localhost', '10.0.0.1', '::1']) {
    const body = configuration();
    body.servers[0].host = host;
    assert.equal(validateConfiguration(body).servers[0].host, host);
  }
});

test('rejects malformed hosts, ports, IDs, icons and monitoring flags', () => {
  for (const patch of [
    {host: 'https://example.net'}, {host: 'bad host'}, {host: 'x/route'},
    {port: 0}, {port: 65536}, {port: 1.5}, {port: '443'}, {enabled: 'false'},
    {name: ' '}, {id: ''}, {icon: '<script>'},
  ]) {
    const body = configuration();
    Object.assign(body.servers[0], patch);
    assert.throws(() => validateConfiguration(body), {status: 400});
  }
});

test('bounds timeout and rejects duplicate IDs and endpoints', () => {
  for (const timeout of [99, 10001, 1.5, '1000', null]) {
    const body = configuration();
    body.settings.timeout = timeout;
    assert.throws(() => validateConfiguration(body), {status: 400});
  }
  for (const extra of [device(), {...device(), id: 'another'}]) {
    const body = configuration();
    body.servers.push(extra);
    assert.throws(() => validateConfiguration(body), {status: 400});
  }
});

test('rejects oversized, malformed and prototype-polluting settings', () => {
  const body = configuration();
  for (const settings of [[], null, {timeout: 1000, value: 'x'.repeat(17000)},
    JSON.parse('{"timeout":1000,"nested":{"__proto__":{}}}')]) {
    body.settings = settings;
    assert.throws(() => validateConfiguration(body), {status: 400});
  }
});

test('permits intentionally empty monitoring and preserves extra config', () => {
  const body = configuration();
  body.servers = [];
  body.settings.extra = {a: [1, 2]};
  assert.deepEqual(validateConfiguration(body).settings.extra, {a: [1, 2]});
});

test('keeps legacy equipment history hash unchanged, including after host edits', () => {
  const old = {host: 'server.example.net', port: 443, name: 'Server'};
  const editable = editableServer(old);
  const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
  assert.equal(hash(editable.id), hash(`${old.host}:${old.port}`));
  editable.host = 'new.example.net';
  assert.equal(hash(editableServer(editable).id), hash(`${old.host}:${old.port}`));
});

test('revision distinguishes changes less than a millisecond apart', () => {
  assert.notEqual(revisionOf({updateTime: {seconds: 10, nanoseconds: 1}}),
      revisionOf({updateTime: {seconds: 10, nanoseconds: 2}}));
});

test('normalizes legacy string ports without changing their history seed', () => {
  const server = editableServer({host: 'example.net', port: '443'});
  assert.equal(server.port, 443);
  assert.equal(server.id, 'example.net:443');
});
test('validates configurable attempt counts and defaults legacy settings to three', () => {
  assert.equal(validateConfiguration(configuration()).settings.checkAttempts, 3);
  for (const attempts of [1, 5]) {
    const body = configuration(); body.settings.checkAttempts = attempts;
    assert.equal(validateConfiguration(body).settings.checkAttempts, attempts);
  }
  for (const attempts of [0, 6, 1.5, '3', null]) {
    const body = configuration(); body.settings.checkAttempts = attempts;
    assert.throws(() => validateConfiguration(body), {status: 400});
  }
});
