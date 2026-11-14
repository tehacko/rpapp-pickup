import type { RefundReadDTO } from 'pi-kiosk-shared';
import type {
  ComplaintReadDTO,
  CreatePickupAlternativeRefundBody,
  CreatePickupRefundBody,
  IntakeComplaintBody,
  RecordDispositionBody,
  ResolveComplaintBody,
  ReturnDispositionReadDTO,
} from './refundTypes.js';
import type { PickupTransactionRefundsListDTO } from './refundsApi.js';

export interface IRefundsGateway {
  createRefund(
    tenantCode: string,
    accessToken: string,
    body: CreatePickupRefundBody,
  ): Promise<RefundReadDTO>;
  createAlternativeRefund(
    tenantCode: string,
    accessToken: string,
    sourceAttemptId: string,
    body: CreatePickupAlternativeRefundBody,
  ): Promise<RefundReadDTO>;
  getRefund(
    tenantCode: string,
    accessToken: string,
    attemptId: string,
  ): Promise<RefundReadDTO>;
  confirmCashHandoff(
    tenantCode: string,
    accessToken: string,
    attemptId: string,
  ): Promise<RefundReadDTO>;
  listTransactionRefunds(
    tenantCode: string,
    accessToken: string,
    transactionId: number,
  ): Promise<PickupTransactionRefundsListDTO>;
  getComplaint(
    tenantCode: string,
    accessToken: string,
    caseId: string,
  ): Promise<ComplaintReadDTO>;
  /** R46 — GET /pickup/staff/complaints (?status= / ?queue=awaiting-retrieval). */
  listComplaints(
    tenantCode: string,
    accessToken: string,
    query?: { readonly status?: string; readonly queue?: string },
  ): Promise<readonly ComplaintReadDTO[]>;
  listComplaintDispositions(
    tenantCode: string,
    accessToken: string,
    caseId: string,
  ): Promise<readonly ReturnDispositionReadDTO[]>;
  listRefundDispositions(
    tenantCode: string,
    accessToken: string,
    attemptId: string,
  ): Promise<readonly ReturnDispositionReadDTO[]>;
  intakeComplaint(
    tenantCode: string,
    accessToken: string,
    body: IntakeComplaintBody,
  ): Promise<ComplaintReadDTO>;
  resolveComplaint(
    tenantCode: string,
    accessToken: string,
    caseId: string,
    body: ResolveComplaintBody,
  ): Promise<ComplaintReadDTO>;
  recordComplaintDisposition(
    tenantCode: string,
    accessToken: string,
    caseId: string,
    body: RecordDispositionBody,
  ): Promise<void>;
  recordRefundDisposition(
    tenantCode: string,
    accessToken: string,
    attemptId: string,
    body: RecordDispositionBody,
  ): Promise<void>;
}
