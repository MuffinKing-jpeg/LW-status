import {ElementRef, NgZone} from '@angular/core';
import {PlayerChartComponent} from './player-chart.component';

describe('Player chart interaction', () => {
  it('shows the actual online count and time at the hovered dot', () => {
    const chart = new PlayerChartComponent({run: (callback: () => void) => callback()} as NgZone);
    chart.data = {from: 0, to: 900000, interval: 300000, samples: [
      {timestamp: 300000, equipment: null, players: 3}, {timestamp: 600000, equipment: null, players: 19}
    ]};
    const point = chart.chart.points[1];
    chart.hover({currentTarget: {getBoundingClientRect: () => ({left: 10, top: 20, width: 480, height: 240})},
      clientX: 10 + point.x / 2, clientY: 20 + point.y} as unknown as PointerEvent);
    expect(chart.active?.online).toBe(19);
    expect(chart.active?.timestamp).toBe(600000);
    chart.key({key: 'Home', preventDefault: () => {}} as KeyboardEvent);
    expect(chart.active?.online).toBe(3);
    chart.key({key: 'Escape'} as KeyboardEvent);
    expect(chart.active).toBeNull();
  });
  it('positions the tooltip in screen coordinates even before a resize observer fires', () => {
    const chart = new PlayerChartComponent({run: (callback: () => void) => callback()} as NgZone);
    chart.data = {from: 0, to: 900000, interval: 300000, samples: [{timestamp: 450000, players: 10, equipment: null}]};
    chart.frame = new ElementRef({clientWidth: 320} as HTMLElement);
    chart.activeIndex = 0;
    expect(chart.tooltipLeft).toBeCloseTo(chart.chart.points[0].x / 3, 1);
  });
});
