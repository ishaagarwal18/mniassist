import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { OnboardingStore } from '../../core/services/onboarding.store';
import { NAV, visibleForSetup } from '../../layout/nav.model';
import { setupIncompleteGuard } from './setup-incomplete.guard';

const getStarted = NAV.flatMap((g) => g.items).find((i) => i.route === '/getting-started')!;
const home = NAV.flatMap((g) => g.items).find((i) => i.route === '/home')!;

function run(current: () => Promise<{ isComplete: boolean }>) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: OnboardingStore, useValue: { current } }],
  });
  return TestBed.runInInjectionContext(() =>
    setupIncompleteGuard({} as never, {} as never),
  ) as Promise<boolean | UrlTree>;
}

describe('Get started once setup is complete', () => {
  it('leaves the menu only when every step is done', () => {
    expect(visibleForSetup(getStarted, false)).toBe(true);
    expect(visibleForSetup(getStarted, true)).toBe(false);
    expect(visibleForSetup(home, true)).toBe(true);
  });

  it('opens while steps are left', async () => {
    expect(await run(async () => ({ isComplete: false }))).toBe(true);
  });

  it('sends its address to Home once complete', async () => {
    const result = await run(async () => ({ isComplete: true }));
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/home');
  });

  it('still opens when the checklist cannot be read', async () => {
    expect(await run(() => Promise.reject(new Error('offline')))).toBe(true);
  });
});
