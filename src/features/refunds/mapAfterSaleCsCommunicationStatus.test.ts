import { describe, expect, it } from '@jest/globals';
import {
  AFTER_SALE_CS_STATUS_CHIP_CS,
  afterSaleCsStatusChipCs,
  mapAfterSaleCsCommunicationStatus,
} from './mapAfterSaleCsCommunicationStatus.js';

describe('mapAfterSaleCsCommunicationStatus (section 8 CS Admin parity)', () => {
  it('absent / prepared / queued / not_attempted -> prepared chip', () => {
    expect(mapAfterSaleCsCommunicationStatus(undefined)).toBe('prepared');
    expect(mapAfterSaleCsCommunicationStatus(null)).toBe('prepared');
    expect(mapAfterSaleCsCommunicationStatus('')).toBe('prepared');
    expect(mapAfterSaleCsCommunicationStatus('prepared')).toBe('prepared');
    expect(mapAfterSaleCsCommunicationStatus('queued')).toBe('prepared');
    expect(mapAfterSaleCsCommunicationStatus('not_attempted')).toBe('prepared');
    expect(afterSaleCsStatusChipCs('prepared')).toBe('p\u0159ipraveno');
  });

  it('sent -> odeslano; sent !== delivered', () => {
    expect(mapAfterSaleCsCommunicationStatus('sent')).toBe('sent');
    expect(afterSaleCsStatusChipCs('sent')).toBe('odesl\u00e1no');
    expect(mapAfterSaleCsCommunicationStatus('sent')).not.toBe('delivered');
    expect(AFTER_SALE_CS_STATUS_CHIP_CS.sent).not.toBe(AFTER_SALE_CS_STATUS_CHIP_CS.delivered);
  });

  it('delivered (DLR only) -> doruceno', () => {
    expect(mapAfterSaleCsCommunicationStatus('delivered')).toBe('delivered');
    expect(afterSaleCsStatusChipCs('delivered')).toBe('doru\u010deno');
  });

  it('failed / no_channel / needs_alternate -> needs_alternate chip', () => {
    expect(mapAfterSaleCsCommunicationStatus('failed')).toBe('needs_alternate');
    expect(mapAfterSaleCsCommunicationStatus('no_channel')).toBe('needs_alternate');
    expect(mapAfterSaleCsCommunicationStatus('needs_alternate')).toBe('needs_alternate');
    expect(afterSaleCsStatusChipCs('needs_alternate')).toBe(
      'vy\u017eaduje n\u00e1hradn\u00ed postup',
    );
  });

  it('paper_handed -> sent (ops attest; not Legal / not auto-delivered)', () => {
    expect(mapAfterSaleCsCommunicationStatus('paper_handed')).toBe('sent');
    expect(mapAfterSaleCsCommunicationStatus('paper_handed')).not.toBe('delivered');
  });

  it('never surfaces Legal / LEGALLY_NOTIFIED as a Legal-read label', () => {
    expect(mapAfterSaleCsCommunicationStatus('LEGALLY_NOTIFIED')).toBe('needs_alternate');
    expect(
      afterSaleCsStatusChipCs(mapAfterSaleCsCommunicationStatus('LEGALLY_NOTIFIED')),
    ).not.toMatch(/legal/i);
  });
});