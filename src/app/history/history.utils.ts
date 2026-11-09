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
      const status = sample.equipment?.find(item => item.id === server.id && item.excludedFromStats !== true);
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

// Select real observations (first/min/max/last per interval), never synthetic
// averages or bucket-center timestamps. Coordinates are shared by line and dots.
export function playerChart(data: HistoryResponse, width = 960) {
  const height = 240;
  const left = 42;
  const right = Math.max(left + 1, width - 12);
  const top = 16;
  const bottom = 206;
  const buckets = Array.from({length: 120}, () => [] as {timestamp: number; online: number; segment: number}[]);
  let segment = 0;
  let previous: number | null = null;
  let count = 0;
  const duration = data.to - data.from;
  const unique = new Map(data.samples.map(sample => [sample.timestamp, sample]));
  Array.from(unique.values()).sort((a, b) => a.timestamp - b.timestamp).forEach(sample => {
    if (duration <= 0 || sample.timestamp < data.from || sample.timestamp > data.to) return;
    if (sample.players === null || !Number.isFinite(sample.players) || sample.players < 0) { previous = null; return; }
    if (previous === null || sample.timestamp - previous > data.interval * 1.5) segment++;
    previous = sample.timestamp;
    count++;
    const index = Math.min(119, Math.floor((sample.timestamp - data.from) / duration * 120));
    buckets[index].push({timestamp: sample.timestamp, online: sample.players, segment});
  });
  const selected = buckets.flatMap(values => {
    if (!values.length) return [];
    const minimum = values.reduce((a, b) => a.online <= b.online ? a : b);
    const maximum = values.reduce((a, b) => a.online >= b.online ? a : b);
    return Array.from(new Map([values[0], minimum, maximum, values[values.length - 1]].map(point => [point.timestamp, point])).values());
  }).sort((a, b) => a.timestamp - b.timestamp);
  const max = Math.max(1, ...selected.map(point => point.online));
  const step = Math.max(1, Math.pow(10, Math.floor(Math.log10(max))) / 2);
  const axisMax = Math.ceil(max / (2 * step)) * 2 * step;
  const round = (value: number) => Number(value.toFixed(2));
  const points = selected.map(point => ({...point,
    x: round(left + (point.timestamp - data.from) / duration * (right - left)),
    y: round(bottom - point.online / axisMax * (bottom - top))
  }));
  const segments: string[] = [];
  let path = '';
  points.forEach((point, index) => {
    if (index === 0 || point.segment !== points[index - 1].segment) {
      if (path) segments.push(path);
      path = `M${point.x},${point.y}`;
    } else path += ` L${point.x},${point.y}`;
  });
  if (path) segments.push(path);
  return {width, height, left, right, top, bottom, max, axisMax, segments, points, downsampled: count > points.length,
    ticks: [{y: top, value: axisMax}, {y: (top + bottom) / 2, value: axisMax / 2}, {y: bottom, value: 0}]};
}
