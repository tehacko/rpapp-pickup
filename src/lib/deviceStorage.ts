export interface PairedDeviceCredentials {
  readonly deviceCode: string;
  readonly deviceLabel: string;
}

export function deviceCodeStorageKey(tenantCode: string): string {
  return `pickup:device:code:${tenantCode}`;
}

export function deviceLabelStorageKey(tenantCode: string): string {
  return `pickup:device:label:${tenantCode}`;
}

export function getPairedDevice(tenantCode: string): PairedDeviceCredentials | null {
  const deviceCode = localStorage.getItem(deviceCodeStorageKey(tenantCode))?.trim();
  if (deviceCode === undefined || deviceCode.length === 0) {
    return null;
  }
  const deviceLabel =
    localStorage.getItem(deviceLabelStorageKey(tenantCode))?.trim() ?? deviceCode;
  return { deviceCode, deviceLabel };
}

export function setPairedDevice(
  tenantCode: string,
  credentials: PairedDeviceCredentials,
): void {
  const deviceCode = credentials.deviceCode.trim();
  const deviceLabel = credentials.deviceLabel.trim() || deviceCode;
  localStorage.setItem(deviceCodeStorageKey(tenantCode), deviceCode);
  localStorage.setItem(deviceLabelStorageKey(tenantCode), deviceLabel);
}

export function clearPairedDevice(tenantCode: string): void {
  localStorage.removeItem(deviceCodeStorageKey(tenantCode));
  localStorage.removeItem(deviceLabelStorageKey(tenantCode));
}

export function isDevicePaired(tenantCode: string): boolean {
  return getPairedDevice(tenantCode) !== null;
}

export function getPairedDeviceCode(tenantCode: string): string | undefined {
  return getPairedDevice(tenantCode)?.deviceCode;
}
