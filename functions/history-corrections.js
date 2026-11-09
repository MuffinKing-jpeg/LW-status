const crypto = require('crypto');
const CHECK_INTERVAL = 5 * 60 * 1000;

const observation = (sample, id) => {
  const matches = Array.isArray(sample.equipment) ? sample.equipment.filter((device) => device && device.id === id) : [];
  return matches.length === 1 ? matches[0] : null;
};

const isIsolatedFailure = (before, current, after, id) => {
  const previous = observation(before, id);
  const failed = observation(current, id);
  const recovered = observation(after, id);
  return Boolean(current.timestamp > before.timestamp && after.timestamp > current.timestamp &&
    current.timestamp - before.timestamp <= CHECK_INTERVAL &&
    after.timestamp - current.timestamp <= CHECK_INTERVAL &&
    previous && previous.available === 'Online' && previous.excludedFromStats !== true &&
    failed && failed.available === 'Offline' && failed.excludedFromStats !== true &&
    // Repeated, confirmed failures must not be dismissed as single-probe noise.
    (failed.attemptsUsed === undefined || failed.attemptsUsed === 1) &&
    recovered && recovered.available === 'Online' && recovered.excludedFromStats !== true);
};

const planCorrections = (records, currentIds) => {
  if (!Array.isArray(records) || !(currentIds instanceof Set)) throw new Error('History and current inventory are required');
  if (records.some((record) => !Number.isFinite(record.data.timestamp))) throw new Error('Invalid history timestamp; refusing cleanup');
  const ordered = [...records].sort((a, b) => a.data.timestamp - b.data.timestamp);
  const plan = [];
  for (let index = 1; index < ordered.length - 1; index++) {
    const before = ordered[index - 1];
    const current = ordered[index];
    const after = ordered[index + 1];
    const ids = [...currentIds].filter((id) => isIsolatedFailure(before.data, current.data, after.data, id));
    if (ids.length) plan.push({documentId: current.id, beforeId: before.id, afterId: after.id,
      timestamp: current.data.timestamp, deviceIds: ids});
  }
  return plan;
};

const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ?
  Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const fingerprint = (equipment) => crypto.createHash('sha256').update(JSON.stringify(canonical(equipment))).digest('hex');

const applyCorrection = async (db, runId, entry, now = Date.now()) => {
  const target = db.doc(`history/${entry.documentId}`);
  const backup = db.doc(`historyCorrections/${runId}/samples/${entry.documentId}`);
  return db.runTransaction(async (transaction) => {
    const [before, current, after, archived] = await Promise.all([
      transaction.get(db.doc(`history/${entry.beforeId}`)), transaction.get(target),
      transaction.get(db.doc(`history/${entry.afterId}`)), transaction.get(backup),
    ]);
    if (!before.exists || !current.exists || !after.exists || archived.exists || current.data().timestamp !== entry.timestamp) return 0;
    const ids = entry.deviceIds.filter((id) => isIsolatedFailure(before.data(), current.data(), after.data(), id));
    if (!ids.length) return 0;
    const original = current.data().equipment;
    const changed = original.map((device) => ids.includes(device.id) ? {...device, excludedFromStats: true,
      exclusion: {reason: 'operator-reviewed-isolated-failure', runId, correctedAt: now}} : device);
    // Save the exact original array atomically. Never turn Offline into Online,
    // delete a shared player sample, or overwrite another device's observation.
    transaction.create(backup, {timestamp: entry.timestamp, deviceIds: ids,
      beforeEquipment: original, afterHash: fingerprint(changed), createdAt: new Date(now)});
    transaction.update(target, {equipment: changed});
    return ids.length;
  });
};

const restoreCorrection = async (db, runId, sampleId, now = Date.now()) => {
  const target = db.doc(`history/${sampleId}`);
  const backup = db.doc(`historyCorrections/${runId}/samples/${sampleId}`);
  return db.runTransaction(async (transaction) => {
    const [current, archived] = await Promise.all([transaction.get(target), transaction.get(backup)]);
    if (!current.exists || !archived.exists) return 0;
    const saved = archived.data();
    if (saved.restoredAt || current.data().timestamp !== saved.timestamp ||
        !Array.isArray(current.data().equipment) || fingerprint(current.data().equipment) !== saved.afterHash) return 0;
    transaction.update(target, {equipment: saved.beforeEquipment});
    transaction.update(backup, {restoredAt: new Date(now)});
    return saved.deviceIds.length;
  });
};

module.exports = {CHECK_INTERVAL, isIsolatedFailure, planCorrections, fingerprint, applyCorrection, restoreCorrection};
