const {publicDevice} = require('./monitoring-config');

const historyForInventory = (samples, servers) => {
  if (!Array.isArray(servers)) throw new Error('Monitoring inventory is unavailable');
  // Include paused devices, but never resurrect deleted ones from old samples.
  const equipment = servers.map((server) => ({
    ...publicDevice(server), enabled: server.enabled !== false,
  }));
  const currentIds = new Set(equipment.map((server) => server.id));
  return {
    equipment,
    excludedChecks: samples.reduce((count, sample) => count + (sample.equipment || [])
        .filter((server) => currentIds.has(server.id) && server.excludedFromStats === true).length, 0),
    samples: samples.map((sample) => ({
      ...sample,
      equipment: sample.equipment === null ? null :
        sample.equipment.filter((server) => currentIds.has(server.id) && server.excludedFromStats !== true),
    })),
  };
};

module.exports = {historyForInventory};
