import { useState, type ReactNode } from 'react';
import { PickupErrorBoundary } from './PickupErrorBoundary.js';

type Props = {
  children: ReactNode;
  fallback: (args: { onRetry: () => void; feature: string }) => ReactNode;
  feature: string;
  disabled?: boolean;
};

/** L2 shell outlet vs L3 route — known from RemountBoundary feature, not guessed. */
function resolveRemountBoundaryLayer(feature: string): 'L2' | 'L3' {
  return feature === 'shell-outlet' ? 'L2' : 'L3';
}

export function RemountBoundary({ children, fallback, feature, disabled }: Props): JSX.Element {
  const [retry, setRetry] = useState(0);
  const onRetry = (): void => setRetry((n) => n + 1);
  if (disabled === true) {
    return <>{children}</>;
  }
  return (
    <PickupErrorBoundary
      key={String(retry)}
      fallback={fallback({ onRetry, feature })}
      observability={{
        feature,
        boundary_layer: resolveRemountBoundaryLayer(feature),
      }}
    >
      {children}
    </PickupErrorBoundary>
  );
}
