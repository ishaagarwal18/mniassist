import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { CurrentUserService } from './core/services/current-user.service';
import { ArNotFound } from './features/not-found/not-found';

@Component({ template: 'Sign in' })
class LoginStub {}

describe('application fallback route', () => {
  function setup(isAuthenticated: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes.map((route) =>
          route.path === 'login' ? { path: 'login', component: LoginStub } : route,
        )),
        { provide: CurrentUserService, useValue: { isAuthenticated: () => isAuthenticated } },
      ],
    });
    return RouterTestingHarness.create();
  }

  it.each([false, true])('shows the 404 for an unknown URL with authenticated=%s', async (signedIn) => {
    const harness = await setup(signedIn);
    const url = '/home/unknown-page';
    await harness.navigateByUrl(url, ArNotFound);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Page not found');
    expect(TestBed.inject(Router).url).toBe(url);
  });

  it('redirects signed-out users to login for a known protected URL', async () => {
    const harness = await setup(false);
    await harness.navigateByUrl('/home', LoginStub);
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
