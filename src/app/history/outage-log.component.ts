import {Component, Input} from '@angular/core';
import {Incident} from './history.utils';

@Component({selector: 'app-outage-log', templateUrl: './outage-log.component.html', styleUrls: ['./outage-log.component.scss']})
export class OutageLogComponent {
  @Input() hasMeasurements = false;
  private items: Incident[] = [];
  visibleCount = 5;
  @Input() set incidents(value: Incident[]) { this.items = value; this.visibleCount = 5; }
  get incidents(): Incident[] { return this.items; }
  get remaining(): number { return Math.max(0, this.incidents.length - this.visibleCount); }
  get nextCount(): number { return Math.min(10, this.remaining); }
  more(): void { this.visibleCount += this.nextCount; }
  collapse(): void { this.visibleCount = 5; }
}
