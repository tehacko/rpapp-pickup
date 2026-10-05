import {
  mapRefundCustomerStatus as mapSharedRefundCustomerStatus,
  type RefundCustomerStatus,
  type RefundReadDTO,
} from 'pi-kiosk-shared';

export { mapRefundCustomerStatus } from 'pi-kiosk-shared';

export function visibleRefundCustomerStatus(refund: RefundReadDTO): RefundCustomerStatus {
  return mapSharedRefundCustomerStatus({
    attemptStatus: refund.attemptStatus,
    slaBreachedAt: refund.slaBreachedAt,
  });
}
