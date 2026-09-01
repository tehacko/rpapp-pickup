import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as readViteMetaEnvModule from '../../../test/shims/readViteMetaEnv.shim.js';
import { isPickupCashConfirmEnabled } from '../pickupCashConfirmEnabled.js';

const readViteMetaEnvSpy = jest.spyOn(readViteMetaEnvModule, 'readViteMetaEnv');

describe('isPickupCashConfirmEnabled', () => {
  beforeEach(() => {
    readViteMetaEnvSpy.mockReset();
  });

  it('reads VITE_PICKUP_CASH_CONFIRM_ENABLED from vite meta env', () => {
    readViteMetaEnvSpy.mockReturnValue('true');
    isPickupCashConfirmEnabled();
    expect(readViteMetaEnvSpy).toHaveBeenCalledWith('VITE_PICKUP_CASH_CONFIRM_ENABLED');
  });

  it('defaults to true when env is unset or blank', () => {
    readViteMetaEnvSpy.mockReturnValue(undefined);
    expect(isPickupCashConfirmEnabled()).toBe(true);

    readViteMetaEnvSpy.mockReturnValue('');
    expect(isPickupCashConfirmEnabled()).toBe(true);

    readViteMetaEnvSpy.mockReturnValue('   ');
    expect(isPickupCashConfirmEnabled()).toBe(true);
  });

  it('returns false for explicit falsey values', () => {
    readViteMetaEnvSpy.mockReturnValue('false');
    expect(isPickupCashConfirmEnabled()).toBe(false);

    readViteMetaEnvSpy.mockReturnValue('FALSE');
    expect(isPickupCashConfirmEnabled()).toBe(false);

    readViteMetaEnvSpy.mockReturnValue('0');
    expect(isPickupCashConfirmEnabled()).toBe(false);

    readViteMetaEnvSpy.mockReturnValue('  false  ');
    expect(isPickupCashConfirmEnabled()).toBe(false);
  });

  it('returns true for other truthy strings', () => {
    readViteMetaEnvSpy.mockReturnValue('true');
    expect(isPickupCashConfirmEnabled()).toBe(true);

    readViteMetaEnvSpy.mockReturnValue('1');
    expect(isPickupCashConfirmEnabled()).toBe(true);

    readViteMetaEnvSpy.mockReturnValue('yes');
    expect(isPickupCashConfirmEnabled()).toBe(true);
  });
});
