import { memo } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from './cn.js';

export interface SegmentTabItem {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
}

export interface SegmentTabsProps {
  readonly tabs: readonly SegmentTabItem[];
  readonly activeId: string;
  readonly onChange: (id: string) => void;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly idPrefix?: string;
}

/**
 * Exclusive segment filter via Radix Tabs (mirror admin SegmentTabs API).
 * Filter-only: hidden Tabs.Content panels satisfy aria-controls (axe aria-valid-attr-value).
 */
export const SegmentTabs = memo<SegmentTabsProps>(
  ({ tabs, activeId, onChange, ariaLabel, className, idPrefix = 'pickup-segment' }): JSX.Element => {
    return (
      <Tabs.Root
        value={activeId}
        onValueChange={onChange}
        className={cn('w-full', className)}
        data-testid="pickup-segment-tabs"
      >
        <Tabs.List
          className="flex flex-wrap gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1"
          aria-label={ariaLabel}
        >
          {tabs.map((tab) => {
            const tabId = `${idPrefix}-tab-${tab.id}`;
            return (
              <Tabs.Trigger
                key={tab.id}
                id={tabId}
                value={tab.id}
                className={cn(
                  'pickup-touch-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium',
                  'text-[var(--color-on-surface-muted)]',
                  'data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-on-surface)] data-[state=active]:shadow-[var(--shadow-card)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 ? (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-[var(--color-surface)] px-1.5 text-xs font-semibold tabular-nums text-[var(--color-on-surface-muted)]">
                    {tab.count}
                  </span>
                ) : null}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Content
            key={`content-${tab.id}`}
            value={tab.id}
            className="sr-only"
            tabIndex={-1}
          >
            {tab.label}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    );
  },
);

SegmentTabs.displayName = 'SegmentTabs';
