import { normalizeScanToken } from './scanToken.js';

describe('normalizeScanToken', () => {
  it('returns trimmed raw token when input is not a URL', () => {
    expect(normalizeScanToken('  pickup-token-42  ')).toBe('pickup-token-42');
  });

  it('extracts t query param from pickup handoff URLs', () => {
    expect(
      normalizeScanToken('https://pickup.example.com/scan?t=abc123&salesPointId=9')
    ).toBe('abc123');
  });

  it('falls back to full trimmed URL when t param is missing', () => {
    const url = 'https://pickup.example.com/scan?salesPointId=9';
    expect(normalizeScanToken(url)).toBe(url);
  });

  it('returns trimmed input when URL parsing fails', () => {
    expect(normalizeScanToken('https://')).toBe('https://');
  });
});
