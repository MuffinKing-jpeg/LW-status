import {createMockHistory} from './history.mock';
import {playerChart, summarizeHistory} from './history.utils';

describe('Demo history', () => {
  const now = Date.UTC(2026, 10, 7, 12);

  [1, 7, 30].forEach(days => {
    it(`generates ${days} days of consistent preview data`, () => {
      const data = createMockHistory(days, now);
      const summary = summarizeHistory(data);
      expect(data.to - data.from).toBe(days * 86400000);
      expect(data.samples.length).toBeGreaterThan(0);
      expect(data.samples.length).toBeLessThan(days * 288);
      expect(data.samples.every(sample => sample.timestamp >= data.from && sample.timestamp < data.to)).toBeTrue();
      expect(data.samples.every(sample => sample.players !== null && sample.players >= 0)).toBeTrue();
      expect(summary.rows.length).toBe(4);
      expect(summary.rows.find(row => row.id === 'demo-web')?.uptime).toBe(100);
      expect(summary.coverage).toBeLessThan(100);
      expect(summary.incidents.some(incident => incident.recovered)).toBeTrue();
      expect(summary.incidents.some(incident => !incident.recovered)).toBeTrue();
      expect(playerChart(data).points.length).toBeLessThanOrEqual(480);
    });
  });

  it('is repeatable for a fixed clock', () => {
    expect(createMockHistory(1, now)).toEqual(createMockHistory(1, now));
  });
});
