import {EquipmentSample, HistoryResponse, HistorySample} from './history.interface';

/** Synthetic preview data only. Nothing is written to Firebase. */
export function createMockHistory(days: number, now = Date.now()): HistoryResponse {
  const interval = 5 * 60 * 1000;
  const to = Math.floor(now / interval) * interval;
  const from = to - days * 24 * 60 * 60 * 1000;
  const samples: HistorySample[] = [];
  const servers = [
    {id: 'demo-edge', name: 'Edge router', icon: 'fa-solid fa-network-wired'},
    {id: 'demo-web', name: 'Web server', icon: 'fa-solid fa-server'},
    {id: 'demo-db', name: 'Database', icon: 'fa-solid fa-database'},
    {id: 'demo-storage', name: 'Storage node', icon: 'fa-solid fa-hard-drive'}
  ];

  for (let timestamp = from; timestamp < to; timestamp += interval) {
    const ageMinutes = (to - timestamp) / 60000;
    const dailyAge = ageMinutes % 1440;
    // Simulate a monitoring gap, not an outage or zero online.
    if (dailyAge >= 270 && dailyAge < 300) continue;

    const hours = new Date(timestamp).getHours() + new Date(timestamp).getMinutes() / 60;
    const dayWave = (Math.cos((hours - 20) / 24 * Math.PI * 2) + 1) / 2;
    const noise = Math.sin(timestamp / interval * 1.7) * 7;
    const players = Math.max(0, Math.round(18 + dayWave * 105 + noise));
    const equipment: EquipmentSample[] = servers.map((server, index) => {
      const offline = (index === 0 && dailyAge >= 70 && dailyAge < 90) ||
        (index === 2 && dailyAge >= 360 && dailyAge < 390) ||
        (index === 3 && ageMinutes <= 15);
      return {...server, available: offline ? 'Offline' : 'Online',
        latency: offline ? null : 8 + index * 4 + Math.round(Math.abs(noise))};
    });
    samples.push({timestamp, players, equipment});
  }

  return {from, to, interval, samples, equipment: servers.map(server => ({...server, enabled: true}))};
}
