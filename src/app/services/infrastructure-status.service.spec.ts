import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {environment} from '../../environments/environment';
import {InfrastructureState, InfrastructureStatusService} from './infrastructure-status.service';

describe('Shared infrastructure monitoring', () => {
  let service: InfrastructureStatusService;
  let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({imports: [HttpClientTestingModule]}); service = TestBed.inject(InfrastructureStatusService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());

  it('shares checks between views and stops polling after the last subscriber leaves', fakeAsync(() => {
    const first = service.state$.subscribe();
    const second = service.state$.subscribe();
    tick(0);
    http.expectOne(request => request.url === environment.API_URL).flush([]);
    first.unsubscribe();
    tick(60000);
    http.expectOne(request => request.url === environment.API_URL).flush([]);
    second.unsubscribe();
    tick(60000);
    http.expectNone(request => request.url === environment.API_URL);
  }));
  it('refreshes manually and distinguishes monitoring failure from equipment outage', fakeAsync(() => {
    let state: InfrastructureState | undefined;
    const subscription = service.state$.subscribe(value => { state = value; });
    tick(0);
    http.expectOne(request => request.url === environment.API_URL).flush([{name: 'Router', icon: 'fas fa-server', available: 'Online'}]);
    expect(state!.error).toBeFalse();
    service.refresh();
    http.expectOne(request => request.url === environment.API_URL).flush({}, {status: 503, statusText: 'Unavailable'});
    expect(state!.error).toBeTrue();
    expect(state!.devices[0].available).toBe('Online');
    service.refresh();
    http.expectOne(request => request.url === environment.API_URL).flush([{name: 'Router', icon: 'fas fa-server', available: 'Offline'}]);
    expect(state!.error).toBeFalse();
    expect(state!.devices[0].available).toBe('Offline');
    subscription.unsubscribe();
  }));
  it('treats malformed responses as an unavailable monitoring service', fakeAsync(() => {
    let state: InfrastructureState | undefined;
    const subscription = service.state$.subscribe(value => { state = value; });
    tick(0);
    http.expectOne(request => request.url === environment.API_URL).flush({error: 'bad response'});
    expect(state!.error).toBeTrue();
    expect(state!.devices).toEqual([]);
    subscription.unsubscribe();
  }));
});
