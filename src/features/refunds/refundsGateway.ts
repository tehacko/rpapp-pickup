import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import type { IRefundsGateway } from './IRefundsGateway.js';
import {
  createPickupRefund,
  getPickupComplaint,
  getPickupRefund,
  intakePickupComplaint,
  listPickupComplaintDispositions,
  listPickupRefundDispositions,
  listPickupTransactionRefunds,
  postComplaintDisposition,
  postRefundDisposition,
} from './refundsApi.js';

export const refundsGateway: IRefundsGateway = {
  async createRefund(tenantCode, accessToken, body) {
    try {
      return await createPickupRefund(tenantCode, accessToken, body);
    } catch (err) {
      reportPickupError(err, 'refunds.create');
      throw err;
    }
  },
  async getRefund(tenantCode, accessToken, attemptId) {
    try {
      return await getPickupRefund(tenantCode, accessToken, attemptId);
    } catch (err) {
      reportPickupError(err, 'refunds.get');
      throw err;
    }
  },
  async listTransactionRefunds(tenantCode, accessToken, transactionId) {
    try {
      return await listPickupTransactionRefunds(tenantCode, accessToken, transactionId);
    } catch (err) {
      reportPickupError(err, 'refunds.list');
      throw err;
    }
  },
  async getComplaint(tenantCode, accessToken, caseId) {
    try {
      return await getPickupComplaint(tenantCode, accessToken, caseId);
    } catch (err) {
      reportPickupError(err, 'complaints.get');
      throw err;
    }
  },
  async listComplaintDispositions(tenantCode, accessToken, caseId) {
    try {
      return await listPickupComplaintDispositions(tenantCode, accessToken, caseId);
    } catch (err) {
      reportPickupError(err, 'complaints.dispositions.list');
      throw err;
    }
  },
  async listRefundDispositions(tenantCode, accessToken, attemptId) {
    try {
      return await listPickupRefundDispositions(tenantCode, accessToken, attemptId);
    } catch (err) {
      reportPickupError(err, 'refunds.dispositions.list');
      throw err;
    }
  },
  async intakeComplaint(tenantCode, accessToken, body) {
    try {
      return await intakePickupComplaint(tenantCode, accessToken, body);
    } catch (err) {
      reportPickupError(err, 'complaints.intake');
      throw err;
    }
  },
  async recordComplaintDisposition(tenantCode, accessToken, caseId, body) {
    try {
      await postComplaintDisposition(tenantCode, accessToken, caseId, body);
    } catch (err) {
      reportPickupError(err, 'complaints.disposition');
      throw err;
    }
  },
  async recordRefundDisposition(tenantCode, accessToken, attemptId, body) {
    try {
      await postRefundDisposition(tenantCode, accessToken, attemptId, body);
    } catch (err) {
      reportPickupError(err, 'refunds.disposition');
      throw err;
    }
  },
};
