import { EXTERNAL_LOGIN_CALLBACK } from '../../core/auth/external-login';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SettingsStore } from '../../core/services/settings.service';
import { SessionStore } from '../../core/services/session.store';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArChip, ArIcon, ArTabs } from '../../ui';
import { ConfirmService } from '../../core/ui/confirm.service';
import { PermissionService } from '@abp/ng.core';
import { showsInMenu } from '../../core/auth/nav-access.guard';
import { PlanService } from '../../core/services/plan.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import type { IconName } from '../../ui/icon';

import { ArTwoFactorCard } from './two-factor-card';
import { ArSignInHistoryCard } from './sign-in-history-card';
import { ArLinkedAccountsCard } from './linked-accounts-card';
import { ArExternalLoginsCard } from './external-logins-card';
import { ArDelegationsCard } from './delegations-card';
import { ArBrowserNotificationsCard } from './browser-notifications-card';

export const SETTINGS_TABS = [
  'All Settings',
  'Single Sign-On',
  'Two-Factor Auth',
  'Sessions & Devices',
  'Sign-In History',
  'Connected Accounts',
  'Notifications',
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const SETTINGS_CATEGORIES = [
  'All',
  'Security & Access',
  'Workspace & Identity',
  'Channels & Messaging',
  'Lead capture',
  'Calls & voice',
  'Sales & products',
  'Integrations & Ops',
  'Compliance & Billing',
] as const;

export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

export interface SettingDirectoryItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: Exclude<SettingsCategory, 'All'>;
  readonly icon: IconName;
  readonly tab?: SettingsTab;
  readonly route?: string;
  readonly badge?: () => string | null;
  readonly badgeTone?: () => 'good' | 'amber' | 'neutral' | 'bad';
  readonly keywords: readonly string[];
}

@Component({
  selector: 'ar-settings',
  imports: [
    FormsModule,
    RouterLink,
    ArTopbar,
    ArButton,
    ArBanner,
    ArCard,
    ArChip,
    ArTabs,
    ArIcon,
    ArTwoFactorCard,
    ArSignInHistoryCard,
    ArLinkedAccountsCard,
    ArExternalLoginsCard,
    ArDelegationsCard,
    ArBrowserNotificationsCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class ArSettings {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);
  private readonly plans = inject(PlanService);
  private readonly account = inject(CurrentUserService);
  private readonly store = inject(SettingsStore);
  private readonly sessionStore = inject(SessionStore);

  protected readonly tabs = SETTINGS_TABS;
  protected readonly tab = signal<SettingsTab>('All Settings');
  protected readonly categories = SETTINGS_CATEGORIES;
  protected readonly selectedCategory = signal<SettingsCategory>('All');
  protected readonly searchQuery = signal('');

  protected readonly sso = this.store.sso;
  protected readonly loading = this.store.ssoLoading;
  protected readonly sessions = this.sessionStore.sessions;

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal(false);

  // SSO form fields
  protected readonly displayName = signal('');
  protected readonly issuer = signal('');
  protected readonly authorizationEndpoint = signal('');
  protected readonly clientId = signal('');
  /** Where the IdP sends people back; it must be registered there. */
  protected readonly ssoRedirectUri = `${window.location.origin}${EXTERNAL_LOGIN_CALLBACK}`;
  protected readonly metadataAddress = signal('');
  protected readonly domains = signal('');
  protected readonly defaultRole = signal('Agent');
  protected readonly enforce = signal(false);

  protected readonly domainList = computed(() =>
    this.domains()
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean),
  );

  protected readonly canSave = computed(
    () =>
      this.displayName().trim().length > 1 &&
      this.issuer().trim().length > 6 &&
      this.domainList().length > 0,
  );

  // Central directory definition of all settings in MNI Assist
  private readonly directoryItems: SettingDirectoryItem[] = [
    // Security & Access
    {
      id: 'sso',
      title: 'Single Sign-On (SSO)',
      description:
        'Configure OpenID Connect / SAML identity provider, mapped domains, and role provisioning.',
      category: 'Security & Access',
      icon: 'shield',
      tab: 'Single Sign-On',
      badge: () =>
        this.sso().isEnabled
          ? 'Enabled'
          : this.sso().isConfigured
            ? 'Configured (off)'
            : 'Not set up',
      badgeTone: () =>
        this.sso().isEnabled ? 'good' : this.sso().isConfigured ? 'amber' : 'neutral',
      keywords: [
        'sso',
        'saml',
        'oidc',
        'identity',
        'login',
        'single sign-on',
        'provider',
        'okta',
        'microsoft',
        'entra',
        'google',
      ],
    },
    {
      id: 'two-factor',
      title: 'Two-Factor Authentication',
      description:
        'Protect accounts with Google or Microsoft Authenticator OTPs and emergency backup recovery codes.',
      category: 'Security & Access',
      icon: 'shield',
      tab: 'Two-Factor Auth',
      keywords: [
        '2fa',
        'two-factor',
        'mfa',
        'authenticator',
        'security',
        'otp',
        'recovery code',
        'totp',
      ],
    },
    {
      id: 'sessions',
      title: 'Signed-in Devices & Sessions',
      description:
        'Review active browser and mobile sessions, view client details, and sign out unused devices.',
      category: 'Security & Access',
      icon: 'user',
      tab: 'Sessions & Devices',
      badge: () => `${this.sessions().length} active`,
      badgeTone: () => 'neutral',
      keywords: [
        'sessions',
        'devices',
        'login',
        'device',
        'phone',
        'sign out',
        'ip',
        'revoke',
        'active devices',
      ],
    },
    {
      id: 'sign-in-history',
      title: 'Sign-in Audit History',
      description:
        'Audit log of recent user logins with timestamps, client IP addresses, and authentication outcomes.',
      category: 'Security & Access',
      icon: 'clock',
      tab: 'Sign-In History',
      keywords: ['audit', 'history', 'logins', 'attempts', 'security', 'ip address', 'events'],
    },
    {
      id: 'connected-accounts',
      title: 'Connected Accounts & Logins',
      description:
        'Manage external identities (Google, Microsoft), linked workspace accounts, and user delegations.',
      category: 'Security & Access',
      icon: 'link',
      tab: 'Connected Accounts',
      keywords: [
        'google',
        'microsoft',
        'external logins',
        'linked accounts',
        'delegations',
        'oauth',
        'social login',
      ],
    },
    {
      id: 'notifications',
      title: 'Browser Notifications',
      description:
        'Configure real-time web push notifications for incoming customer messages, assignments, and mentions.',
      category: 'Security & Access',
      icon: 'bell',
      tab: 'Notifications',
      keywords: [
        'notifications',
        'push',
        'alerts',
        'browser',
        'pwa',
        'web push',
        'sound',
        'messages',
      ],
    },
    {
      id: 'security-policy',
      title: 'Sign-in & Password Rules',
      description:
        'Enforce workspace-wide password complexity, lockout limits, and idle session duration policies.',
      category: 'Security & Access',
      icon: 'shield',
      route: '/settings/security-policy',
      keywords: [
        'password',
        'lockout',
        'policy',
        'rules',
        'complexity',
        'security policy',
        'sign-in rules',
      ],
    },
    {
      id: 'profile',
      title: 'Your Profile & Password',
      description:
        'Update your display name, personal email address, avatar, and account password.',
      category: 'Security & Access',
      icon: 'user',
      route: '/settings/profile',
      keywords: ['profile', 'password', 'name', 'email', 'avatar', 'account', 'personal'],
    },

    // Workspace & Identity
    {
      id: 'business-profile',
      title: 'Business Profile',
      description:
        'Legal company name, GSTIN identification, registered business address, and billing particulars.',
      category: 'Workspace & Identity',
      icon: 'document',
      route: '/settings/business-profile',
      keywords: [
        'business',
        'gst',
        'gstin',
        'company',
        'address',
        'invoice',
        'legal',
        'tax',
        'entity',
      ],
    },
    {
      id: 'branding',
      title: 'Branding & Visuals',
      description:
        'Upload your company logo and customize theme accent colors across the navigation chrome.',
      category: 'Workspace & Identity',
      icon: 'settings',
      route: '/settings/branding',
      keywords: ['branding', 'logo', 'theme', 'color', 'accent', 'white-label', 'appearance'],
    },
    {
      id: 'members',
      title: 'Members & Invites',
      description:
        'Invite team members to your workspace, assign user roles, and manage active pending invites.',
      category: 'Workspace & Identity',
      icon: 'user',
      route: '/settings/members',
      keywords: ['members', 'users', 'invite', 'team', 'seats', 'colleagues', 'staff'],
    },
    {
      id: 'teams',
      title: 'Teams Management',
      description:
        'Organize members into functional teams for intelligent lead distribution and ticket routing.',
      category: 'Workspace & Identity',
      icon: 'contacts',
      route: '/settings/teams',
      keywords: ['teams', 'groups', 'departments', 'routing', 'agents', 'assignment', 'escalation'],
    },
    {
      id: 'roles',
      title: 'Roles & Permissions',
      description: 'Define granular RBAC permissions and security roles for workspace users.',
      category: 'Workspace & Identity',
      icon: 'shield',
      route: '/admin/roles',
      keywords: ['roles', 'permissions', 'rbac', 'access control', 'admin', 'agent', 'manager'],
    },
    {
      id: 'users',
      title: 'Users Administration',
      description:
        'Administer all registered user accounts, passwords, activation status, and lockout overrides.',
      category: 'Workspace & Identity',
      icon: 'user',
      route: '/admin/users',
      keywords: ['users', 'user list', 'accounts', 'passwords', 'administration', 'directory'],
    },
    {
      id: 'support-access',
      title: 'Support Access',
      description:
        'Grant temporary, audited troubleshooting access to MNI Assist technical engineers.',
      category: 'Workspace & Identity',
      icon: 'help',
      route: '/settings/support-access',
      keywords: ['support', 'access', 'grant', 'troubleshooting', 'helpdesk', 'mni assist'],
    },
    {
      id: 'agency',
      title: 'Agency mode',
      description: 'Run client workspaces from this one, for agencies and resellers.',
      category: 'Workspace & Identity',
      icon: 'segment',
      route: '/settings/agency',
      keywords: ['agency', 'clients', 'reseller', 'sub-accounts', 'white label'],
    },

    // Channels & Messaging
    {
      id: 'channels',
      title: 'WhatsApp Channels',
      description:
        'Connect and manage WhatsApp Cloud API numbers, messaging limits, and health status.',
      category: 'Channels & Messaging',
      icon: 'channel',
      route: '/channels',
      keywords: ['whatsapp', 'channels', 'phone numbers', 'api', 'cloud api', 'tier', 'meta'],
    },
    {
      id: 'channel-numbers',
      title: 'Display Name & PIN',
      description:
        'Configure WhatsApp profile display name, about description, and two-step verification PIN.',
      category: 'Channels & Messaging',
      icon: 'phone',
      route: '/channels/numbers',
      keywords: ['display name', 'pin', 'whatsapp name', 'bio', 'profile', 'two-step pin'],
    },
    {
      id: 'migrate-number',
      title: 'Migrate a number',
      description: 'Move a WhatsApp number here from another provider without losing it.',
      category: 'Channels & Messaging',
      icon: 'refresh',
      route: '/channels/migrate',
      keywords: ['migrate', 'move number', 'port', 'bsp', 'provider', 'whatsapp'],
    },
    {
      id: 'email-sending',
      title: 'Email Sending (SMTP)',
      description:
        'Set up outbound SMTP mail servers, sender addresses, and domain SPF/DKIM verification.',
      category: 'Channels & Messaging',
      icon: 'send',
      route: '/settings/email-sending',
      keywords: ['email', 'smtp', 'mail', 'sender', 'domain', 'sending', 'dkim', 'spf'],
    },
    {
      id: 'email-templates',
      title: 'Email Templates',
      description:
        'Design and customize transactional email templates with dynamic tokens and brand styling.',
      category: 'Channels & Messaging',
      icon: 'template',
      route: '/settings/email-templates',
      keywords: [
        'templates',
        'email templates',
        'transactional',
        'notifications',
        'layout',
        'design',
      ],
    },
    {
      id: 'tasks-meetings',
      title: 'Task & Meeting Messages',
      description:
        'Automate WhatsApp and email notification reminders for scheduled tasks and customer meetings.',
      category: 'Channels & Messaging',
      icon: 'bell',
      route: '/settings/tasks-meetings',
      keywords: [
        'tasks',
        'meetings',
        'reminders',
        'schedule',
        'automated messages',
        'followup',
        'calendar',
      ],
    },

    // Lead capture: set up once, then enquiries arrive in the Inbox and Enquiries.
    {
      id: 'lead-forms',
      title: 'Lead forms',
      description: 'Bring in leads from Facebook and Instagram lead ads as contacts and enquiries.',
      category: 'Lead capture',
      icon: 'campaign',
      route: '/channels/lead-forms',
      keywords: ['lead ads', 'facebook', 'instagram', 'meta', 'leads', 'forms'],
    },
    {
      id: 'web-forms',
      title: 'Web forms',
      description: 'Enquiry forms for your website that create contacts and enquiries.',
      category: 'Lead capture',
      icon: 'template',
      route: '/forms',
      keywords: ['website', 'form', 'enquiry form', 'contact form', 'embed'],
    },
    {
      id: 'chat-links',
      title: 'Chat links & QR',
      description: 'WhatsApp chat links, QR codes and the website chat button.',
      category: 'Lead capture',
      icon: 'link',
      route: '/channels/widget',
      keywords: ['qr', 'link', 'wa.me', 'chat button', 'widget', 'website'],
    },
    {
      id: 'canned-replies',
      title: 'Canned replies',
      description: 'Saved answers the team inserts in the inbox with a /shortcut.',
      category: 'Lead capture',
      icon: 'document',
      route: '/canned-replies',
      keywords: ['canned', 'saved reply', 'quick reply', 'shortcut', 'snippet', 'macro'],
    },
    {
      id: 'auto-replies',
      title: 'Auto-replies',
      description: 'Away messages, greetings and keyword replies sent without anyone typing.',
      category: 'Lead capture',
      icon: 'clock',
      route: '/auto-replies',
      keywords: ['away', 'out of office', 'greeting', 'keyword', 'auto reply', 'business hours'],
    },

    // Calls & voice
    {
      id: 'voice-ivr',
      title: 'Voice / IVR',
      description: 'The phone menu callers hear, business hours and where calls ring.',
      category: 'Calls & voice',
      icon: 'phone',
      route: '/channels/voice-ivr',
      keywords: ['ivr', 'phone menu', 'call routing', 'exotel', 'voice', 'press 1'],
    },
    {
      id: 'web-call-button',
      title: 'Website call button',
      description: 'A button on your website that starts a call with your AI voice agent.',
      category: 'Calls & voice',
      icon: 'phone',
      route: '/calls/web-widget',
      keywords: ['website', 'call button', 'web call', 'widget', 'voice agent'],
    },
    {
      id: 'telecom',
      title: 'Telecom & numbers',
      description: 'Phone numbers, the telephony provider and SIP trunk.',
      category: 'Calls & voice',
      icon: 'tower',
      route: '/channels/telecom',
      keywords: ['telecom', 'phone number', 'sip', 'trunk', 'exotel', 'provider', 'did'],
    },

    // Sales & products
    {
      id: 'oem-settings',
      title: 'OEM settings',
      description: 'The OEMs you buy from, their claim rules and journal posting.',
      category: 'Sales & products',
      icon: 'settings',
      route: '/oem/settings',
      keywords: ['oem', 'spa', 'special price', 'claims', 'journal', 'manufacturer'],
    },
    {
      id: 'lifecycle-rules',
      title: 'Lifecycle rules',
      description: 'When a product counts as ageing, end-of-sale or obsolete.',
      category: 'Sales & products',
      icon: 'refresh',
      route: '/documents/lifecycle',
      keywords: ['lifecycle', 'obsolete', 'end of life', 'eol', 'product', 'radar'],
    },

    // Integrations & Ops
    {
      id: 'integrations',
      title: 'Integrations & Webhooks',
      description:
        'Set up outbound event webhooks, REST API keys, and third-party CRM or ERP sync pipelines.',
      category: 'Integrations & Ops',
      icon: 'link',
      route: '/settings/integrations',
      keywords: [
        'integrations',
        'api keys',
        'webhooks',
        'endpoints',
        'crm',
        'erp',
        'sync',
        'rest api',
      ],
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant & Copilot',
      description:
        'Configure AI prompt guidelines, knowledge base instructions, tone of voice, and model settings.',
      category: 'Integrations & Ops',
      icon: 'sparkle',
      route: '/settings/ai-assistant',
      keywords: [
        'ai',
        'assistant',
        'copilot',
        'gemini',
        'prompts',
        'intelligence',
        'bot',
        'knowledge',
      ],
    },
    {
      id: 'shipping',
      title: 'Shipping & Shiprocket',
      description:
        'Connect Shiprocket courier logistics, live rate calculation, and automatic dispatch tracking.',
      category: 'Integrations & Ops',
      icon: 'send',
      route: '/settings/shipping',
      keywords: [
        'shipping',
        'shiprocket',
        'courier',
        'logistics',
        'delivery',
        'dispatch',
        'tracking',
      ],
    },
    {
      id: 'payments',
      title: 'Payments & Gateways',
      description:
        'Configure Razorpay, UPI payment links, transaction webhooks, and automated collection receipts.',
      category: 'Integrations & Ops',
      icon: 'billing',
      route: '/settings/payments',
      keywords: [
        'payments',
        'razorpay',
        'upi',
        'gateway',
        'payment links',
        'collections',
        'invoicing',
      ],
    },

    // Compliance & Billing
    {
      id: 'compliance',
      title: 'Compliance & Data Retention',
      description:
        'Manage conversation retention lifecycles, message redaction policies, and audit data export.',
      category: 'Compliance & Billing',
      icon: 'shield',
      route: '/compliance',
      keywords: ['compliance', 'retention', 'data policy', 'gdpr', 'archive', 'export', 'privacy'],
    },
    {
      id: 'dpdp',
      title: 'DPDP Act Readiness',
      description:
        'Verify readiness for India’s Digital Personal Data Protection Act, consent logs, and audit registries.',
      category: 'Compliance & Billing',
      icon: 'shield',
      route: '/compliance/dpdp',
      keywords: [
        'dpdp',
        'data protection',
        'privacy',
        'consent',
        'india dpdp',
        'readiness',
        'compliance',
      ],
    },
    {
      id: 'billing',
      title: 'Billing & Wallet',
      description:
        'Manage subscription plan, recharge WhatsApp conversation credits, and download GST invoices.',
      category: 'Compliance & Billing',
      icon: 'billing',
      route: '/billing',
      keywords: [
        'billing',
        'wallet',
        'subscription',
        'plan',
        'invoice',
        'credits',
        'recharge',
        'gst',
      ],
    },
    {
      id: 'billing-invoices',
      title: 'Subscription invoices',
      description: 'GST invoices for your plan and wallet top-ups, to download or print.',
      category: 'Compliance & Billing',
      icon: 'document',
      route: '/billing/invoices',
      keywords: ['invoices', 'gst invoice', 'receipt', 'download', 'subscription'],
    },
    {
      id: 'audit-logs',
      title: 'Audit Logs',
      description:
        'Review tamper-evident audit trails of user logins, administrative changes, and system API calls.',
      category: 'Compliance & Billing',
      icon: 'clock',
      route: '/admin/audit-logs',
      keywords: ['audit logs', 'security audit', 'event logs', 'records', 'activity', 'system log'],
    },
  ];

  // Visible settings: the same rule as the menu (role, plan and feature), as these stand in for menu items.
  protected readonly authorizedSettings = computed(() => {
    this.account.isHost();
    this.account.permissionState();
    this.plans.features();
    return this.directoryItems.filter((item) => {
      if (!item.route) return true;
      return showsInMenu(item.route, this.permissions, this.plans, this.account);
    });
  });

  // Filtered by category and search query
  protected readonly filteredSettings = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const list = this.authorizedSettings();

    return list.filter((item) => {
      if (cat !== 'All' && item.category !== cat) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    });
  });

  // Settings grouped by category for structured overview
  protected readonly groupedSettings = computed(() => {
    const filtered = this.filteredSettings();
    const groups: { category: Exclude<SettingsCategory, 'All'>; items: SettingDirectoryItem[] }[] =
      [];

    const order: Exclude<SettingsCategory, 'All'>[] = [
      'Security & Access',
      'Workspace & Identity',
      'Channels & Messaging',
      'Lead capture',
      'Calls & voice',
      'Sales & products',
      'Integrations & Ops',
      'Compliance & Billing',
    ];

    for (const cat of order) {
      const items = filtered.filter((i) => i.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }
    return groups;
  });

  protected readonly categoryCounts = computed(() => {
    const list = this.authorizedSettings();
    // Partial: a category the user may see nothing in has no entry, and the pill shows 0 for it.
    const counts: Partial<Record<string, number>> = { All: list.length };
    for (const item of list) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  });

  constructor() {
    const param = this.route.snapshot.queryParamMap.get('tab');
    if (param) {
      this.tab.set(this.slugToTab(param));
    }
  }

  protected setTab(tabName: string): void {
    const target =
      SETTINGS_TABS.find((t) => t.toLowerCase() === tabName.toLowerCase()) ??
      this.slugToTab(tabName);
    this.tab.set(target);

    const slug = this.tabToSlug(target);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: slug === 'all' ? null : slug },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected setCategory(cat: SettingsCategory): void {
    this.selectedCategory.set(cat);
  }

  private tabToSlug(tab: SettingsTab): string {
    switch (tab) {
      case 'All Settings':
        return 'all';
      case 'Single Sign-On':
        return 'sso';
      case 'Two-Factor Auth':
        return '2fa';
      case 'Sessions & Devices':
        return 'sessions';
      case 'Sign-In History':
        return 'history';
      case 'Connected Accounts':
        return 'accounts';
      case 'Notifications':
        return 'notifications';
    }
  }

  private slugToTab(slug: string): SettingsTab {
    const s = slug.toLowerCase().trim();
    if (s === 'sso') return 'Single Sign-On';
    if (s === '2fa' || s === 'mfa' || s === 'security') return 'Two-Factor Auth';
    if (s === 'sessions' || s === 'devices') return 'Sessions & Devices';
    if (s === 'history') return 'Sign-In History';
    if (s === 'accounts' || s === 'connected' || s === 'logins') return 'Connected Accounts';
    if (s === 'notifications' || s === 'push') return 'Notifications';
    return 'All Settings';
  }

  protected async revokeSession(sessionId: string): Promise<void> {
    if (
      await this.dialogs.confirm({
        title: 'Sign this device out?',
        message: 'It has to sign in again to use your account.',
        confirmText: 'Sign out',
      })
    ) {
      void this.sessionStore.revoke(sessionId);
    }
  }

  protected async revokeOtherSessions(): Promise<void> {
    if (
      await this.dialogs.confirm({
        title: 'Sign out every other device?',
        message: 'This one stays signed in; every other device has to sign in again.',
        confirmText: 'Sign out others',
      })
    ) {
      void this.sessionStore.revokeOthers();
    }
  }

  protected when(iso?: string): string {
    if (!iso) return 'unknown';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  protected startEditing(): void {
    const c = this.sso();
    this.displayName.set(c.displayName ?? '');
    this.issuer.set(c.issuer ?? '');
    this.authorizationEndpoint.set(c.authorizationEndpoint ?? '');
    this.clientId.set(c.clientId ?? '');
    this.metadataAddress.set(c.metadataAddress ?? '');
    this.domains.set(c.allowedEmailDomains.join(', '));
    this.defaultRole.set(c.defaultRoleName || 'Agent');
    this.enforce.set(c.enforceSso);
    this.error.set(null);
    this.editing.set(true);
  }

  protected cancel(): void {
    this.editing.set(false);
  }

  protected async save(enable: boolean): Promise<void> {
    if (!this.canSave() || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      await this.store.saveSso({
        displayName: this.displayName().trim(),
        issuer: this.issuer().trim(),
        authorizationEndpoint: this.authorizationEndpoint().trim() || undefined,
        clientId: this.clientId().trim() || undefined,
        metadataAddress: this.metadataAddress().trim() || undefined,
        allowedEmailDomains: this.domainList(),
        defaultRoleName: this.defaultRole(),
        enforceSso: this.enforce(),
        enable,
      });
      this.editing.set(false);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the SSO configuration.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async disable(): Promise<void> {
    this.saving.set(true);
    try {
      await this.store.disableSso();
    } finally {
      this.saving.set(false);
    }
  }
}
