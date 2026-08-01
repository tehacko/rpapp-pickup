import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function flattenLeaves(
  value: Json,
  prefix = '',
  output = new Map<string, string>()
): Map<string, string> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenLeaves(child, prefix.length > 0 ? `${prefix}.${key}` : key, output);
    }
    return output;
  }
  if (prefix.length > 0 && typeof value === 'string') {
    output.set(prefix, value);
  }
  return output;
}

const BANNED_SK =
  /\b(Staff hub|Checkout|soft[- ]?delete|Refundovať|Submitovať|měsíc|teď|řídit|přístup|odběrné místo)\b/i;

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

function placeholders(input: string): string[] {
  const names: string[] = [];
  for (const match of input.matchAll(PLACEHOLDER_RE)) {
    const name = match[1];
    if (name !== undefined) {
      names.push(name);
    }
  }
  return names.sort();
}

function loadLocale(rel: string): Map<string, string> {
  const raw = readFileSync(resolve(process.cwd(), rel), 'utf8');
  return flattenLeaves(JSON.parse(raw) as Json);
}

describe('pickup Slovak locale quality', () => {
  const skMap = loadLocale('src/locales/sk/pickup.json');
  const enMap = loadLocale('src/locales/en/pickup.json');

  it('has full EN→SK key parity', () => {
    const missing = [...enMap.keys()].filter((k) => !skMap.has(k));
    expect(missing).toEqual([]);
  });

  it('preserves placeholders vs EN', () => {
    const mismatches: string[] = [];
    for (const [key, enValue] of enMap) {
      const skValue = skMap.get(key);
      if (skValue === undefined) {
        continue;
      }
      if (placeholders(enValue).join(',') !== placeholders(skValue).join(',')) {
        mismatches.push(key);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('rejects known EngSlovak / Czech-diacritic patterns', () => {
    const hits: string[] = [];
    for (const [key, value] of skMap) {
      if (BANNED_SK.test(value)) {
        hits.push(`${key}: ${value.slice(0, 120)}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('uses natural staff Slovak for hub and offline', () => {
    expect(skMap.get('nav.bottom.hub')).toMatch(/Prehľad/i);
    expect(skMap.get('nav.bottom.offline')).toMatch(/Bez pripojenia/i);
    expect(skMap.get('shell.language.sk')).toMatch(/slovenčin/i);
    expect(skMap.get('shell.language.skShort')).toBe('SK');
  });
});
