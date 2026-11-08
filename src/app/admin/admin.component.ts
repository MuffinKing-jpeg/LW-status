import {Component, HostListener, OnInit} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {AdminService} from './admin.service';
import {AdminConfiguration, MonitoredDevice} from './admin.interface';
import {LocalizationService} from '../i18n/localization.service';

@Component({
  selector: 'app-admin', templateUrl: './admin.component.html', styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  email = '';
  password = '';
  busy = false;
  dirty = false;
  error = '';
  notice = '';
  search = '';
  timeout = 1000;
  extraSettings = '{}';
  configuration?: AdminConfiguration;
  servers: MonitoredDevice[] = [];

  constructor(public auth: AdminService, private i18n: LocalizationService) {}

  ngOnInit(): void { if (this.auth.authenticated) void this.reload(); }

  confirmLeave(): boolean {
    return !this.dirty || !this.auth.authenticated || window.confirm(this.i18n.translate('Discard unsaved monitoring changes?'));
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty && this.auth.authenticated) { event.preventDefault(); event.returnValue = ''; }
  }

  get visibleServers(): MonitoredDevice[] {
    const query = this.search.trim().toLowerCase();
    return this.servers.filter(server => `${server.name} ${server.host}`.toLowerCase().includes(query));
  }

  get enabledCount(): number { return this.servers.filter(server => server.enabled).length; }
  trackServer(index: number, server: MonitoredDevice): string { return server.id; }
  markDirty(): void { this.dirty = true; this.notice = ''; }

  async signIn(): Promise<void> {
    this.busy = true;
    this.error = '';
    try { this.accept(await this.auth.signIn(this.email, this.password)); }
    catch (error) { this.error = this.errorMessage(error, true); }
    finally { this.password = ''; this.busy = false; }
  }

  signOut(): void {
    if (this.dirty && !window.confirm(this.i18n.translate('Discard unsaved changes and sign out?'))) return;
    this.auth.signOut();
    this.configuration = undefined;
    this.servers = [];
    this.extraSettings = '{}';
    this.dirty = false;
    this.notice = '';
    this.error = '';
  }

  async reload(): Promise<void> {
    if (this.dirty && !window.confirm(this.i18n.translate('Reload and discard unsaved changes?'))) return;
    this.busy = true;
    this.error = '';
    this.notice = '';
    try { this.accept(await this.auth.load()); }
    catch (error) { this.error = this.errorMessage(error); }
    finally { this.busy = false; }
  }

  addServer(): void {
    if (this.servers.length >= 100) return;
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    const id = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    this.servers.push({id, name: '', host: '', port: 443, icon: 'fa-solid fa-server', enabled: true});
    this.search = '';
    this.markDirty();
  }

  removeServer(server: MonitoredDevice): void {
    if (!window.confirm(this.i18n.translate('Remove {name}? It will also disappear from History. Stored measurements are retained until normal cleanup.', {name: server.name || this.i18n.translate('New device')}))) return;
    this.servers = this.servers.filter(item => item.id !== server.id);
    this.markDirty();
  }

  async save(): Promise<void> {
    if (!this.configuration) return;
    this.error = '';
    this.notice = '';
    let extras: {[key: string]: unknown};
    try {
      extras = JSON.parse(this.extraSettings);
      if (!extras || Array.isArray(extras) || typeof extras !== 'object') throw new Error();
    } catch {
      this.error = 'Additional settings must be a valid JSON object.';
      return;
    }
    if (!this.enabledCount && !window.confirm(this.i18n.translate('All devices will be disabled. Continue?'))) return;
    this.busy = true;
    try {
      await this.auth.save({revision: this.configuration.revision, servers: this.servers,
        settings: {...extras, timeout: Number(this.timeout)}});
      this.dirty = false;
      try {
        this.accept(await this.auth.load());
        this.notice = 'Configuration saved. Status checks use it immediately; history updates within 5 minutes.';
      } catch {
        this.notice = 'Configuration saved, but could not reload it. Reload before making more changes.';
        this.configuration = undefined;
      }
    } catch (error) { this.error = this.errorMessage(error); }
    finally { this.busy = false; }
  }

  private accept(configuration: AdminConfiguration): void {
    this.configuration = configuration;
    this.servers = configuration.servers.map(server => ({...server}));
    this.timeout = configuration.settings.timeout;
    const {timeout, ...extras} = configuration.settings;
    this.extraSettings = JSON.stringify(extras, null, 2);
    this.dirty = false;
  }

  private errorMessage(error: unknown, signingIn = false): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return 'Another administrator changed the configuration. Your edits are still here. Copy them if needed, then reload and reapply.';
      if (error.status === 403) return 'This account is not an enabled administrator.';
      if (signingIn && [400, 401].includes(error.status)) return 'Unable to sign in. Check your credentials and that Email/Password authentication is enabled.';
      if (error.status === 401) return 'Session expired or revoked. Please sign in again.';
      if ([400, 413, 415].includes(error.status) && typeof error.error?.error === 'string') return error.error.error;
      return 'Could not reach the administration service. Check the connection and deployment.';
    }
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }
}
