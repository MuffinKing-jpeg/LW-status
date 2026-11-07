const {test} = require('node:test');
const assert = require('node:assert/strict');
const {historyForInventory} = require('../history-data');
const {publicDevice} = require('../monitoring-config');

const router = {id: 'router', name: 'Router', host: 'router.example.net', port: 443};
const deleted = {id: 'deleted', name: 'Removed server', host: 'old.example.net', port: 443};
const observation = (server, available = 'Online') => ({...publicDevice(server), available, latency: 10});

test('removed equipment is excluded from all historical samples', () => {
  const samples = [
    {timestamp: 1, players: 5, equipment: [observation(router), observation(deleted, 'Offline')]},
    {timestamp: 2, players: 7, equipment: [observation(deleted)]},
  ];
  const result = historyForInventory(samples, [router]);
  assert.deepEqual(result.equipment.map(device => device.id), [publicDevice(router).id]);
  assert.equal(result.samples[0].equipment.length, 1);
  assert.deepEqual(result.samples[1].equipment, []);
  assert.deepEqual(result.samples.map(sample => sample.players), [5, 7]);
  assert.equal(samples[0].equipment.length, 2, 'persisted measurements must not be mutated');
});

test('paused equipment retains its history and is explicitly marked', () => {
  const result = historyForInventory([
    {timestamp: 1, players: null, equipment: [observation(router)]},
  ], [{...router, enabled: false}]);
  assert.equal(result.equipment[0].enabled, false);
  assert.equal(result.samples[0].equipment.length, 1);
});

test('empty inventory removes all devices, not player measurements or collection gaps', () => {
  const result = historyForInventory([
    {timestamp: 1, players: 0, equipment: [observation(deleted)]},
    {timestamp: 2, players: null, equipment: null},
  ], []);
  assert.deepEqual(result.equipment, []);
  assert.deepEqual(result.samples, [
    {timestamp: 1, players: 0, equipment: []},
    {timestamp: 2, players: null, equipment: null},
  ]);
});

test('new equipment is listed before the first scheduled measurement', () => {
  const result = historyForInventory([], [router]);
  assert.equal(result.equipment[0].name, 'Router');
  assert.equal(result.equipment[0].enabled, true);
  assert.deepEqual(result.samples, []);
});

test('current device names and IDs survive host and name edits', () => {
  const original = {host: 'legacy.example.net', port: 443, name: 'Old name'};
  const changed = {...original, id: 'legacy.example.net:443', host: 'new.example.net', name: 'New name'};
  const result = historyForInventory([
    {timestamp: 1, players: 1, equipment: [observation(original)]},
  ], [changed]);
  assert.equal(result.equipment[0].name, 'New name');
  assert.equal(result.samples[0].equipment[0].id, result.equipment[0].id);
});

test('inventory metadata never exposes host, port or internal device IDs', () => {
  const device = historyForInventory([], [router]).equipment[0];
  assert.deepEqual(Object.keys(device).sort(), ['enabled', 'icon', 'id', 'name']);
  assert.notEqual(device.id, router.id);
});

test('missing inventory is a service error, not a false empty device list', () => {
  assert.throws(() => historyForInventory([], undefined), /unavailable/);
});
