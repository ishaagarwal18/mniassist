import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';
import { PermissionService } from '@abp/ng.core';
import { routes } from './app.routes';
import { CurrentUserService } from './core/services/current-user.service';
import { PlanService } from './core/services/plan.service';
import { ToastService } from './core/ui/toast.service';
import { ArNotFound } from './features/not-found/not-found';

@Component({ template: 'Sign in' })
class LoginStub {}

@Component({ template: 'Protected page' })
class PageStub {}

describe('application route permissions', () => {
  it.each([
    ['/inbox;view=all', [], '/home'],
    ['/inbox;view=all', ['AutoReach.Inbox'], '/inbox;view=all'],
    ['/field', [], '/home'],
    ['/field', ['AutoReach.Helpdesk.Update'], '/field'],
    ['/projects/new', ['AutoReach.Projects'], '/home'],
    ['/projects/new', ['AutoReach.Projects', 'AutoReach.Projects.Create'], '/projects/new'],
  ] as const)('checks %s with grants %j', async (url, grants, expected) => {
    const policies = new Set<string>(grants);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes.map((route) => {
          if (route.children) {
            return {
              ...route,
              loadComponent: undefined,
              children: route.children.map((child) =>
                child.loadComponent ? { ...child, loadComponent: undefined, component: PageStub } : child,
              ),
            };
          }
          return route.path === 'field'
            ? { ...route, loadComponent: undefined, component: PageStub }
            : route;
        })),
        { provide: CurrentUserService, useValue: { isAuthenticated: () => true, isHost: () => false, isHostAdmin: () => false } },
        { provide: PermissionService, useValue: { getGrantedPolicy: (policy: string) => policies.has(policy) } },
        { provide: PlanService, useValue: {} },
        { provide: ToastService, useValue: { warning: () => {} } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, PageStub);
    expect(TestBed.inject(Router).url).toBe(expected);
  });
});

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
