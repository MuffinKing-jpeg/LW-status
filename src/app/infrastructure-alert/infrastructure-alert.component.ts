import {Component, Input} from '@angular/core';
import {InfrastructureState} from '../services/infrastructure-status.service';

@Component({selector: 'app-infrastructure-alert', templateUrl: './infrastructure-alert.component.html', styleUrls: ['./infrastructure-alert.component.scss']})
export class InfrastructureAlertComponent {
  @Input() state: InfrastructureState | null = null;
  @Input() historyPage = false;
  @Input() demo = false;
  get offline(): string[] { return this.state?.devices.filter(device => device.available === 'Offline').map(device => device.name) || []; }
  jumpToLog(): void {
    document.getElementById('outage-log')?.scrollIntoView({block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }
}
