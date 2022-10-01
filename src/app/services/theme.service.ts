import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  constructor() {
  }

  checkTheme(): void {
    const isDark: boolean =
      localStorage.getItem('theme') === 'dark' ?
        window.matchMedia('(prefers-color-scheme: dark)').matches : false
    isDark ? this.themeSwitch('dark') : this.themeSwitch('light')

  }

  themeSwitch(theme: string): void {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    localStorage.setItem('theme', theme);
  }

  toggleTheme(): void {
    const current: string | null = localStorage.getItem('theme');

    current === 'dark' ? this.themeSwitch('light') : this.themeSwitch('dark')
  }


}
