export interface ConfirmCashReceivedResult {
  readonly transactionId: number;
  readonly status: 'COMPLETED';
  /** True when confirm was an idempotent replay (backend already COMPLETED). */
  readonly idempotent?: boolean;
}

export interface ICashConfirmGateway {
  confirmCashReceived(
    tenantCode: string,
    accessToken: string,
    transactionId: number,
    idempotencyKey?: string,
  ): Promise<ConfirmCashReceivedResult>;
}
