import type { RefundReadDTO } from 'pi-kiosk-shared';
import type {
  ComplaintReadDTO,
  CreatePickupRefundBody,
  IntakeComplaintBody,
  RecordDispositionBody,
  ReturnDispositionReadDTO,
} from './refundTypes.js';
import type { PickupTransactionRefundsListDTO } from './refundsApi.js';

export interface IRefundsGateway {
  createRefund(
    tenantCode: string,
    accessToken: string,
    body: CreatePickupRefundBody,
  ): Promise<RefundReadDTO>;
  getRefund(
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
