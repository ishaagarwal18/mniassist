import { describe, expect, it } from 'vitest';

import { socialLinks } from './social-links';

describe('socialLinks', () => {
  it('shows nothing when no URL is set', () => {
    expect(socialLinks({ linkedin: '', youtube: '' })).toEqual([]);
    expect(socialLinks(undefined)).toEqual([]);
  });

  it('keeps only the networks that are set, in display order', () => {
    const links = socialLinks({
      youtube: 'https://youtube.com/@mniassist',
      linkedin: 'https://www.linkedin.com/company/mniassist',
    });
    expect(links.map((l) => l.key)).toEqual(['linkedin', 'youtube']);
  });

  it('drops a handle or a non-https link', () => {
    expect(socialLinks({ x: '@mniassist', facebook: 'http://facebook.com/x' })).toEqual([]);
  });
});
