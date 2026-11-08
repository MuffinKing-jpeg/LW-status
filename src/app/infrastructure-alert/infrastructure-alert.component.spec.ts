import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {LocalizationModule} from '../i18n/localization.module';
import {LocalizationService} from '../i18n/localization.service';
import {InfrastructureAlertComponent} from './infrastructure-alert.component';

describe('Infrastructure alert', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({declarations: [InfrastructureAlertComponent], imports: [CommonModule, RouterTestingModule, LocalizationModule]}).compileComponents();
    TestBed.inject(LocalizationService).setPreference('en');
  });
  it('does not report a problem when current devices are online', () => {
    const fixture = TestBed.createComponent(InfrastructureAlertComponent);
    fixture.componentInstance.state = {devices: [{name: 'Router', icon: 'fas fa-server', available: 'Online'}], loading: false, error: false, checkedAt: 1000};
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    fixture.destroy();
  });
  it('shows active failures and identifies live checks on the history page', () => {
    const fixture = TestBed.createComponent(InfrastructureAlertComponent);
    fixture.componentInstance.historyPage = true;
    fixture.componentInstance.state = {devices: [{name: 'Router', icon: 'fas fa-server', available: 'Offline'}], loading: false, error: false, checkedAt: 1000};
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unavailable: Router');
    expect(fixture.nativeElement.textContent).toContain('independent of the selected history period');
    fixture.destroy();
  });
  it('does not present stale devices as a confirmed current outage when the API fails', () => {
    const fixture = TestBed.createComponent(InfrastructureAlertComponent);
    fixture.componentInstance.state = {devices: [{name: 'Router', icon: 'fas fa-server', available: 'Offline'}], loading: false, error: true, checkedAt: 1000};
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Monitoring is unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('Unavailable: Router');
    fixture.destroy();
  });
});
