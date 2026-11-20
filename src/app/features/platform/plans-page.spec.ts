import { PlanFeature } from '../../proxy/billing/plan-feature.enum';
import { SubscriptionPlan } from '../../proxy/billing/subscription-plan.enum';
import { PLAN_MODULES, UNLIMITED, emptyPlanForm, planToForm, readPlanForm } from './plans-page';

describe('plan form', () => {
  it('lists every module once, by readable name', () => {
    const names = PLAN_MODULES.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('PipelineCrm');
    expect(PLAN_MODULES.find((m) => m.name === 'PipelineCrm')?.label).toBe('Pipeline CRM');
  });

  it('turns the typed form into the plan to save', () => {
    const f = emptyPlanForm();
    f.name = '  Growth Plus ';
    f.rupees = '7,499.50';
    f.contactsUnlimited = true;
    f.features = new Set(['Voice', 'Sms']);
    f.highlights = 'Priority support\n\n Onboarding call ';
    f.isPublic = true;
    const read = readPlanForm(f);
    expect('input' in read).toBe(true);
    if (!('input' in read)) return;
    expect(read.input).toMatchObject({
      name: 'Growth Plus',
      monthlyFeeInPaise: 749950,
      contactLimit: UNLIMITED,
      highlights: ['Priority support', 'Onboarding call'],
      isPublic: true,
    });
    expect(read.input.features.sort()).toEqual([PlanFeature.Voice, PlanFeature.Sms].sort());
  });

  it('says what is wrong before anything is sent', () => {
    const f = emptyPlanForm();
    expect(readPlanForm(f)).toEqual({ problem: expect.stringContaining('name') });
    f.name = 'Solo';
    f.seats = '0';
    expect(readPlanForm(f)).toEqual({ problem: expect.stringContaining('Members') });
    f.seats = '3';
    f.contacts = '50';
    expect(readPlanForm(f)).toEqual({ problem: expect.stringContaining('Contacts') });
  });

  it('opens an existing plan with unlimited limits ticked', () => {
    const f = planToForm({
      id: 'p1',
      name: 'Enterprise',
      builtIn: SubscriptionPlan.Enterprise,
      basePlan: SubscriptionPlan.Enterprise,
      monthlyFeeInPaise: 2499900,
      includedAgentSeats: 50,
      channelLimit: 20,
      contactLimit: UNLIMITED,
      features: ['Sso'],
      highlights: ['Dedicated manager'],
      isPublic: true,
      sortOrder: 30,
      isArchived: false,
      workspaceCount: 2,
      isCurrent: false,
    });
    expect(f.contactsUnlimited).toBe(true);
    expect(f.rupees).toBe('24999');
    expect(f.highlights).toBe('Dedicated manager');
    expect(f.features.has('Sso')).toBe(true);
  });
});
