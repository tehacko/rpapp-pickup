/**
 * W7 AC evidence — AC-14 pickup FE: screenshot cannot mark verified;
 * paidVerified only from live Transaction.status COMPLETED lookup result.
 */
import { describe, expect, it } from '@jest/globals';
import { buildSelfScanPaidVerifyViewModel } from '../buildSelfScanPaidVerifyViewModel.js';

describe('buildSelfScanPaidVerifyViewModel — AC-14 pickup FE evidence', () => {
  it('AC-14: view model never exposes screenshot mark-verified action keys', () => {
    const vm = buildSelfScanPaidVerifyViewModel({
      tenantCode: 'railway-cafe',
      transactionIdInput: '99',
      lookupBusy: false,
      lookupError: null,
      result: {
        transactionId: 99,
        status: 'COMPLETED',
        paidVerified: true,
        lookedUpAt: '2026-10-02T10:00:00.000Z',
      },
    });
    expect(vm.screenshotBanCopyKey).toBe('pickup.selfScan.verifyAc14Ban');
    expect(vm.paidVerified).toBe(true);
    expect(vm).not.toHaveProperty('markVerifiedByScreenshot');
    expect(vm).not.toHaveProperty('acceptScreenshot');
    expect(vm).not.toHaveProperty('screenshotProofUpload');
  });

  it('AC-14: PENDING live status → paidVerified false (screenshot alone cannot invent verify)', () => {
    const vm = buildSelfScanPaidVerifyViewModel({
      tenantCode: 'railway-cafe',
      transactionIdInput: '99',
      lookupBusy: false,
      lookupError: null,
      result: {
        transactionId: 99,
        status: 'PENDING',
        paidVerified: false,
        lookedUpAt: '2026-10-02T10:00:00.000Z',
      },
    });
    expect(vm.paidVerified).toBe(false);
    expect(vm.status).toBe('PENDING');
    expect(vm.screenshotBanCopyKey).toBe('pickup.selfScan.verifyAc14Ban');
  });

  it('AC-14: null result (no live lookup) → paidVerified false', () => {
    const vm = buildSelfScanPaidVerifyViewModel({
      tenantCode: 'railway-cafe',
      transactionIdInput: '',
      lookupBusy: false,
      lookupError: null,
      result: null,
    });
    expect(vm.paidVerified).toBe(false);
    expect(vm.status).toBeNull();
  });
});

