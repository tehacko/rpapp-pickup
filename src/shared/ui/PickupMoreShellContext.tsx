import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface PickupMoreShellContextValue {
  readonly isMoreOpen: boolean;
  readonly openMore: () => void;
  readonly closeMore: () => void;
  readonly toggleMore: () => void;
}

const PickupMoreShellContext = createContext<PickupMoreShellContextValue | null>(null);

export function PickupMoreShellProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const openMore = useCallback((): void => {
    setIsMoreOpen(true);
  }, []);

  const closeMore = useCallback((): void => {
    setIsMoreOpen(false);
  }, []);

  const toggleMore = useCallback((): void => {
    setIsMoreOpen((open) => !open);
  }, []);

  const value = useMemo(
    (): PickupMoreShellContextValue => ({
      isMoreOpen,
      openMore,
      closeMore,
      toggleMore,
    }),
    [closeMore, isMoreOpen, openMore, toggleMore],
  );

  return (
    <PickupMoreShellContext.Provider value={value}>{children}</PickupMoreShellContext.Provider>
  );
}

export function usePickupMoreShell(): PickupMoreShellContextValue {
  const ctx = useContext(PickupMoreShellContext);
  if (ctx === null) {
    throw new Error('usePickupMoreShell must be used within PickupMoreShellProvider');
  }
  return ctx;
}
