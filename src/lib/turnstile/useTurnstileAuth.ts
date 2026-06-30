import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const TURNSTILE_PUBLIC_CONFIG_PATH = '/api/public/turnstile-config';

interface TurnstileConfigData {
  enabled: boolean;
  siteKey: string | null;
}

async function fetchTurnstileConfig(): Promise<TurnstileConfigData> {
  try {
    const response = await fetch(TURNSTILE_PUBLIC_CONFIG_PATH);
    if (!response.ok) {
      return { enabled: false, siteKey: null };
    }
    const envelope = (await response.json()) as {
      success?: boolean;
      data?: { enabled?: boolean; siteKey?: string | null };
    };
    const data = envelope.data;
    return {
      enabled: data?.enabled === true,
      siteKey: typeof data?.siteKey === 'string' && data.siteKey.length > 0 ? data.siteKey : null,
    };
  } catch {
    return { enabled: false, siteKey: null };
  }
}

function appendTurnstileToken<T extends Record<string, unknown>>(
  body: T,
  turnstileToken: string | null | undefined
): T & { turnstileToken?: string } {
  if (typeof turnstileToken === 'string' && turnstileToken.length > 0) {
    return { ...body, turnstileToken };
  }
  return body;
}

export interface UseTurnstileAuthResult {
  readonly required: boolean;
  readonly ready: boolean;
  readonly siteKey: string | null;
  readonly token: string | null;
  readonly widgetKey: number;
  readonly isLoading: boolean;
  readonly setToken: (value: string) => void;
  readonly resetTurnstile: () => void;
  readonly withTurnstile: <T extends Record<string, unknown>>(body: T) => ReturnType<typeof appendTurnstileToken<T>>;
}

export function useTurnstileAuth(): UseTurnstileAuthResult {
  const [token, setTokenState] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);

  const query = useQuery({
    queryKey: ['turnstile-config'],
    queryFn: () => fetchTurnstileConfig(),
    staleTime: 5 * 60_000,
  });

  const siteKey = query.data?.siteKey ?? null;
  const required =
    query.data?.enabled === true && typeof siteKey === 'string' && siteKey.length > 0;
  const ready = !required || token !== null;

  const setToken = useCallback((value: string): void => {
    setTokenState(value);
  }, []);

  const resetTurnstile = useCallback((): void => {
    setTokenState(null);
    setWidgetKey((current) => current + 1);
  }, []);

  const withTurnstile = useCallback(
    <T extends Record<string, unknown>>(body: T) => appendTurnstileToken(body, token),
    [token]
  );

  return {
    required,
    ready,
    siteKey,
    token,
    widgetKey,
    isLoading: query.isLoading,
    setToken,
    resetTurnstile,
    withTurnstile,
  };
}
