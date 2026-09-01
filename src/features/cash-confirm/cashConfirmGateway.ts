import { confirmCashReceived as confirmCashReceivedApi } from '../../api/pickupApi.js';
import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import type { ConfirmCashReceivedResult, ICashConfirmGateway } from './ICashConfirmGateway.js';

export const cashConfirmGateway: ICashConfirmGateway = {
  async confirmCashReceived(
    tenantCode,
    accessToken,
    transactionId,
    idempotencyKey,
  ): Promise<ConfirmCashReceivedResult> {
    try {
      return await confirmCashReceivedApi(
        tenantCode,
        accessToken,
        transactionId,
        idempotencyKey,
      );
    } catch (err) {
      reportPickupError(err, 'cashConfirm.confirm');
      throw err;
    }
  },
};
