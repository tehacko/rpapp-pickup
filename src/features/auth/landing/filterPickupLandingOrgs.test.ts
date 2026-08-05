import { describe, expect, it } from '@jest/globals';
import {
  filterPickupLandingOrgs,
  resolvePickupLandingLogoSrc,
} from './filterPickupLandingOrgs.js';

describe('filterPickupLandingOrgs', () => {
  const orgs = [
    { name: 'Zebra Cafe', code: 'zebra' },
    { name: 'Alpha Bistro', code: 'alpha' },
    { name: 'Midtown Rails', code: 'midtown' },
  ] as const;

  it('sorts A–Z by name', () => {
    const result = filterPickupLandingOrgs([...orgs], { query: '', sort: 'nameAsc' });
    expect(result.map((o) => o.code)).toEqual(['alpha', 'midtown', 'zebra']);
  });

  it('sorts Z–A by name', () => {
    const result = filterPickupLandingOrgs([...orgs], { query: '', sort: 'nameDesc' });
    expect(result.map((o) => o.code)).toEqual(['zebra', 'midtown', 'alpha']);
  });

  it('filters by name or code', () => {
    expect(
      filterPickupLandingOrgs([...orgs], { query: 'rail', sort: 'nameAsc' }).map((o) => o.code),
    ).toEqual(['midtown']);
    expect(
      filterPickupLandingOrgs([...orgs], { query: 'ZEBRA', sort: 'nameAsc' }).map((o) => o.code),
    ).toEqual(['zebra']);
  });
});

describe('resolvePickupLandingLogoSrc', () => {
  it('keeps absolute and same-origin paths', () => {
    expect(resolvePickupLandingLogoSrc('https://cdn.example/logo.png')).toBe(
      'https://cdn.example/logo.png',
    );
    expect(resolvePickupLandingLogoSrc('/api/logo.png')).toBe('/api/logo.png');
  });

  it('returns null for empty', () => {
    expect(resolvePickupLandingLogoSrc(null)).toBeNull();
    expect(resolvePickupLandingLogoSrc('  ')).toBeNull();
  });
});
