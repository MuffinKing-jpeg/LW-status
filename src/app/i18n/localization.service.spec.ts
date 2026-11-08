import {TestBed} from '@angular/core/testing';
import {deviceLanguage, LocalDatePipe, LocalNumberPipe, LocalizationService, TranslationPipe} from './localization.service';
import {translations} from './translations';

describe('Localization', () => {
  let original: string | null;
  let originalLang: string;
  beforeEach(() => { original = localStorage.getItem('lw-status-language'); originalLang = document.documentElement.lang; localStorage.removeItem('lw-status-language'); });
  afterEach(() => { if (original) localStorage.setItem('lw-status-language', original); else localStorage.removeItem('lw-status-language'); document.documentElement.lang = originalLang; });

  it('matches device language regions and preferred supported fallbacks', () => {
    expect(deviceLanguage(['ru-RU', 'en'])).toBe('ru');
    expect(deviceLanguage(['uk-UA'])).toBe('uk');
    expect(deviceLanguage(['de-DE', 'ru'])).toBe('ru');
    expect(deviceLanguage(['fr-FR'])).toBe('en');
  });
  it('uses device language automatically and supports a persistent override', () => {
    spyOnProperty(navigator, 'languages', 'get').and.returnValue(['ru-RU']);
    const service = TestBed.inject(LocalizationService);
    expect(service.language).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
    service.setPreference('uk');
    expect(service.translate('History')).toBe('Історія');
    expect(localStorage.getItem('lw-status-language')).toBe('uk');
    service.setPreference('auto');
    expect(service.language).toBe('ru');
    expect(localStorage.getItem('lw-status-language')).toBeNull();
  });
  it('translates parameters and updates number/date formatting with the language', () => {
    const service = TestBed.inject(LocalizationService);
    service.setPreference('en');
    const number = new LocalNumberPipe(service);
    const date = new LocalDatePipe(service);
    const text = new TranslationPipe(service);
    expect(number.transform(1.5, '1.1-1')).toBe('1.5');
    service.setPreference('ru');
    expect(number.transform(1.5, '1.1-1')).toBe('1,5');
    expect(number.transform('0')).toBe('0');
    expect(number.transform(null)).toBe('—');
    expect(date.transform(new Date(2026, 0, 10), 'MMMM')).toContain('январ');
    expect(text.transform('Show {count} more ({remaining} hidden)', {count: 5, remaining: 9})).toContain('9');
  });
  it('falls back to source text for unknown messages and rejects unknown preferences', () => {
    const service = TestBed.inject(LocalizationService);
    service.setPreference('uk'); service.setPreference('unexpected');
    expect(service.language).toBe('uk');
    expect(service.translate('Untranslated {name}', {name: 'device'})).toBe('Untranslated device');
  });
  it('has both translations and preserves all interpolation parameters', () => {
    Object.entries(translations).forEach(([source, values]) => {
      const parameters = (value: string) => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
      expect(values.ru.length).toBeGreaterThan(0);
      expect(values.uk.length).toBeGreaterThan(0);
      expect(parameters(values.ru)).toEqual(parameters(source));
      expect(parameters(values.uk)).toEqual(parameters(source));
    });
  });
});
