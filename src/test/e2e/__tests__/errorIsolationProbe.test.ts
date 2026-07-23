import {
  isErrorIsolationProbeFeature,
  resolveErrorIsolationProbeThrow,
} from '../errorIsolationProbeLogic.js';

describe('errorIsolationProbe', () => {
  describe('isErrorIsolationProbeFeature', () => {
    it('accepts known pickup feature strings', () => {
      expect(isErrorIsolationProbeFeature('shell-outlet')).toBe(true);
      expect(isErrorIsolationProbeFeature('hub')).toBe(true);
      expect(isErrorIsolationProbeFeature('scan')).toBe(true);
      expect(isErrorIsolationProbeFeature('queue')).toBe(true);
      expect(isErrorIsolationProbeFeature('sell')).toBe(true);
      expect(isErrorIsolationProbeFeature('order')).toBe(true);
      expect(isErrorIsolationProbeFeature('barcode')).toBe(true);
      expect(isErrorIsolationProbeFeature('barcode-detail')).toBe(true);
    });

    it('rejects unknown strings', () => {
      expect(isErrorIsolationProbeFeature('account')).toBe(false);
      expect(isErrorIsolationProbeFeature('checkout')).toBe(false);
      expect(isErrorIsolationProbeFeature('')).toBe(false);
    });
  });

  describe('resolveErrorIsolationProbeThrow', () => {
    it('returns null in PROD when flag unset (tree-shake / ship-safe)', () => {
      expect(
        resolveErrorIsolationProbeThrow({
          isDev: false,
          isProd: true,
          flag: undefined,
          mountFeature: 'order',
        }),
      ).toBeNull();
    });

    it('throws path in PROD when window flag matches mount feature', () => {
      expect(
        resolveErrorIsolationProbeThrow({
          isDev: false,
          isProd: true,
          flag: 'order',
          mountFeature: 'order',
        }),
      ).toBe('order');
    });

    it('returns null when flag is known but not this mount (feature-scope)', () => {
      expect(
        resolveErrorIsolationProbeThrow({
          isDev: true,
          isProd: false,
          flag: 'queue',
          mountFeature: 'shell-outlet',
        }),
      ).toBeNull();
    });

    it('returns null in DEV when flag unset (no accidental throw)', () => {
      expect(
        resolveErrorIsolationProbeThrow({
          isDev: true,
          isProd: false,
          flag: undefined,
          mountFeature: 'hub',
        }),
      ).toBeNull();
    });

    it('returns known feature in DEV when flag matches mount', () => {
      expect(
        resolveErrorIsolationProbeThrow({
          isDev: true,
          isProd: false,
          flag: 'queue',
          mountFeature: 'queue',
        }),
      ).toBe('queue');
    });

    it('returns null for unknown flag values (no throw)', () => {
      expect(
        resolveErrorIsolationProbeThrow({
          isDev: true,
          isProd: false,
          flag: 'not-a-feature',
          mountFeature: 'scan',
        }),
      ).toBeNull();
    });

    it('returns null when neither DEV nor flag (inactive gate)', () => {
      expect(
        resolveErrorIsolationProbeThrow({
          isDev: false,
          isProd: false,
          flag: undefined,
          mountFeature: 'shell-outlet',
        }),
      ).toBeNull();
    });
  });
});