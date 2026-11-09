const {test} = require('node:test');
const assert = require('node:assert/strict');
const {planCorrections, fingerprint, applyCorrection, restoreCorrection} = require('../history-corrections');
const {parseOptions} = require('../scripts/clean-short-outages');
const interval = 300000;
const device = (available, extra = {}) => ({id: 'router', name: 'Router', available, latency: null, ...extra});
const sample = (id, timestamp, available, extra = {}) => ({id, data: {timestamp, players: 17,
  equipment: available === null ? null : [device(available, extra)]}});
const records = () => [sample('one', 0, 'Online'), sample('two', interval, 'Offline'), sample('three', interval * 2, 'Online')];
const ids = new Set(['router']);

const database = (source) => {
  const data = new Map(source.map(record => [`history/${record.id}`, structuredClone(record.data)]));
  const snapshot = ref => ({exists: data.has(ref.path), data: () => structuredClone(data.get(ref.path))});
  return {data, doc: path => ({path}), runTransaction: async callback => {
    const writes = [];
    const result = await callback({get: async ref => snapshot(ref),
      create: (ref, value) => { assert.ok(!data.has(ref.path)); writes.push([ref.path, value]); },
      update: (ref, value) => writes.push([ref.path, {...data.get(ref.path), ...value}]),
    });
    writes.forEach(([path, value]) => data.set(path, structuredClone(value)));
    return result;
  }};
};

test('selects only an isolated failed observation bracketed by timely successes', () => {
  assert.deepEqual(planCorrections(records(), ids), [{documentId: 'two', beforeId: 'one', afterId: 'three', timestamp: interval, deviceIds: ['router']}]);
  assert.equal(planCorrections(records(), new Set()).length, 0);
});
test('does not dismiss ongoing, longer, missing, already excluded or retried failures', () => {
  const cases = [
    records().slice(0, 2), records().slice(1),
    [sample('one', 0, 'Online'), sample('two', interval, 'Offline'), sample('three', interval * 2, 'Offline'), sample('four', interval * 3, 'Online')],
    [sample('one', 0, 'Online'), sample('two', interval * 2, 'Offline'), sample('three', interval * 3, 'Online')],
    [sample('one', 0, null), ...records().slice(1)],
    [records()[0], sample('two', interval, 'Offline', {excludedFromStats: true}), records()[2]],
    [records()[0], sample('two', interval, 'Offline', {attemptsUsed: 3}), records()[2]],
  ];
  cases.forEach(source => assert.equal(planCorrections(source, ids).length, 0));
});
test('excludes only the targeted observation with an atomic, reversible backup', async () => {
  const source = records();
  source[1].data.equipment.push({id: 'database', available: 'Offline', latency: null});
  const db = database(source);
  const entry = planCorrections(source, ids)[0];
  assert.equal(await applyCorrection(db, 'test-run', entry, 123), 1);
  const current = db.data.get('history/two');
  assert.equal(current.players, 17);
  assert.equal(current.equipment[0].available, 'Offline', 'never fabricate a successful check');
  assert.equal(current.equipment[0].excludedFromStats, true);
  assert.equal(current.equipment[1].excludedFromStats, undefined);
  assert.deepEqual(db.data.get('historyCorrections/test-run/samples/two').beforeEquipment, source[1].data.equipment);
  assert.equal(await applyCorrection(db, 'test-run', entry), 0);
  assert.equal(await restoreCorrection(db, 'test-run', 'two'), 1);
  assert.deepEqual(db.data.get('history/two'), source[1].data);
  assert.equal(await restoreCorrection(db, 'test-run', 'two'), 0);
});
test('rechecks neighbors transactionally instead of applying stale preview assumptions', async () => {
  const source = records();
  const entry = planCorrections(source, ids)[0];
  const db = database(source);
  db.data.set('history/three', sample('three', interval * 2, 'Offline').data);
  assert.equal(await applyCorrection(db, 'test-run', entry), 0);
  assert.equal(db.data.has('historyCorrections/test-run/samples/two'), false);
});
test('restoration does not overwrite subsequent modifications or recreate expired samples', async () => {
  const source = records();
  const db = database(source);
  await applyCorrection(db, 'test-run', planCorrections(source, ids)[0]);
  db.data.get('history/two').equipment.push({id: 'new', available: 'Online'});
  assert.equal(await restoreCorrection(db, 'test-run', 'two'), 0);
  db.data.delete('history/two');
  assert.equal(await restoreCorrection(db, 'test-run', 'two'), 0);
});
test('fingerprints do not depend on Firestore object property ordering', () => {
  assert.equal(fingerprint([{available: 'Online', id: 'a'}]), fingerprint([{id: 'a', available: 'Online'}]));
});
test('maintenance is read-only by default and requires explicit confirmation for changes', () => {
  assert.equal(parseOptions([]).mode, 'preview');
  assert.throws(() => parseOptions(['apply']), /confirm/);
  assert.equal(parseOptions(['apply', '--confirm', 'EXCLUDE_SINGLE_FAILURES']).mode, 'apply');
  assert.throws(() => parseOptions(['preview', '--days', '31']));
  assert.throws(() => parseOptions(['restore', '--run-id', '../../config', '--confirm', 'RESTORE_SINGLE_FAILURES']));
});
