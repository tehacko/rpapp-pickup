/**
 * Reserves horizontal space for the widest cs/en label so chrome does not shift on language change.
 * Uses an invisible sizer string in the same grid cell as the visible label.
 */
export interface LocaleStableTextProps {
  readonly label: string;
  readonly stableLabel: string;
  readonly className?: string;
}

export function LocaleStableText({
  label,
  stableLabel,
  className,
}: LocaleStableTextProps): JSX.Element {
  const sizingLabel = stableLabel.length > 0 ? stableLabel : label;

  return (
    <span
      className={['inline-grid text-center', className].filter(Boolean).join(' ')}
    >
      <span
        className="invisible col-start-1 row-start-1 whitespace-nowrap"
        aria-hidden="true"
      >
        {sizingLabel}
      </span>
      <span className="col-start-1 row-start-1 whitespace-nowrap">{label}</span>
    </span>
  );
}
