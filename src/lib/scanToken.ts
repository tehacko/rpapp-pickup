export function normalizeScanToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('t') ?? trimmed;
  } catch {
    return trimmed;
  }
}
