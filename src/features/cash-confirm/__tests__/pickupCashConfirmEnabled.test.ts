import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const readViteMetaEnvMock = jest.fn<(key: string) => string | undefined>();

jest.mock('../../../shared/vite/readViteMetaEnv.js', () => ({
  readViteMetaEnv: (key: string) => readViteMetaEnvMock(key),
}));

import { isPickupCashConfirmEnabled } from '../pickupCashConfirmEnabled.js';

describe('isPickupCashConfirmEnabled', () => {
  beforeEach(() => {
    readViteMetaEnvMock.mockReset();
  });

  it('reads VITE_PICKUP_CASH_CONFIRM_ENABLED from vite meta env', () => {
    readViteMetaEnvMock.mockReturnValue('true');
    isPickupCashConfirmEnabled();
    expect(readViteMetaEnvMock).toHaveBeenCalledWith('VITE_PICKUP_CASH_CONFIRM_ENABLED');
  });

  it('defaults to true when env is unset or blank', () => {
    readViteMetaEnvMock.mockReturnValue(undefined);
    expect(isPickupCashConfirmEnabled()).toBe(true);

    readViteMetaEnvMock.mockReturnValue('');
    expect(isPickupCashConfirmEnabled()).toBe(true);

    readViteMetaEnvMock.mockReturnValue('   ');
    expect(isPickupCashConfirmEnabled()).toBe(true);
  });

  it('returns false for explicit falsey values', () => {
    readViteMetaEnvMock.mockReturnValue('false');
    expect(isPickupCashConfirmEnabled()).toBe(false);

    readViteMetaEnvMock.mockReturnValue('FALSE');
    expect(isPickupCashConfirmEnabled()).toBe(false);

    readViteMetaEnvMock.mockReturnValue('0');
    expect(isPickupCashConfirmEnabled()).toBe(false);

    readViteMetaEnvMock.mockReturnValue('  false  ');
    expect(isPickupCashConfirmEnabled()).toBe(false);
  });

  it('returns true for other truthy strings', () => {
    readViteMetaEnvMock.mockReturnValue('true');
    expect(isPickupCashConfirmEnabled()).toBe(true);

    readViteMetaEnvMock.mockReturnValue('1');
    expect(isPickupCashConfirmEnabled()).toBe(true);

    readViteMetaEnvMock.mockReturnValue('yes');
    expect(isPickupCashConfirmEnabled()).toBe(true);
  });
});
