import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ArRightSidebar } from './right-sidebar';
import { PageContextService } from './page-context.service';
import { LanguageService } from '../core/i18n/language.service';
import { ThemeService } from '../core/services/theme.service';
import { InboxService } from '../core/services/inbox.service';
import { OpsService } from '../core/services/ops.service';
import { CurrentUserService } from '../core/services/current-user.service';
import { PlanService } from '../core/services/plan.service';
import { PermissionService } from '@abp/ng.core';

describe('ArRightSidebar', () => {
  let fixture: ComponentFixture<ArRightSidebar>;
  let component: ArRightSidebar;
  let pageContext: PageContextService;
  let languageService: { lang: any; set: any; t: any };
  let themeService: { theme: any; set: any };
  let currentUserService: { logout: any; permissionState: any; isHost: any; isHostAdmin: any };
  let inboxService: { unassignedCount: any };
  let opsService: { unreadCount: any };

  beforeEach(async () => {
    languageService = {
      lang: signal('en'),
      set: vi.fn(),
      t: (key: string) => key,
    };
    themeService = {
      theme: signal('light'),
      set: vi.fn(),
    };
    currentUserService = {
      logout: vi.fn(),
      permissionState: signal(0),
      isHost: signal(false),
      isHostAdmin: signal(false),
    };
    inboxService = {
      unassignedCount: signal(5),
    };
    opsService = {
      unreadCount: signal(3),
    };

    await TestBed.configureTestingModule({
      imports: [ArRightSidebar],
      providers: [
        provideRouter([]),
        { provide: LanguageService, useValue: languageService },
        { provide: ThemeService, useValue: themeService },
        { provide: CurrentUserService, useValue: currentUserService },
        { provide: InboxService, useValue: inboxService },
        { provide: OpsService, useValue: opsService },
        { provide: PermissionService, useValue: { getGrantedPolicy: () => true } },
        {
          provide: PlanService,
          useValue: {
            plan: signal(null),
            features: signal([]),
            hasPlan: () => true,
            hasFeature: () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArRightSidebar);
    component = fixture.componentInstance;
    pageContext = TestBed.inject(PageContextService);
    pageContext.setContext(
      'Contacts',
      'Manage all relationships',
      'View and edit contacts in your workspace.',
    );
    fixture.detectChanges();
  });

  it('renders inbox and notifications badges with unread counts', () => {
    const el = fixture.nativeElement as HTMLElement;
    const badges = el.querySelectorAll('.rsb__badge');
    expect(badges.length).toBe(2);
    expect(badges[0].textContent?.trim()).toBe('5');
    expect(badges[1].textContent?.trim()).toBe('3');
  });

  it('renders What’s new link to /whats-new', () => {
    const el = fixture.nativeElement as HTMLElement;
    const whatsNewLink = el.querySelector('a[href="/whats-new"]');
    expect(whatsNewLink).not.toBeNull();
  });

  it('toggles the help flyout and displays the page title and help summary', () => {
    expect(pageContext.helpOpen()).toBe(false);
    (component as any).toggleHelp(new MouseEvent('click'));
    fixture.detectChanges();

    expect(pageContext.helpOpen()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    const helpPop = el.querySelector('.rsb__pop--help');
    expect(helpPop).not.toBeNull();
    expect(helpPop?.textContent).toContain('Contacts');
    expect(helpPop?.textContent).toContain('View and edit contacts in your workspace.');
  });

  it('toggles theme popover and switches theme', () => {
    (component as any).toggleTheme(new MouseEvent('click'));
    fixture.detectChanges();

    expect((component as any).themeOpen()).toBe(true);
    (component as any).setTheme('dark');
    expect(themeService.set).toHaveBeenCalledWith('dark');
    expect((component as any).themeOpen()).toBe(false);
  });

  it('toggles language popover and switches language', () => {
    (component as any).toggleLang(new MouseEvent('click'));
    fixture.detectChanges();

    expect((component as any).langOpen()).toBe(true);
    (component as any).setLanguage('hi');
    expect(languageService.set).toHaveBeenCalledWith('hi');
    expect((component as any).langOpen()).toBe(false);
  });

  it('calls account logout on sign out', () => {
    (component as any).signOut();
    expect(currentUserService.logout).toHaveBeenCalled();
  });

  it('closes popovers on escape key press', () => {
    (component as any).toggleTheme(new MouseEvent('click'));
    pageContext.toggleHelp();
    expect((component as any).themeOpen()).toBe(true);
    expect(pageContext.helpOpen()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect((component as any).themeOpen()).toBe(false);
    expect(pageContext.helpOpen()).toBe(false);
  });
});
