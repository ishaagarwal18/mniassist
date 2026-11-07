import { describe, expect, it } from 'vitest';

import {
  LifecycleStage,
  MigrationState,
  RadarRowDto,
  RiskBand,
} from '../../../proxy/pipeline/obsolescence.service';
import {
  atRiskSentence,
  formatAccessories,
  groupRadar,
  LIFECYCLE_TEMPLATE,
  parseAccessories,
  parseBand,
} from './obsolescence.logic';

let next = 0;

function row(over: Partial<RadarRowDto>): RadarRowDto {
  next++;
  return {
    id: `r${next}`,
    componentId: `k${next}`,
    installedAssetId: 'm1',
    contactId: 'c1',
    accountName: 'Bharat Forge',
    siteName: 'Pune plant',
    machineDescription: 'Press line',
    partNumber: 'P',
    componentDescription: 'CPU',
    quantity: 1,
    stage: LifecycleStage.PhaseOut,
    effectiveOn: '2025-01-01T00:00:00',
    isAnnounced: false,
    score: 40,
    band: RiskBand.Medium,
    replacementProblem: false,
    estimatedValueInPaise: 0,
    state: MigrationState.None,
    ...over,
  };
}

describe('groupRadar', () => {
  it('groups by account, then site, riskiest component first', () => {
    const groups = groupRadar([
      row({ partNumber: 'A', score: 40 }),
      row({ partNumber: 'B', score: 85, band: RiskBand.High }),
      row({ partNumber: 'C', siteName: 'Chakan plant', score: 55 }),
      row({
        partNumber: 'D',
        contactId: 'c2',
        accountName: 'Tata Motors',
        siteName: null,
        score: 30,
      }),
    ]);

    expect(groups.map((g) => g.account)).toEqual(['Bharat Forge', 'Tata Motors']);
    const [bharat, tata] = groups;
    expect(bharat.count).toBe(3);
    expect(bharat.score).toBe(85);
    expect(bharat.sites.map((s) => s.site)).toEqual(['Pune plant', 'Chakan plant']);
    expect(bharat.sites[0].rows.map((r) => r.partNumber)).toEqual(['B', 'A']);
    expect(bharat.sites[0].score).toBe(85);
    expect(tata.sites[0].site).toBe('No site recorded');
  });

  it('treats the same site written in another case as one site', () => {
    const groups = groupRadar([row({ siteName: 'Pune Plant' }), row({ siteName: 'pune plant ' })]);
    expect(groups[0].sites.length).toBe(1);
  });
});

describe('atRiskSentence', () => {
  it('says what a save put on the radar', () => {
    expect(atRiskSentence(38, 12)).toBe('38 components at 12 sites are now at risk.');
    expect(atRiskSentence(1, 1)).toBe('1 component at 1 site is now at risk.');
    expect(atRiskSentence(0, 0, 4)).toBe(
      'No installed components are at risk from this; 4 more are announced for a later date.',
    );
  });
});

describe('parseBand', () => {
  it('reads a band from the link or the select', () => {
    expect(parseBand('High')).toBe(RiskBand.High);
    expect(parseBand('1')).toBe(RiskBand.Medium);
    expect(parseBand('')).toBeNull();
    expect(parseBand('nope')).toBeNull();
  });
});

describe('LIFECYCLE_TEMPLATE', () => {
  it('has the columns the import reads, in order', () => {
    const header = LIFECYCLE_TEMPLATE.split(String.fromCharCode(13, 10))[0];
    expect(header).toBe(
      'Make,Series,Part number,Stage,Effective on,Last-buy on,Replacement,Relation,Note,Source',
    );
  });
});

describe('parseAccessories', () => {
  it('reads part numbers with optional quantities and adds up repeats', () => {
    expect(
      parseAccessories('6ES7972-0BB12-0XA0 x2, CABLE-1\nkit-9 × 1.5, cable-1 x 3').items,
    ).toEqual([
      { partNumber: '6ES7972-0BB12-0XA0', quantityPerUnit: 2 },
      { partNumber: 'CABLE-1', quantityPerUnit: 4 },
      { partNumber: 'kit-9', quantityPerUnit: 1.5 },
    ]);
    expect(parseAccessories('  ').items).toEqual([]);
  });

  it('says what it could not read', () => {
    expect(parseAccessories('mounting kit for rack').problem).toContain('mounting kit for rack');
    expect(parseAccessories('KIT x 0').problem).not.toBeNull();
  });

  it('writes them back the same way', () => {
    expect(formatAccessories([{ partNumber: 'KIT-1', quantityPerUnit: 2 }])).toBe('KIT-1 × 2');
    expect(
      parseAccessories(formatAccessories([{ partNumber: 'KIT-1', quantityPerUnit: 2 }])).items,
    ).toEqual([{ partNumber: 'KIT-1', quantityPerUnit: 2 }]);
  });
});
