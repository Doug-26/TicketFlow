import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  // Injecting ThemeService here ensures it's constructed eagerly on app load.
  // Its constructor reads the stored/preferred theme and applies the 'dark'
  // class to <html> via an effect — so the first paint is correct.
  private readonly theme = inject(ThemeService);
}
