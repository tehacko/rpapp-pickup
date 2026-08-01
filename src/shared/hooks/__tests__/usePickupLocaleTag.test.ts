import { describe, expect, it } from '@jest/globals';
import { resolvePickupLocaleTag } from '../usePickupLocaleTag.js';

describe('resolvePickupLocaleTag', () => {
  it('maps cs / en / sk to BCP-47 tags', () => {
    expect(resolvePickupLocaleTag('cs')).toBe('cs-CZ');
    expect(resolvePickupLocaleTag('cs-CZ')).toBe('cs-CZ');
    expect(resolvePickupLocaleTag('en')).toBe('en-GB');
    expect(resolvePickupLocaleTag('en-US')).toBe('en-GB');
    expect(resolvePickupLocaleTag('sk')).toBe('sk-SK');
    expect(resolvePickupLocaleTag('sk-SK')).toBe('sk-SK');
  });
});
