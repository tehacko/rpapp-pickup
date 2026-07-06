import { redactClientLogMeta, redactStringSecrets } from 'pi-kiosk-shared/clientLogRedaction';

export type PickupLoggerMeta = {
  module?: string;
  feature?: string;
  operation?: string;
  correlationId?: string;
  errorCode?: string;
  [key: string]: unknown;
};

const APP = 'rpapp-pickup' as const;

function readEnvironment(): string {
  if (typeof process !== 'undefined' && typeof process.env['NODE_ENV'] === 'string') {
    return process.env['NODE_ENV'];
  }
  return 'development';
}

function isProductionEnvironment(): boolean {
  return readEnvironment() === 'production';
}

function normalizeMeta(rest: unknown[]): PickupLoggerMeta | undefined {
  if (rest.length === 0) {
    return undefined;
  }
  if (rest.length === 1 && typeof rest[0] === 'object' && rest[0] !== null && !Array.isArray(rest[0])) {
    return redactClientLogMeta(rest[0] as PickupLoggerMeta);
  }
  return redactClientLogMeta({ details: rest.map((value) => redactStringSecrets(String(value))) });
}

function emit(level: 'info' | 'warn' | 'error', message: string, meta?: PickupLoggerMeta): void {
  const payload = {
    app: APP,
    level,
    message: redactStringSecrets(message),
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
  };
  if (isProductionEnvironment()) {
    console[level](JSON.stringify(payload));
    return;
  }
  console[level](message, meta ?? '');
}

export const pickupLogger = {
  info(message: string, ...rest: unknown[]): void {
    emit('info', message, normalizeMeta(rest));
  },
  warn(message: string, ...rest: unknown[]): void {
    emit('warn', message, normalizeMeta(rest));
  },
  error(message: string, ...rest: unknown[]): void {
    emit('error', message, normalizeMeta(rest));
  },
};
