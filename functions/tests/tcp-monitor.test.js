const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {probeTcp, checkTcpWithRetries} = require('../tcp-monitor');
const server = {host: 'example.net', port: 443};

test('a successful first check is not repeated', async () => {
  let calls = 0;
  const result = await checkTcpWithRetries(server, {timeout: 5000}, {
    probe: async target => { calls++; assert.equal(target.timeoutMs, 5000); return {online: true, latency: 12}; },
    pause: async () => { assert.fail('No pause after a success'); },
  });
  assert.equal(calls, 1);
  assert.equal(result.available, 'Online');
  assert.equal(result.attemptsUsed, 1);
});
test('retries a transient failure and stops immediately after recovery', async () => {
  let calls = 0;
  const pauses = [];
  const result = await checkTcpWithRetries(server, {timeout: 5000}, {
    probe: async () => ++calls === 1 ? {online: false, reason: 'ETIMEDOUT'} : {online: true, latency: 20},
    pause: async ms => { pauses.push(ms); },
  });
  assert.equal(result.available, 'Online');
  assert.equal(result.attemptsUsed, 2);
  assert.equal(result.latency, 20);
  assert.deepEqual(pauses, [500]);
});
test('marks offline only after three failures, with a bounded timeout and reason', async () => {
  let calls = 0;
  let pauses = 0;
  const result = await checkTcpWithRetries(server, {timeout: 999999}, {
    probe: async target => { calls++; assert.equal(target.timeoutMs, 10000); return {online: false, reason: 'ECONNREFUSED'}; },
    pause: async () => { pauses++; },
  });
  assert.equal(calls, 3);
  assert.equal(pauses, 2);
  assert.deepEqual(result, {available: 'Offline', latency: null, attemptsUsed: 3, failureReason: 'ECONNREFUSED'});
});
test('does not mistake an implementation failure for equipment downtime', async () => {
  await assert.rejects(checkTcpWithRetries(server, {}, {probe: async () => { throw new Error('Internal checker failure'); }}), /Internal checker failure/);
});
test('honors the configurable total number of attempts from one through five', async () => {
  for (const attempts of [1, 2, 5]) {
    let calls = 0;
    let pauses = 0;
    const result = await checkTcpWithRetries(server, {timeout: 5000, checkAttempts: attempts}, {
      probe: async () => { calls++; return {online: false, reason: 'ETIMEDOUT'}; },
      pause: async () => { pauses++; },
    });
    assert.equal(calls, attempts);
    assert.equal(pauses, attempts - 1);
    assert.equal(result.attemptsUsed, attempts);
  }
});
test('TCP success destroys the socket and settles only once', async () => {
  const socket = new EventEmitter();
  let destroyed = 0;
  socket.destroy = () => { destroyed++; };
  let clock = 10;
  const pending = probeTcp({...server, timeoutMs: 100}, {connect: () => socket, now: () => clock});
  clock = 25;
  socket.emit('connect');
  socket.emit('close');
  assert.deepEqual(await pending, {online: true, latency: 15, reason: null});
  assert.equal(destroyed, 1);
});
test('TCP errors and deadlines retain safe diagnostic codes', async () => {
  const socket = new EventEmitter(); socket.destroy = () => {};
  const pending = probeTcp({...server, timeoutMs: 100}, {connect: () => socket});
  socket.emit('error', Object.assign(new Error('Private host details'), {code: 'ENOTFOUND'}));
  assert.equal((await pending).reason, 'ENOTFOUND');
  const stalled = new EventEmitter(); stalled.destroy = () => {};
  assert.equal((await probeTcp({...server, timeoutMs: 5}, {connect: () => stalled})).reason, 'ETIMEDOUT');
});
