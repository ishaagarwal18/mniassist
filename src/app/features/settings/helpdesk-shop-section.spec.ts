import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmService } from '../../core/ui/confirm.service';
import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';
import { IntegrationState } from '../../proxy/integrations/integration-state.enum';
import { IntegrationService } from '../../proxy/integrations/integration.service';
import { ArHelpdeskShopSection } from './helpdesk-shop-section';

describe('Helpdesk and store connections', () => {
  const api = {
    getList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    test: vi.fn(),
    delete: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.getList.mockReturnValue(
      of({
        items: [
          {
            id: 'c1',
            kind: IntegrationKind.Freshdesk,
            name: 'Support',
            state: IntegrationState.Connected,
            configJson: '{"domain":"meridian.freshdesk.com"}',
          },
          { id: 'c2', kind: IntegrationKind.HubSpot, name: 'CRM', configJson: '{}' },
        ],
        totalCount: 2,
      }),
    );
    api.create.mockReturnValue(of({ id: 'c3' }));
    api.test.mockReturnValue(of({ id: 'c3' }));
    TestBed.configureTestingModule({
      imports: [ArHelpdeskShopSection],
      providers: [
        { provide: IntegrationService, useValue: api },
        { provide: ConfirmService, useValue: { delete: vi.fn() } },
      ],
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArHelpdeskShopSection);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }
  const set = (root: HTMLElement, name: string, value: string) => {
    const input = root.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('lists only helpdesk and store connections, with their address and state', async () => {
    const { root } = await create();
    const items = [...root.querySelectorAll('.hs__list li')].map((li) => li.textContent!);
    expect(items).toHaveLength(1);
    expect(items[0]).toContain('Support');
    expect(items[0]).toContain('meridian.freshdesk.com');
    expect(items[0]).toContain('Connected');
  });

  it('connects Shopify only at a myshopify.com address, then tests it', async () => {
    const { fixture, root } = await create();
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Connect'))!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const kind = root.querySelector('select[name="kind"]') as HTMLSelectElement;
    kind.selectedIndex = 2; // Shopify
    kind.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    set(root, 'name', 'Store');
    set(root, 'address', 'shop.example.com');
    set(root, 'credential', 'shpat_x');
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(api.create).not.toHaveBeenCalled();
    // The problem is shown under the field it is about, and the field is marked invalid.
    const address = root.querySelector('input[name="address"]') as HTMLInputElement;
    expect(address.getAttribute('aria-invalid')).toBe('true');
    expect(address.parentElement?.querySelector('.ar-field__error')?.textContent).toContain(
      'acme.myshopify.com',
    );

    set(root, 'address', 'https://Meridian.myshopify.com/admin');
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.create).toHaveBeenCalledWith({
      kind: IntegrationKind.Shopify,
      name: 'Store',
      configJson: '{"shop":"meridian.myshopify.com"}',
      credential: 'shpat_x',
    });
    expect(api.test).toHaveBeenCalledWith('c3');
    // The test came back without "connected": that is said, rather than the save looking fine.
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('the test failed');
  });
});
