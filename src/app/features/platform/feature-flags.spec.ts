import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { FeatureFlagDto } from '../../proxy/platform';
import {
  FEATURE_DEFINITIONS,
  computeTenantBucket,
  evaluateFeatureFlag,
} from './feature-flags';

describe('Feature Flags logic & evaluator', () => {
  it('has registered feature definitions with descriptive metadata', () => {
    expect(FEATURE_DEFINITIONS.length).toBeGreaterThanOrEqual(4);
    const mmLite = FEATURE_DEFINITIONS.find((f) => f.value === 'mm-lite');
    expect(mmLite).toBeDefined();
    expect(mmLite?.label).toContain('Marketing Messages');
    expect(mmLite?.category).toBe('Messaging');
  });

  it('computes deterministic tenant hash buckets between 0 and 99', () => {
    const bucket1 = computeTenantBucket('t-1', 'mm-lite');
    const bucket2 = computeTenantBucket('t-1', 'mm-lite');
    // Stable hash produces identical results for identical inputs
    expect(bucket1).toBe(bucket2);
    expect(bucket1).toBeGreaterThanOrEqual(0);
    expect(bucket1).toBeLessThan(100);

    // Case-insensitive & trimmed
    const bucketTrim = computeTenantBucket('  T-1  ', 'MM-LITE');
    expect(bucketTrim).toBe(bucket1);

    const bucketDiff = computeTenantBucket('t-2', 'mm-lite');
    expect(bucketDiff).toBeGreaterThanOrEqual(0);
    expect(bucketDiff).toBeLessThan(100);
  });

  it('correctly evaluates workspace overrides taking precedence over global rollout', () => {
    const flags: FeatureFlagDto[] = [
      {
        id: 'ff-global',
        key: 'auto-reorder-portal',
        enabled: false,
        rolloutPercent: 0,
      },
      {
        id: 'ff-override',
        key: 'auto-reorder-portal',
        tenantId: 't-1',
        tenantName: 'Sun Energy Automation',
        enabled: true,
        rolloutPercent: 100,
      },
    ];

    // For tenant t-1: Override wins and enables feature
    const resOverride = evaluateFeatureFlag(flags, 't-1', 'auto-reorder-portal');
    expect(resOverride.enabled).toBe(true);
    expect(resOverride.source).toBe('override');
    expect(resOverride.reason).toContain('Sun Energy Automation');

    // For other tenants: Global 0% applies and disables feature
    const resOther = evaluateFeatureFlag(flags, 't-999', 'auto-reorder-portal');
    expect(resOther.enabled).toBe(false);
    expect(resOther.source).toBe('global');
  });

  it('correctly evaluates global 100% active flag', () => {
    const flags: FeatureFlagDto[] = [
      {
        id: 'ff-global-on',
        key: 'mm-lite',
        enabled: true,
        rolloutPercent: 100,
      },
    ];

    const res = evaluateFeatureFlag(flags, 'random-tenant', 'mm-lite');
    expect(res.enabled).toBe(true);
    expect(res.source).toBe('global');
    expect(res.rolloutPercent).toBe(100);
  });

  it('correctly evaluates canary percentage rollout with deterministic hashing', () => {
    const flags: FeatureFlagDto[] = [
      {
        id: 'ff-canary',
        key: 'voice-agent-ai',
        enabled: false,
        rolloutPercent: 50,
      },
    ];

    const res = evaluateFeatureFlag(flags, 'tenant-xyz', 'voice-agent-ai');
    expect(res.source).toBe('canary');
    expect(res.rolloutPercent).toBe(50);
    // If bucket < 50, it is included; otherwise excluded
    if (res.bucket < 50) {
      expect(res.enabled).toBe(true);
      expect(res.reason).toContain('is within the 50% canary rollout threshold');
    } else {
      expect(res.enabled).toBe(false);
      expect(res.reason).toContain('is outside the 50% canary rollout threshold');
    }
  });

  it('handles missing flag rule with safe disabled fallback', () => {
    const res = evaluateFeatureFlag([], 't-1', 'unknown-feature');
    expect(res.enabled).toBe(false);
    expect(res.source).toBe('none');
  });
});
