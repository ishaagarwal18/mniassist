import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { ArTopbar } from './topbar';
import { NavDrawer } from './nav-drawer';
import { PageContextService } from './page-context.service';
import { LanguageService } from '../core/i18n/language.service';
import { PermissionService } from '@abp/ng.core';
import { PlanService } from '../core/services/plan.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('ArTopbar responsive breadcrumbs with sidebar collapsed state', () => {
  let fixture: ComponentFixture<ArTopbar>;
  let component: ArTopbar;
  let router: Router;
  let mockDrawer: { open: any; toggle: any; collapsed: any; toggleCollapsed: any };

  beforeEach(async () => {
    mockDrawer = {
      open: signal(false),
      toggle: vi.fn(),
      collapsed: signal(false), // Expanded by default
      toggleCollapsed: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ArTopbar],
      providers: [
        provideRouter([{ path: '**', component: class DummyComponent {} }]),
        {
          provide: LanguageService,
          useValue: {
            t: (key: string) => key,
          },
        },
        {
          provide: NavDrawer,
          useValue: mockDrawer,
        },
        {
          provide: PageContextService,
          useValue: {
            setContext: vi.fn(),
            drawerOpen: signal(false),
            toggleDrawer: vi.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            getGrantedPolicy: () => true,
          },
        },
        {
          provide: PlanService,
          useValue: {
            hasPlan: () => true,
            hasFeature: () => true,
          },
        },
        {
          provide: CurrentUserService,
          useValue: {
            isHostAdmin: () => false,
            isHost: () => false,
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ArTopbar);
    component = fixture.componentInstance;
  });

  describe('when left sidebar is EXPANDED (basic breadcrumbs)', () => {
    it('renders clean, basic breadcrumb link and chevron separator without dropdown button', async () => {
      mockDrawer.collapsed.set(false);
      await router.navigateByUrl('/contacts');
      fixture.componentRef.setInput('title', 'Contacts');
      fixture.componentRef.setInput('subtitle', '12,486 contacts');
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;

      // Group link is a simple breadcrumb link
      const groupLink = el.querySelector('.tb__crumb-link');
      expect(groupLink).not.toBeNull();
      expect(groupLink?.textContent?.trim()).toBe('Customers');
      expect(groupLink?.getAttribute('href')).toBe('/contacts/360');

      // Dropdown button is NOT displayed when sidebar is expanded
      expect(el.querySelector('.tb__crumb-dropdown-btn')).toBeNull();

      // Separator chevron is rendered
      const sep = el.querySelector('.tb__crumb-sep');
      expect(sep).not.toBeNull();

      // Title is rendered
      const title = el.querySelector('.tb__title');
      expect(title?.textContent?.trim()).toBe('Contacts');
    });

    it('renders Marketing -> Campaigns as basic breadcrumbs on /campaigns', async () => {
      mockDrawer.collapsed.set(false);
      await router.navigateByUrl('/campaigns');
      fixture.componentRef.setInput('title', 'Campaigns');
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const groupLink = el.querySelector('.tb__crumb-link');
      expect(groupLink?.textContent?.trim()).toBe('Marketing');
      expect(el.querySelector('.tb__crumb-dropdown-btn')).toBeNull();
    });
  });

  describe('when left sidebar is COLLAPSED (interactive dropdown switcher)', () => {
    it('renders interactive dropdown button instead of basic text link', async () => {
      mockDrawer.collapsed.set(true);
      await router.navigateByUrl('/contacts');
      fixture.componentRef.setInput('title', 'Contacts');
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;

      // Dropdown button IS displayed
      const dropdownBtn = el.querySelector<HTMLButtonElement>('.tb__crumb-dropdown-btn');
      expect(dropdownBtn).not.toBeNull();
      expect(dropdownBtn?.textContent).toContain('Customers');

      // Basic group text link is NOT rendered
      const basicGroupLink = el.querySelector('.tb__crumb-link');
      expect(basicGroupLink).toBeNull();
    });

    it('toggles dropdown menu on click showing sibling pages and current page indicator', async () => {
      mockDrawer.collapsed.set(true);
      await router.navigateByUrl('/contacts');
      fixture.componentRef.setInput('title', 'Contacts');
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const dropdownBtn = el.querySelector<HTMLButtonElement>('.tb__crumb-dropdown-btn');

      // Initially closed
      expect(el.querySelector('.tb__group-dropdown')).toBeNull();

      // Click to open
      dropdownBtn?.click();
      fixture.detectChanges();

      const dropdown = el.querySelector('.tb__group-dropdown');
      expect(dropdown).not.toBeNull();

      // Header shows title and page count
      expect(dropdown?.querySelector('.tb__group-dropdown-title')?.textContent?.trim()).toBe(
        'Customers',
      );

      // Lists sibling items
      const items = dropdown?.querySelectorAll('.tb__group-dropdown-item');
      expect(items && items.length).toBeGreaterThan(1);

      const itemLabels = Array.from(items || []).map((i) =>
        i.querySelector('.tb__group-dropdown-label')?.textContent?.trim(),
      );
      expect(itemLabels).toContain('Contacts');
      expect(itemLabels).toContain('Customer 360');
      expect(itemLabels).toContain('Accounts');

      // Active item has current badge
      const activeItem = dropdown?.querySelector('.tb__group-dropdown-item--active');
      expect(activeItem?.textContent).toContain('Contacts');
      expect(activeItem?.querySelector('.tb__group-dropdown-current')).not.toBeNull();

      // Outside click closes menu
      document.dispatchEvent(new MouseEvent('click'));
      fixture.detectChanges();
      expect(el.querySelector('.tb__group-dropdown')).toBeNull();
    });
  });

  it('renders intermediate parent item on sub-routes like /templates/new', async () => {
    mockDrawer.collapsed.set(false);
    await router.navigateByUrl('/templates/new');
    fixture.componentRef.setInput('title', 'New template');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const links = el.querySelectorAll('.tb__crumb-link');
    expect(links.length).toBe(2);
    expect(links[0].textContent?.trim()).toBe('Marketing');
    expect(links[1].textContent?.trim()).toBe('Templates');
    expect(links[1].getAttribute('href')).toBe('/templates');

    const title = el.querySelector('.tb__title');
    expect(title?.textContent?.trim()).toBe('New template');
  });

  it('renders just the title without breadcrumbs on root pages like /home', async () => {
    mockDrawer.collapsed.set(false);
    await router.navigateByUrl('/home');
    fixture.componentRef.setInput('title', 'Home');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.tb__crumb-link')).toBeNull();
    expect(el.querySelector('.tb__crumb-dropdown-btn')).toBeNull();
    expect(el.querySelector('.tb__title')?.textContent?.trim()).toBe('Home');
  });
});
