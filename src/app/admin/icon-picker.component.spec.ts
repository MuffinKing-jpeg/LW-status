import {ElementRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TestBed} from '@angular/core/testing';
import {LocalizationService} from '../i18n/localization.service';
import {IconPickerComponent} from './icon-picker.component';
import {iconOptions} from './icon-options';
import {LocalizationModule} from '../i18n/localization.module';

describe('Visual icon picker', () => {
  let picker: IconPickerComponent;
  let i18n: LocalizationService;
  beforeEach(() => { i18n = TestBed.inject(LocalizationService); i18n.setPreference('en'); picker = new IconPickerComponent(new ElementRef(document.createElement('div')), i18n); });
  it('recognizes legacy Font Awesome classes', () => {
    picker.value = 'fas fa-broadcast-tower';
    expect(picker.label).toBe('Radio');
    expect(picker.selected('fa-solid fa-tower-broadcast')).toBeTrue();
  });
  it('filters localized labels and emits a chosen icon', () => {
    i18n.setPreference('uk'); picker.search = 'схови';
    expect(picker.options.map(option => option.icon)).toContain('fa-solid fa-hard-drive');
    const emitted = spyOn(picker.valueChange, 'emit');
    picker.choose('fa-solid fa-database');
    expect(emitted).toHaveBeenCalledWith('fa-solid fa-database');
  });
  it('does not change an icon while disabled or accept invalid custom markup', () => {
    const emitted = spyOn(picker.valueChange, 'emit');
    picker.disabled = true; picker.choose('fa-solid fa-server');
    picker.disabled = false; picker.choose('<script>');
    expect(emitted).not.toHaveBeenCalled();
    expect(new Set(iconOptions.map(option => option.icon)).size).toBe(iconOptions.length);
  });
});

describe('Icon picker template', () => {
  it('renders the gallery, previews a selection, and closes after choosing', async () => {
    await TestBed.configureTestingModule({declarations: [IconPickerComponent], imports: [CommonModule, FormsModule, LocalizationModule]}).compileComponents();
    TestBed.inject(LocalizationService).setPreference('en');
    const fixture = TestBed.createComponent(IconPickerComponent);
    fixture.detectChanges();
    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('.picker');
    const summary: HTMLElement = details.querySelector('summary')!;
    summary.click();
    expect(details.open).toBeTrue();
    summary.click();
    expect(details.open).toBeFalse();
    summary.click();
    expect(details.open).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.icon-grid button').length).toBe(iconOptions.length);
    const emitted = spyOn(fixture.componentInstance.valueChange, 'emit');
    fixture.nativeElement.querySelector('button[aria-label="Database"]').click();
    expect(emitted).toHaveBeenCalledWith('fa-solid fa-database');
    expect(details.open).toBeFalse();
    fixture.destroy();
  });
  it('prevents opening only when the picker is disabled', async () => {
    await TestBed.configureTestingModule({declarations: [IconPickerComponent], imports: [CommonModule, FormsModule, LocalizationModule]}).compileComponents();
    const fixture = TestBed.createComponent(IconPickerComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('.picker');
    const summary: HTMLElement = details.querySelector('summary')!;
    summary.click();
    expect(details.open).toBeFalse();
    fixture.componentInstance.disabled = false;
    fixture.detectChanges();
    summary.click();
    expect(details.open).toBeTrue();
    fixture.destroy();
  });
});
