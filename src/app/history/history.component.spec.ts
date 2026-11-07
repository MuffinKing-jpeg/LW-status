import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {CommonModule} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {environment} from '../../environments/environment';
import {HistoryComponent} from './history.component';

describe('HistoryComponent', () => {
  let fixture: ComponentFixture<HistoryComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, HttpClientTestingModule], declarations: [HistoryComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(HistoryComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); http.verify(); });

  it('renders an empty state instead of fabricated history', () => {
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({
      from: 0, to: 86400000, interval: 300000, samples: []
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your history starts here');
  });

  it('offers a retry after an API error', () => {
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({}, {status: 503, statusText: 'Unavailable'});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('History is unavailable');
    fixture.componentInstance.load();
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({
      from: 0, to: 86400000, interval: 300000, samples: []
    });
    expect(fixture.componentInstance.error).toBeFalse();
  });

  it('cancels the previous request when the period changes', () => {
    const first = http.expectOne(`${environment.HISTORY_URL}?days=1`);
    fixture.componentInstance.load(7);
    expect(first.cancelled).toBeTrue();
    http.expectOne(`${environment.HISTORY_URL}?days=7`).flush({
      from: 0, to: 604800000, interval: 300000, samples: []
    });
    expect(fixture.componentInstance.days).toBe(7);
  });
});
