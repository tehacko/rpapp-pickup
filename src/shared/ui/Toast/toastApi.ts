export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  readonly message: string;
  readonly variant?: ToastVariant;
  readonly duration?: number;
}

export type ToastApiHandler = (options: ToastOptions) => void;

let toastHandler: ToastApiHandler | null = null;

export function registerToastHandler(handler: ToastApiHandler): void {
  toastHandler = handler;
}

export function unregisterToastHandler(): void {
  toastHandler = null;
}

/** Programmatic toast — wired to ToastProvider when mounted. */
export function toastApi(
  messageOrOptions: string | ToastOptions,
  variant: ToastVariant = 'info',
): void {
  const options: ToastOptions =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, variant }
      : messageOrOptions;

  toastHandler?.(options);
}
