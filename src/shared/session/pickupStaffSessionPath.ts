/** First path segment after leading slash — tenant code on pickup routes. */
export function resolvePickupTenantCodeFromPath(pathname: string): string | null {
  const trimmed = pathname.replace(/^\/+/, '');
  const segment = trimmed.split('/')[0]?.trim();
  return segment && segment.length > 0 ? segment : null;
}
