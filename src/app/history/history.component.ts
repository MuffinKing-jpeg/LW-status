import {Component, OnDestroy, OnInit} from '@angular/core';
import {formatDate, formatNumber} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {delay, of, Subscription} from 'rxjs';
import {environment} from '../../environments/environment';
import {HistoryResponse} from './history.interface';
import {createMockHistory} from './history.mock';
import {summarizeHistory, TimelineCell} from './history.utils';
import {InfrastructureState, InfrastructureStatusService} from '../services/infrastructure-status.service';
import {LocalizationService} from '../i18n/localization.service';

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
  private request?: Subscription;
  private readonly cellTitles = new WeakMap<TimelineCell, {locale: string; text: string}>();

  constructor(private http: HttpClient, public infrastructure: InfrastructureStatusService, private i18n: LocalizationService) {}

  get demoState(): InfrastructureState | null {
    if (!this.data) return null;
    const latest = this.data.samples[this.data.samples.length - 1];
    const paused = new Set(this.data.equipment?.filter(device => device.enabled === false).map(device => device.id));
    return {devices: (latest?.equipment || []).filter(device => !paused.has(device.id)),
      checkedAt: latest?.timestamp || null, loading: false, error: !latest?.equipment};
  }

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }

  load(days = this.days): void {
    this.request?.unsubscribe();
    this.days = days;
    this.loading = true;
    this.error = false;
    this.data = undefined;
    this.summary = undefined;
    if (!this.demoMode) this.infrastructure.refresh();
    const source = this.demoMode && this.demoAvailable ? of(createMockHistory(days)).pipe(delay(200)) :
      this.http.get<HistoryResponse>(environment.HISTORY_URL, {params: {days}});
    this.request = source.subscribe({
      next: data => {
        this.data = data;
        this.summary = summarizeHistory(data);
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
    const cached = this.cellTitles.get(cell);
    if (cached?.locale === this.i18n.locale) return cached.text;
    const text = `${formatDate(cell.from, 'medium', this.i18n.locale)} – ${formatDate(cell.to, 'medium', this.i18n.locale)}: ` +
      (cell.uptime === null ? this.i18n.translate('No measurements') : this.i18n.translate('{value}% online (measured checks)',
        {value: formatNumber(cell.uptime, this.i18n.locale, '1.1-1')}));
    this.cellTitles.set(cell, {locale: this.i18n.locale, text});
    return text;
  }
}
