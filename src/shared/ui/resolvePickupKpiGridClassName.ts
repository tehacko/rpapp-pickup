/**
 * Resolves pickup KPI grid column classes without stacking conflicting modifiers.
 * Twin of admin `resolveKpiGridClassName` — Tailwind grid utilities instead of an-kpi-grid.
 */
export function resolvePickupKpiGridClassName(className?: string): string {
  const extra = className?.trim() ?? '';
  const hasCols =
    /(?:^|\s)(?:grid-cols-|sm:grid-cols-|lg:grid-cols-|pickup-kpi-grid--)/.test(extra);
  const parts: string[] = [
    'grid',
    'w-full',
    'gap-2.5',
    'min-[30rem]:gap-3',
  ];
  if (!hasCols) {
    parts.push('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4');
  }
  if (extra.length > 0) {
    parts.push(extra);
  }
  return parts.join(' ');
}
