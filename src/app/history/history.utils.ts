import {EquipmentInfo, HistoryResponse} from './history.interface';

export interface TimelineCell {
  state: 'online' | 'offline' | 'mixed' | 'unknown';
  from: number;
  to: number;
  uptime: number | null;
}

export interface Incident {
  name: string;
  from: number;
  to: number;
  recovered: boolean;
}

export function summarizeHistory(data: HistoryResponse) {
  const equipment = new Map<string, EquipmentInfo>();
  if (data.equipment !== undefined) {
    data.equipment.forEach(server => equipment.set(server.id, server));
  } else {
    data.samples.forEach(sample => sample.equipment?.forEach(server => equipment.set(server.id, server)));
  }
  const incidents: Incident[] = [];
  let totalChecks = 0;
  let onlineChecks = 0;
  const rows = Array.from(equipment.values()).map(server => {
    let checked = 0;
    let online = 0;
    let active: Incident | undefined;
    let previous = 0;
    const cells: TimelineCell[] = Array.from({length: 60}, (_, index) => ({
      state: 'unknown', from: data.from + (data.to - data.from) * index / 60,
      to: data.from + (data.to - data.from) * (index + 1) / 60, uptime: null
    }));
    const counts = cells.map(() => ({online: 0, total: 0}));
    data.samples.forEach(sample => {
      const status = sample.equipment?.find(item => item.id === server.id);
      // Do not join outages across unobserved intervals.
      if (active && (!status || sample.timestamp - previous > data.interval * 1.5)) {
        incidents.push(active);
        active = undefined;
      }
      if (!status) return;
      checked++;
      const isOnline = status.available === 'Online';
      if (isOnline) online++;
      const index = Math.min(59, Math.max(0,
        Math.floor((sample.timestamp - data.from) / (data.to - data.from) * 60)));
      counts[index].total++;
      if (isOnline) counts[index].online++;
      if (!isOnline) {
        if (!active) active = {name: server.name, from: sample.timestamp, to: sample.timestamp, recovered: false};
        active.to = sample.timestamp;
      } else if (active) {
        active.to = sample.timestamp;
        active.recovered = true;
        incidents.push(active);
        active = undefined;
      }
      previous = sample.timestamp;
    });
    if (active) incidents.push(active);
    counts.forEach((count, index) => {
      const cell = cells[index];
      cell.uptime = count.total ? count.online / count.total * 100 : null;
      // Sparse observations are not painted as continuous availability.
      const expected = Math.max(1, (cell.to - cell.from) / data.interval);
      cell.state = !count.total ? 'unknown' : count.online === 0 ? 'offline' :
        count.online < count.total || count.total < expected * 0.8 ? 'mixed' : 'online';
    });
    totalChecks += checked;
    onlineChecks += online;
    return {...server, cells, uptime: checked ? online / checked * 100 : null,
      coverage: Math.min(100, checked * data.interval / (data.to - data.from) * 100)};
  });
  const players = data.samples.filter(sample => sample.players !== null);
  return {
    rows, incidents: incidents.sort((a, b) => b.from - a.from),
    uptime: totalChecks ? onlineChecks / totalChecks * 100 : null,
    peak: players.length ? Math.max(...players.map(sample => sample.players!)) : null,
    average: players.length ? players.reduce((sum, sample) => sum + sample.players!, 0) / players.length : null,
    coverage: rows.length ? rows.reduce((sum, row) => sum + row.coverage, 0) / rows.length : 0
  };
}

// Bucket to a maximum of 240 points while retaining gaps and peak values.
export function playerChart(data: HistoryResponse) {
  const width = 960;
  const height = 200;
  const buckets = Array.from({length: 240}, () => [] as number[]);
  data.samples.forEach(sample => {
    if (sample.players === null) return;
    const index = Math.min(239, Math.max(0,
      Math.floor((sample.timestamp - data.from) / (data.to - data.from) * 240)));
    buckets[index].push(sample.players);
  });
  const max = Math.max(1, ...data.samples.map(sample => sample.players || 0));
  const segments: string[] = [];
  let segment = '';
  const points: {x: number; y: number; timestamp: number; average: number; peak: number}[] = [];
  buckets.forEach((values, index) => {
    if (!values.length) {
      if (segment) segments.push(segment);
      segment = '';
      return;
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const x = (index + 0.5) / 240 * width;
    const y = height - average / max * (height - 12);
    segment += `${segment ? ' L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    points.push({x, y, timestamp: data.from + (index + 0.5) / 240 * (data.to - data.from),
      average, peak: Math.max(...values)});
  });
  if (segment) segments.push(segment);
  return {segments, points, max};
}
