import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { CurrentUserService } from '../../core/services/current-user.service';
import { ArWhatsNew, RELEASES } from '../help/whats-new';
import { ArIndustryPage, INDUSTRY_PAGES } from './industry-page';
import { ArRoiCalculator } from './roi-calculator';

function setUp(segment: string | null = null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CurrentUserService, useValue: { isAuthenticated: signal(false) } },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap(segment ? { segment } : {})) },
      },
    ],
  });
}

describe('Public pages', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('the ROI calculator waits for the AI rate, then estimates with the Pro plan', async () => {
    setUp();
    const fixture = TestBed.createComponent(ArRoiCalculator);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Enter the AI call rate to see your estimate');
    expect(root.querySelector('select')!.textContent).toContain('Pro');
    expect(root.querySelector('select')!.textContent).not.toContain('Growth'); // no AI voice on Growth

    const rate = root.querySelector('input[name="rate"]') as HTMLInputElement;
    rate.value = '2';
    rate.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    // 1,000 calls: 700 handled × 6 min × ₹300/h = ₹21,000, less 3,000 min × ₹2 and Pro ₹9,999.
    expect(root.textContent).toContain('Saves ₹5,001 a month');
    expect(root.textContent).toContain('Log in');
  });

  it('shows an industry page by its address, and the list for an unknown one', async () => {
    setUp('distributors');
    let fixture = TestBed.createComponent(ArIndustryPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    let text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Distributors and dealers');
    expect(text).toContain('Payment collections');
    expect(text).toContain('Work out your saving');
    TestBed.resetTestingModule();

    setUp('bakeries');
    fixture = TestBed.createComponent(ArIndustryPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    text = (fixture.nativeElement as HTMLElement).textContent!;
    for (const p of INDUSTRY_PAGES) expect(text).toContain(p.name);
  });

  it('every industry page says AI voice agents need Pro', () => {
    for (const p of INDUSTRY_PAGES) expect(p.planFit).toContain('Pro');
  });

  it('what’s new lists releases newest first', async () => {
    setUp();
    TestBed.overrideComponent(ArWhatsNew, { set: { imports: [] } });
    const dates = RELEASES.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
