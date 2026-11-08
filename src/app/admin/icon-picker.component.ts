import {Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, ViewChild} from '@angular/core';
import {iconKey, iconOptions} from './icon-options';
import {LocalizationService} from '../i18n/localization.service';

@Component({selector: 'app-icon-picker', templateUrl: './icon-picker.component.html', styleUrls: ['./icon-picker.component.scss']})
export class IconPickerComponent implements OnChanges {
  @Input() value = 'fa-solid fa-server';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('picker') picker?: ElementRef<HTMLDetailsElement>;
  search = '';
  custom = '';
  constructor(private host: ElementRef<HTMLElement>, private i18n: LocalizationService) {}

  ngOnChanges(): void { this.custom = this.value; if (this.disabled) this.close(); }
  // Angular cancels native activation when a template handler returns false.
  // A void handler preserves <summary>'s mouse, keyboard and touch behavior.
  onSummaryClick(event: MouseEvent): void { if (this.disabled) event.preventDefault(); }
  get label(): string { return iconOptions.find(option => this.selected(option.icon))?.label || 'Custom icon'; }
  get options() { const query = this.search.trim().toLowerCase(); return iconOptions.filter(option => `${option.label} ${this.i18n.translate(option.label)} ${option.icon} ${option.keywords}`.toLowerCase().includes(query)); }
  get validCustom(): boolean { return /^[a-z\d -]{1,160}$/i.test(this.custom.trim()); }
  selected(icon: string): boolean { return iconKey(icon) === iconKey(this.value); }
  choose(icon: string): void {
    if (this.disabled || !/^[a-z\d -]{1,160}$/i.test(icon.trim())) return;
    this.valueChange.emit(icon.trim());
    this.close();
    this.picker?.nativeElement.querySelector('summary')?.focus();
  }
  close(): void { if (this.picker) this.picker.nativeElement.open = false; }
  @HostListener('keydown.escape', ['$event']) escape(event: KeyboardEvent): void { this.close(); event.stopPropagation(); this.picker?.nativeElement.querySelector('summary')?.focus(); }
  @HostListener('document:click', ['$event']) outside(event: MouseEvent): void { if (!this.host.nativeElement.contains(event.target as Node)) this.close(); }
}
