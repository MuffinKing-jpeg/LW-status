import {OutageLogComponent} from './outage-log.component';

describe('Collapsed outage log', () => {
  it('shows five initially, reveals more without losing entries, and collapses again', () => {
    const log = new OutageLogComponent();
    log.incidents = Array.from({length: 18}, (_, index) => ({name: `Server ${index}`, from: index, to: index, recovered: true}));
    expect(log.visibleCount).toBe(5);
    expect(log.remaining).toBe(13);
    log.more(); expect(log.visibleCount).toBe(15);
    log.more(); expect(log.visibleCount).toBe(18);
    expect(log.remaining).toBe(0);
    log.collapse(); expect(log.visibleCount).toBe(5);
    log.incidents = []; expect(log.visibleCount).toBe(5);
  });
});
