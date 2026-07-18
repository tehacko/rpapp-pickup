import { KpiStat, type KpiStatProps } from './KpiStat.js';

export type StatPillProps = KpiStatProps;

/**
 * Compact KPI alias — same contract as `KpiStat` (parent omits strip when empty).
 */
export function StatPill(props: StatPillProps): JSX.Element {
  return <KpiStat {...props} testId={props.testId ?? 'pickup-stat-pill'} />;
}
