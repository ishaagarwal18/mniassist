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

  it('shows the system integrators page with original content and enhanced visuals', async () => {
    setUp('system-integrators');
    const fixture = TestBed.createComponent(ArIndustryPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;

    // Headline & Intro
    expect(text).toContain('Quote faster, follow up every enquiry, and never miss an AMC renewal.');
    expect(text).toContain('You quote, install and service equipment for other businesses');

    // Problems
    expect(text).toContain('Sound familiar?');
    expect(text).toContain('Enquiries arrive on WhatsApp, calls and email, and some never get a quote.');
    expect(text).toContain('Quotations go out, then nobody follows up.');
    expect(text).toContain('Renewals depend on someone remembering which customer’s AMC ends this month.');

    // Uses
    expect(text).toContain('What MNI Assist does for you');
    expect(text).toContain('Enquiries to quotations');
    expect(text).toContain('Installed base');
    expect(text).toContain('AI agent for enquiries');
    expect(text).toContain('AI renewal calls');

    // Playbooks & Plan
    expect(text).toContain('Ready AI agents for you');
    expect(text).toContain('Lead qualification');
    expect(text).toContain('Service and renewal reminders');
    expect(text).toContain('Appointment booking');
    expect(text).toContain('Pro (₹9,999 a month, excluding GST)');

    // Pitch & CTAs
    expect(text).toContain('Every quotation you send has a follow-up behind it, and every AMC renewal gets a call on time.');
    expect(text).toContain('Create a workspace');
    expect(text).toContain('Work out your saving');
  });

  it('shows the machine OEMs page with original content and enhanced visuals', async () => {
    setUp('oems');
    const fixture = TestBed.createComponent(ArIndustryPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;

    expect(text).toContain('Machine OEMs');
    expect(text).toContain('Keep the customer for the machine’s whole life.');
    expect(text).toContain('AMC and calibration dates live in spreadsheets.');
    expect(text).toContain('AMC and calibration campaigns');
    expect(text).toContain('Support and service desk');
    expect(text).toContain('Create a workspace');
    expect(text).toContain('Work out your saving');
  });

  it('shows the distributors and dealers page with original content and enhanced visuals', async () => {
    setUp('distributors');
    const fixture = TestBed.createComponent(ArIndustryPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;

    expect(text).toContain('Distributors and dealers');
    expect(text).toContain('Answer faster than the next supplier, and get paid sooner.');
    expect(text).toContain('Dealers ask for prices and stock, and wait for a reply.');
    expect(text).toContain('WhatsApp catalogue');
    expect(text).toContain('Payment collections');
    expect(text).toContain('Growth (₹4,999 a month, excluding GST)');
    expect(text).toContain('Create a workspace');
    expect(text).toContain('Work out your saving');
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
