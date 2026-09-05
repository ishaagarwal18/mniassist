import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ArSidebar } from './sidebar';

@Component({
  selector: 'ar-app-shell',
  imports: [RouterOutlet, ArSidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-sidebar />
    <main class="shell__main"><router-outlet /></main>
  `,
  styles: `
    :host { display: flex; height: 100vh; overflow: hidden; background: var(--ar-bg-100); }
    .shell__main { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100%; }
  `,
})
export class ArAppShell {}
