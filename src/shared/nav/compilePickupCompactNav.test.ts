import { describe, expect, it } from '@jest/globals';
import {
  compilePickupCompactNav,
  PICKUP_BOTTOM_NAV_MAX_PRIMARY,
  type PickupShellNavItem,
} from './compilePickupCompactNav.js';

function item(id: string): PickupShellNavItem {
  return { id, to: `/${id}`, labelKey: `nav.${id}` };
}

describe('compilePickupCompactNav', () => {
  it('promotes restock and checkup into unused primary slots (resupply-only tenant)', () => {
    const compiled = compilePickupCompactNav(
      [item('hub')],
      [item('restock'), item('checkup')],
    );
    expect(compiled.primary.map((entry) => entry.id)).toEqual(['hub', 'restock', 'checkup']);
    expect(compiled.overflow).toEqual([]);
  });

  it('keeps hub/scan/queue/sell as the four primaries when the bar is full', () => {
    const compiled = compilePickupCompactNav(
      [item('hub'), item('scan'), item('queue'), item('sell')],
      [item('barcode-assign'), item('restock'), item('checkup')],
    );
    expect(compiled.primary.map((entry) => entry.id)).toEqual([
      'hub',
      'scan',
      'queue',
      'sell',
    ]);
    expect(compiled.overflow.map((entry) => entry.id)).toEqual([
      'barcode-assign',
      'restock',
      'checkup',
    ]);
    expect(compiled.primary).toHaveLength(PICKUP_BOTTOM_NAV_MAX_PRIMARY);
  });

  it('never duplicates an id between primary and overflow', () => {
    const compiled = compilePickupCompactNav(
      [item('hub'), item('scan')],
      [item('hub'), item('restock')],
    );
    const primaryIds = compiled.primary.map((entry) => entry.id);
    const overflowIds = compiled.overflow.map((entry) => entry.id);
    expect(primaryIds.filter((id) => overflowIds.includes(id))).toEqual([]);
    expect(primaryIds).toEqual(['hub', 'scan', 'restock']);
  });

  it('caps primary destinations at four', () => {
    const compiled = compilePickupCompactNav(
      [item('hub'), item('scan'), item('queue')],
      [item('barcode-assign'), item('restock'), item('checkup')],
    );
    expect(compiled.primary.map((entry) => entry.id)).toEqual([
      'hub',
      'scan',
      'queue',
      'barcode-assign',
    ]);
    expect(compiled.overflow.map((entry) => entry.id)).toEqual(['restock', 'checkup']);
  });
});
