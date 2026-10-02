import { shouldEmitLogRepeat } from 'pi-kiosk-shared/logging';
import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import type { ISelfScanGateway } from './ISelfScanGateway.js';
import { selfScanApiLog, selfScanPollLog } from './logging.js';
import {
  addSelfScanWeightedLine,
  approveSelfScanRestricted,
  completeSelfScanSelectiveCheck,
  escalateSelfScanSelectiveCheck,
  fetchSelfScanBasketDetail,
  fetchSelfScanHistory,
  fetchSelfScanLiveBoard,
  fetchSelfScanPaidVerify,
  patchSelfScanBasketLine,
  selectSelfScanBasketForCheck,
} from './selfScanApi.js';
import type {
  SelfScanAddWeightedLineInput,
  SelfScanBasketDetail,
  SelfScanHistoryBasket,
  SelfScanListResult,
  SelfScanLiveBasketSummary,
  SelfScanPaidVerifyResult,
  SelfScanPatchLineInput,
  SelfScanStaffActionResult,
} from './selfScanTypes.js';

export const selfScanGateway: ISelfScanGateway = {
  async fetchLiveBoard(
    tenantCode,
    accessToken,
    options,
  ): Promise<SelfScanListResult<SelfScanLiveBasketSummary>> {
    try {
      const result = await fetchSelfScanLiveBoard(tenantCode, accessToken, options);
      if (!result.ok && shouldEmitLogRepeat(`pickup-self-scan-poll:${tenantCode}`, 5)) {
        selfScanPollLog.warn('Self-Scan live board load failed', {
          operation: 'poll',
          httpStatus: result.httpStatus,
        });
        reportPickupError(
          new Error(`Self-Scan live failed (${result.httpStatus ?? 'unknown'})`),
          'selfScan.poll',
        );
      }
      return result;
    } catch (err) {
      if (shouldEmitLogRepeat(`pickup-self-scan-poll:${tenantCode}`, 5)) {
        selfScanPollLog.error('Self-Scan live board threw', err, { operation: 'poll' });
        reportPickupError(err, 'selfScan.poll');
      }
      throw err;
    }
  },

  async fetchBasketDetail(
    tenantCode,
    accessToken,
    basketId,
  ): Promise<SelfScanBasketDetail | null> {
    try {
      return await fetchSelfScanBasketDetail(tenantCode, accessToken, basketId);
    } catch (err) {
      selfScanApiLog.error('Self-Scan basket detail failed', err, { operation: 'detail' });
      reportPickupError(err, 'selfScan.detail');
      throw err;
    }
  },

  async patchLine(
    tenantCode,
    accessToken,
    basketId,
    lineId,
    input: SelfScanPatchLineInput,
  ): Promise<SelfScanStaffActionResult> {
    try {
      return await patchSelfScanBasketLine(tenantCode, accessToken, basketId, lineId, input);
    } catch (err) {
      selfScanApiLog.error('Self-Scan patch line failed', err, { operation: 'patchLine' });
      reportPickupError(err, 'selfScan.patchLine');
      throw err;
    }
  },

  async addWeightedLine(
    tenantCode,
    accessToken,
    basketId,
    input: SelfScanAddWeightedLineInput,
  ): Promise<SelfScanStaffActionResult> {
    try {
      return await addSelfScanWeightedLine(tenantCode, accessToken, basketId, input);
    } catch (err) {
      selfScanApiLog.error('Self-Scan weighted add failed', err, { operation: 'addWeightedLine' });
      reportPickupError(err, 'selfScan.addWeightedLine');
      throw err;
    }
  },

  async approveRestricted(
    tenantCode,
    accessToken,
    basketId,
    version,
  ): Promise<SelfScanStaffActionResult> {
    try {
      return await approveSelfScanRestricted(tenantCode, accessToken, basketId, version);
    } catch (err) {
      selfScanApiLog.error('Self-Scan approve restricted failed', err, {
        operation: 'approveRestricted',
      });
      reportPickupError(err, 'selfScan.approveRestricted');
      throw err;
    }
  },

  async selectForCheck(
    tenantCode,
    accessToken,
    basketId,
    version,
  ): Promise<SelfScanStaffActionResult> {
    try {
      return await selectSelfScanBasketForCheck(tenantCode, accessToken, basketId, version);
    } catch (err) {
      selfScanApiLog.error('Self-Scan selective select failed', err, {
        operation: 'selectiveSelect',
      });
      reportPickupError(err, 'selfScan.selectiveSelect');
      throw err;
    }
  },

  async completeSelectiveCheck(
    tenantCode,
    accessToken,
    basketId,
    version,
  ): Promise<SelfScanStaffActionResult> {
    try {
      return await completeSelfScanSelectiveCheck(tenantCode, accessToken, basketId, version);
    } catch (err) {
      selfScanApiLog.error('Self-Scan selective complete failed', err, {
        operation: 'selectiveComplete',
      });
      reportPickupError(err, 'selfScan.selectiveComplete');
      throw err;
    }
  },

  async escalateSelectiveCheck(
    tenantCode,
    accessToken,
    basketId,
    version,
  ): Promise<SelfScanStaffActionResult> {
    try {
      return await escalateSelfScanSelectiveCheck(tenantCode, accessToken, basketId, version);
    } catch (err) {
      selfScanApiLog.error('Self-Scan selective escalate failed', err, {
        operation: 'selectiveEscalate',
      });
      reportPickupError(err, 'selfScan.selectiveEscalate');
      throw err;
    }
  },

  async fetchHistory(
    tenantCode,
    accessToken,
    options,
  ): Promise<SelfScanListResult<SelfScanHistoryBasket>> {
    try {
      return await fetchSelfScanHistory(tenantCode, accessToken, options);
    } catch (err) {
      selfScanApiLog.error('Self-Scan history failed', err, { operation: 'history' });
      reportPickupError(err, 'selfScan.history');
      throw err;
    }
  },

  async fetchPaidVerify(
    tenantCode,
    accessToken,
    transactionId,
  ): Promise<SelfScanPaidVerifyResult> {
    try {
      return await fetchSelfScanPaidVerify(tenantCode, accessToken, transactionId);
    } catch (err) {
      selfScanApiLog.error('Self-Scan paid verify failed', err, { operation: 'paidVerify' });
      reportPickupError(err, 'selfScan.paidVerify');
      throw err;
    }
  },
};
