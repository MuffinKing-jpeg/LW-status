import {CommonModule} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {TestBed} from '@angular/core/testing';
import {AdminComponent} from './admin.component';
import {AdminService} from './admin.service';
import {AdminConfiguration} from './admin.interface';
import {LocalizationService} from '../i18n/localization.service';
import {LocalizationModule} from '../i18n/localization.module';
import {IconPickerComponent} from './icon-picker.component';

const configuration = (): AdminConfiguration => ({
  user: {uid: 'admin', email: 'admin@example.net'}, revision: '1/1', audit: [],
  settings: {timeout: 1000, extra: {preserved: true}},
  servers: [
    {id: 'one', name: 'Router', host: 'router.example.net', port: 443, icon: 'fas fa-server', enabled: true},
    {id: 'two', name: 'Database', host: 'db.example.net', port: 5432, icon: 'fas fa-database', enabled: true}
  ]
});

describe('AdminComponent editing', () => {
  let component: AdminComponent;
  let auth: jasmine.SpyObj<AdminService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AdminService', ['signIn', 'load', 'save', 'signOut'], {authenticated: true});
    auth.signIn.and.resolveTo(configuration());
    auth.load.and.resolveTo(configuration());
    auth.save.and.resolveTo({ok: true});
    const i18n = TestBed.inject(LocalizationService);
    i18n.setPreference('en');
    component = new AdminComponent(auth, i18n);
  });

  it('clears the password even when sign in fails', async () => {
    component.password = 'not-a-real-password';
    auth.signIn.and.rejectWith(new Error('Sign in failed'));
    await component.signIn();
    expect(component.password).toBe('');
    expect(component.busy).toBeFalse();
  });

  it('saves all devices even when the search hides some of them', async () => {
    await component.signIn();
    component.search = 'Router';
    expect(component.visibleServers.length).toBe(1);
    await component.save();
    expect(auth.save.calls.mostRecent().args[0].servers.length).toBe(2);
    expect(auth.save.calls.mostRecent().args[0].settings['extra']).toEqual({preserved: true});
  });

  it('preserves unsaved edits on a revision conflict', async () => {
    await component.signIn();
    component.servers[0].name = 'Edited';
    component.markDirty();
    auth.save.and.rejectWith(new HttpErrorResponse({status: 409}));
    await component.save();
    expect(component.dirty).toBeTrue();
    expect(component.servers[0].name).toBe('Edited');
    expect(component.error).toContain('Another administrator');
  });

  it('does not save malformed extra settings', async () => {
    await component.signIn();
    component.extraSettings = '[]';
    await component.save();
    expect(auth.save).not.toHaveBeenCalled();
    expect(component.error).toContain('JSON object');
  });

  it('confirms before discarding unsaved changes', () => {
    component.dirty = true;
    spyOn(window, 'confirm').and.returnValue(false);
    expect(component.confirmLeave()).toBeFalse();
  });

  it('reloads existing in-memory sessions when returning to the page', async () => {
    component.ngOnInit();
    expect(auth.load).toHaveBeenCalled();
    await Promise.resolve();
    expect(component.servers.length).toBe(2);
  });
});

describe('AdminComponent template', () => {
  it('renders the sign-in form without exposing configuration', async () => {
    const auth = jasmine.createSpyObj('AdminService', ['signIn'], {authenticated: false});
    await TestBed.configureTestingModule({
      declarations: [AdminComponent, IconPickerComponent], imports: [CommonModule, FormsModule, LocalizationModule],
      providers: [{provide: AdminService, useValue: auth}]
    }).compileComponents();
    TestBed.inject(LocalizationService).setPreference('en');
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.admin--login')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input[type=password]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    fixture.destroy();
  });
});
