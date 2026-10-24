import { describe, expect, it } from '@jest/globals';
import { parseOptionalAccessRevision } from '../parseAccessRevision.js';

const VALID =
  'ar1:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('parseOptionalAccessRevision pickup (Package G section 8.2)', () => {
  it('accepts ar1 + 64 lowercase hex', () => {
    expect(parseOptionalAccessRevision(VALID)).toBe(VALID);
  });

  it('omits missing / malformed', () => {
    expect(parseOptionalAccessRevision(undefined)).toBeUndefined();
    expect(parseOptionalAccessRevision('ar1:' + 'A'.repeat(64))).toBeUndefined();
    expect(parseOptionalAccessRevision('ar1:' + 'a'.repeat(63))).toBeUndefined();
  });
});