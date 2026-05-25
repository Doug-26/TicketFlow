import { Injectable, effect, signal } from '@angular/core';

import { THEME_KEY, ThemeName } from '../constants/app.constants';

// Dark / light theme toggle.
// - State lives in a signal.
// - An effect() syncs the signal to <html class="dark">.
// - Choice is persisted in localStorage.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<ThemeName>(this.readInitial());

  readonly theme = this._theme.asReadonly();

  constructor() {
    // Sync HTML class + localStorage whenever the signal changes.
    effect(() => {
      const t = this._theme();
      const html = document.documentElement;
      if (t === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      localStorage.setItem(THEME_KEY, t);
    });
  }

  toggle(): void {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  set(t: ThemeName): void {
    this._theme.set(t);
  }

  // Read initial value: localStorage > OS preference > 'light'.
  private readInitial(): ThemeName {
    const stored = localStorage.getItem(THEME_KEY) as ThemeName | null;
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
