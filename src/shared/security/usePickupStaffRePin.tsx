import { useCallback, useState } from 'react';
import { PickupStaffRePinModal } from './PickupStaffRePinModal.js';

export interface PickupStaffRePinRequest {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly action: () => void;
}

export interface UsePickupStaffRePinResult {
  readonly requestRePin: (request: PickupStaffRePinRequest) => void;
  readonly rePinModal: JSX.Element | null;
}

export function usePickupStaffRePin(): UsePickupStaffRePinResult {
  const [pending, setPending] = useState<PickupStaffRePinRequest | null>(null);

  const requestRePin = useCallback((request: PickupStaffRePinRequest): void => {
    setPending(request);
  }, []);

  const rePinModal =
    pending === null ? null : (
      <PickupStaffRePinModal
        open
        titleKey={pending.titleKey}
        descriptionKey={pending.descriptionKey}
        onCancel={() => setPending(null)}
        onVerified={() => {
          const action = pending.action;
          setPending(null);
          action();
        }}
      />
    );

  return { requestRePin, rePinModal };
}
