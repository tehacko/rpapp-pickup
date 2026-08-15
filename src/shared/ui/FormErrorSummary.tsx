import { useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

export interface FormErrorSummaryItem {
  readonly id: string;
  readonly message: string;
}

export interface FormErrorSummaryProps {
  readonly title?: string;
  readonly errors: ReadonlyArray<FormErrorSummaryItem>;
  /** Focus summary on mount via ref (default true). Not the JSX autoFocus attribute. */
  readonly focusOnMount?: boolean;
}

/**
 * Map field-keyed validation errors to FormErrorSummary items.
 * Only keys present in `fieldIdByKey` are included so summary links always target a field.
 *
 * Form feedback rule (FA-08):
 * - Field errors with FormErrorSummary: summary owns the message; FormField `invalid` only.
 * - Form-level / API errors: one in-form banner. Never dual with FormErrorSummary.
 * - Single-field PIN/OTP: FormField `errorText` alone without summary is an allowed carve-out.
 */
export function mapFieldErrorsToSummary(
  errors: Readonly<Record<string, string | undefined>>,
  fieldIdByKey: Readonly<Record<string, string>>,
): FormErrorSummaryItem[] {
  return Object.entries(errors)
    .filter(
      ([key, message]) =>
        key in fieldIdByKey &&
        typeof message === 'string' &&
        message.trim().length > 0,
    )
    .map(([key, message]) => ({
      id: fieldIdByKey[key] ?? key,
      message: message as string,
    }));
}

/**
 * GOV.UK-style error summary — links each message to its field id.
 * Mount at top of form on submit failure; focus summary for screen readers.
 */
export function FormErrorSummary({
  title,
  errors,
  focusOnMount = true,
}: FormErrorSummaryProps): ReactElement | null {
  const { t } = useTranslation('pickup');
  const summaryRef = useRef<HTMLDivElement>(null);
  const visibleErrors = errors.filter((item) => item.message.trim().length > 0);

  useEffect(() => {
    if (!focusOnMount || visibleErrors.length === 0) {
      return;
    }
    summaryRef.current?.focus();
  }, [focusOnMount, visibleErrors.length]);

  if (visibleErrors.length === 0) {
    return null;
  }

  const heading = title ?? t('pickup.validation.formErrorSummaryTitle');

  return (
    <div
      ref={summaryRef}
      className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 p-3"
      role="alert"
      tabIndex={-1}
      data-testid="form-error-summary"
      aria-labelledby="form-error-summary-title"
    >
      <h2
        id="form-error-summary-title"
        className="mb-2 text-sm font-semibold text-[var(--color-danger)]"
      >
        {heading}
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        {visibleErrors.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-sm text-[var(--color-danger)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              onClick={(event) => {
                event.preventDefault();
                const target = document.getElementById(item.id);
                if (target instanceof HTMLElement) {
                  target.focus();
                  target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }}
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
