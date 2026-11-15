import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './core/services/theme.service';
import { PwaService } from './core/services/pwa.service';
import { FeatureFlagStore } from './core/services/feature-flag.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class App {
  // Started here so the theme follows every navigation, inside the shell or not.
  private readonly theme = inject(ThemeService);
  // Initialized at root to manage Service Worker, network state, and installation prompts.
  private readonly pwa = inject(PwaService);
  // Loads the platform's feature flags after sign-in, for menus and screens that depend on them.
  private readonly flags = inject(FeatureFlagStore);
}
