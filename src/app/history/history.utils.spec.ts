import {EquipmentSample, HistoryResponse, HistorySample} from './history.interface';
import {playerChart, summarizeHistory} from './history.utils';

const interval = 300000;
const equipment = (available: 'Online' | 'Offline', name = 'Router'): EquipmentSample[] => [
  {id: 'router', name, icon: 'fa-solid fa-server', available, latency: null}
];
const response = (samples: HistorySample[], to = interval * 10): HistoryResponse => ({
  from: 0, to, interval, samples
});

describe('History calculations', () => {
  it('does not treat absent measurements as zero players or successful checks', () => {
    const result = summarizeHistory(response([
      {timestamp: interval, equipment: null, players: null}
    ]));
    expect(result.uptime).toBeNull();
    expect(result.peak).toBeNull();
    expect(result.average).toBeNull();
    expect(result.rows.length).toBe(0);
    expect(result.coverage).toBe(0);
  });

  it('counts actual zero online and excludes failed collections from averages', () => {
    const result = summarizeHistory(response([
      {timestamp: interval, equipment: equipment('Online'), players: 0},
      {timestamp: interval * 2, equipment: null, players: null},
      {timestamp: interval * 3, equipment: equipment('Offline'), players: 10}
    ]));
    expect(result.average).toBe(5);
    expect(result.peak).toBe(10);
    expect(result.uptime).toBe(50);
    expect(result.coverage).toBe(20);
    expect(result.rows[0].cells.some(cell => cell.state === 'unknown')).toBeTrue();
  });

  it('groups consecutive failures and records the observed recovery', () => {
    const result = summarizeHistory(response([
      {timestamp: interval, equipment: equipment('Offline'), players: null},
      {timestamp: interval * 2, equipment: equipment('Offline'), players: null},
      {timestamp: interval * 3, equipment: equipment('Online'), players: null}
    ]));
    expect(result.incidents).toEqual([
      {name: 'Router', from: interval, to: interval * 3, recovered: true}
    ]);
  });

  it('does not infer recovery across gaps or merge separated outages', () => {
    const result = summarizeHistory(response([
      {timestamp: interval, equipment: equipment('Offline'), players: null},
      {timestamp: interval * 4, equipment: equipment('Offline'), players: null},
      {timestamp: interval * 5, equipment: equipment('Online'), players: null}
    ]));
    expect(result.incidents.length).toBe(2);
    expect(result.incidents[0].recovered).toBeTrue();
    expect(result.incidents[1].recovered).toBeFalse();
    expect(result.incidents[1].to).toBe(interval);
  });

  it('ends an observed outage when equipment collection fails', () => {
    const result = summarizeHistory(response([
      {timestamp: interval, equipment: equipment('Offline'), players: null},
      {timestamp: interval * 2, equipment: null, players: null},
      {timestamp: interval * 3, equipment: equipment('Online'), players: null}
    ]));
    expect(result.incidents[0].recovered).toBeFalse();
  });

  it('keeps one equipment row when its display name changes', () => {
    const result = summarizeHistory(response([
      {timestamp: interval, equipment: equipment('Online'), players: 1},
      {timestamp: interval * 2, equipment: equipment('Online', 'New router name'), players: 2}
    ]));
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe('New router name');
  });

  it('marks sparse successful checks as partial coverage, not fully online', () => {
    const result = summarizeHistory(response([
      {timestamp: interval, equipment: equipment('Online'), players: null}
    ], interval * 600));
    expect(result.rows[0].cells[0].state).toBe('mixed');
    expect(result.rows[0].uptime).toBe(100);
    expect(result.rows[0].coverage).toBeLessThan(1);
  });

  it('renders gaps, keeps zeroes, and limits chart points', () => {
    const chart = playerChart(response([
      {timestamp: interval, equipment: null, players: 0},
      {timestamp: interval * 2, equipment: null, players: null},
      {timestamp: interval * 3, equipment: null, players: 20}
    ]));
    expect(chart.points.length).toBe(2);
    expect(chart.segments.length).toBe(2);
    expect(chart.max).toBe(20);
    expect(chart.points[0].online).toBe(0);
  });

  it('preserves actual values and timestamps instead of inventing bucket averages', () => {
    const chart = playerChart(response([
      {timestamp: 10, equipment: null, players: 0},
      {timestamp: 20, equipment: null, players: 100}
    ]));
    expect(chart.points.length).toBe(2);
    expect(chart.points.map(point => point.online)).toEqual([0, 100]);
    expect(chart.points.map(point => point.timestamp)).toEqual([10, 20]);
    expect(chart.max).toBe(100);
  });

  it('uses identical coordinates for SVG paths and dots at all chart widths', () => {
    const data = response([{timestamp: interval, equipment: null, players: 13}, {timestamp: interval * 2, equipment: null, players: 21}]);
    for (const width of [240, 600, 960]) {
      const chart = playerChart(data, width);
      chart.points.forEach(point => expect(chart.segments.join(' ')).toContain(`${point.x},${point.y}`));
      expect(chart.points[1].y).toBeLessThan(chart.points[0].y);
      expect(chart.ticks[0].value).toBeGreaterThanOrEqual(21);
    }
  });

  it('preserves extremes and never connects across missing observations', () => {
    const samples: HistorySample[] = Array.from({length: 2000}, (_, index) => ({timestamp: index * interval, players: index === 70 ? 999 : 10, equipment: null}));
    samples[900].players = null;
    const chart = playerChart(response(samples, 2000 * interval));
    expect(chart.points.length).toBeLessThanOrEqual(480);
    expect(chart.points.some(point => point.online === 999 && point.timestamp === 70 * interval)).toBeTrue();
    expect(chart.segments.length).toBe(2);
  });

  it('hides removed equipment and its incidents even if stale samples still contain it', () => {
    const data = response([{timestamp: interval, equipment: equipment('Offline'), players: 12}]);
    data.equipment = [];
    const result = summarizeHistory(data);
    expect(result.rows).toEqual([]);
    expect(result.incidents).toEqual([]);
    expect(result.uptime).toBeNull();
    expect(result.peak).toBe(12);
  });

  it('lists newly configured equipment without fabricating uptime', () => {
    const data = response([]);
    data.equipment = [{id: 'new', name: 'New device', icon: 'fas fa-server', enabled: true}];
    const row = summarizeHistory(data).rows[0];
    expect(row.name).toBe('New device');
    expect(row.uptime).toBeNull();
    expect(row.coverage).toBe(0);
    expect(row.cells.every(cell => cell.state === 'unknown')).toBeTrue();
  });

  it('uses current names and keeps paused equipment measurements', () => {
    const data = response([{timestamp: interval, equipment: equipment('Online', 'Old name'), players: 0}]);
    data.equipment = [{id: 'router', name: 'Current name', icon: 'fas fa-server', enabled: false}];
    const row = summarizeHistory(data).rows[0];
    expect(row.name).toBe('Current name');
    expect(row.enabled).toBeFalse();
    expect(row.uptime).toBe(100);
  });
  it('does not include operator-excluded failures in outage or uptime statistics', () => {
    const first = equipment('Online');
    const failed = equipment('Offline').map(device => ({...device, excludedFromStats: true}));
    const result = summarizeHistory(response([
      {timestamp: interval, equipment: first, players: 5},
      {timestamp: interval * 2, equipment: failed, players: 7},
      {timestamp: interval * 3, equipment: first, players: 9}
    ]));
    expect(result.incidents.length).toBe(0);
    expect(result.uptime).toBe(100);
    expect(result.rows[0].coverage).toBe(20);
    expect(result.peak).toBe(9);
  });
});
