import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {fakeAsync, flushMicrotasks, TestBed, tick} from '@angular/core/testing';
import {environment} from '../../environments/environment';
import {AdminService} from './admin.service';
import {AdminConfiguration} from './admin.interface';

const configuration: AdminConfiguration = {
  user: {uid: 'admin', email: 'admin@example.net'}, settings: {timeout: 1000},
  servers: [], revision: '1/1', audit: []
};

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HttpClientTestingModule]});
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { service.signOut(); http.verify(); });

  const signIn = () => {
    const promise = service.signIn('admin@example.net', 'not-a-real-password');
    const login = http.expectOne(request => request.url.includes('accounts:signInWithPassword'));
    expect(login.request.body.returnSecureToken).toBeTrue();
    login.flush({idToken: 'test-token', expiresIn: '3600'});
    flushMicrotasks();
    const load = http.expectOne(environment.ADMIN_API_URL);
    expect(load.request.headers.get('Authorization')).toBe('Bearer test-token');
    load.flush(configuration);
    flushMicrotasks();
    return promise;
  };

  it('checks administrator access after password login without persistent storage', fakeAsync(() => {
    const storage = spyOn(Storage.prototype, 'setItem');
    signIn();
    expect(service.authenticated).toBeTrue();
    expect(service.email).toBe('admin@example.net');
    expect(storage).not.toHaveBeenCalled();
    service.signOut();
  }));

  it('rejects an authenticated Firebase user who is not an administrator', fakeAsync(() => {
    let failed = false;
    void service.signIn('user@example.net', 'password').catch(() => { failed = true; });
    http.expectOne(request => request.url.includes('accounts:signInWithPassword'))
      .flush({idToken: 'ordinary-user', expiresIn: '3600'});
    flushMicrotasks();
    http.expectOne(environment.ADMIN_API_URL).flush({error: 'Not an administrator'}, {status: 403, statusText: 'Forbidden'});
    flushMicrotasks();
    expect(failed).toBeTrue();
    expect(service.authenticated).toBeFalse();
    expect(service.email).toBe('');
  }));

  it('expires the memory-only session', fakeAsync(() => {
    signIn();
    tick(3600000);
    expect(service.authenticated).toBeFalse();
    expect(service.sessionMessage).toContain('expired');
  }));

  it('clears the session when access is revoked', fakeAsync(() => {
    signIn();
    void service.load().catch(() => {});
    http.expectOne(environment.ADMIN_API_URL).flush({}, {status: 403, statusText: 'Forbidden'});
    flushMicrotasks();
    expect(service.authenticated).toBeFalse();
  }));

  it('does not call the admin API without a session', fakeAsync(() => {
    let failed = false;
    void service.load().catch(() => { failed = true; });
    flushMicrotasks();
    http.expectNone(environment.ADMIN_API_URL);
    expect(failed).toBeTrue();
  }));
});
