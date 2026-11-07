import {Component, OnDestroy, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {delay, of, Subscription} from 'rxjs';
import {environment} from '../../environments/environment';
import {HistoryResponse} from './history.interface';
import {createMockHistory} from './history.mock';
import {playerChart, summarizeHistory, TimelineCell} from './history.utils';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit, OnDestroy {
  readonly demoAvailable = !environment.production;
  demoMode = this.demoAvailable && environment.HISTORY_MOCK;
  days = 1;
  periods = [{days: 1, label: '24 hours'}, {days: 7, label: '7 days'}, {days: 30, label: '30 days'}];
  loading = false;
  error = false;
  data?: HistoryResponse;
  summary?: ReturnType<typeof summarizeHistory>;
  chart = {segments: [] as string[], points: [] as ReturnType<typeof playerChart>['points'], max: 1};
  private request?: Subscription;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }

  load(days = this.days): void {
    this.request?.unsubscribe();
    this.days = days;
    this.loading = true;
    this.error = false;
    this.data = undefined;
    this.summary = undefined;
    const source = this.demoMode && this.demoAvailable ? of(createMockHistory(days)).pipe(delay(200)) :
      this.http.get<HistoryResponse>(environment.HISTORY_URL, {params: {days}});
    this.request = source.subscribe({
      next: data => {
        this.data = data;
        this.summary = summarizeHistory(data);
        this.chart = playerChart(data);
        this.loading = false;
      },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  toggleDemo(): void {
    if (!this.demoAvailable) return;
    this.demoMode = !this.demoMode;
    this.load();
  }

  cellTitle(cell: TimelineCell): string {
    return `${new Date(cell.from).toLocaleString()} – ${new Date(cell.to).toLocaleString()}: ` +
      (cell.uptime === null ? 'No measurements' : `${cell.uptime.toFixed(1)}% online (measured checks)`);
  }
}
