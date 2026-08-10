import { cn } from '@/lib/utils';

/**
 * Shared card shell for workflow step sections (Validation + Editor).
 *
 * @param {{
 *   title?: import('react').ReactNode,
 *   description?: import('react').ReactNode,
 *   headerAside?: import('react').ReactNode,
 *   children?: import('react').ReactNode,
 *   className?: string,
 *   bodyClassName?: string,
 *   compact?: boolean,
 * }} props
 */
export default function WorkflowPanel({
  title = undefined,
  description = undefined,
  headerAside = undefined,
  children = undefined,
  className = undefined,
  bodyClassName = undefined,
  compact = false,
}) {
  const hasHeader = title != null || description != null || headerAside != null;
  const pad = compact ? 'p-4' : 'p-5';

  return (
    <section className={cn('rounded-xl border bg-card shadow-sm', pad, className)}>
      {hasHeader && (
        <div className={cn(description ? (compact ? 'mb-2.5' : 'mb-4') : 'mb-3')}>
          {(title != null || headerAside != null) && (
            <div
              className={cn(
                'flex items-start justify-between gap-4',
                description && (compact ? 'mb-0.5' : 'mb-1')
              )}
            >
              {title != null && (
                <h2 className={compact ? 'text-sm font-semibold' : 'text-base font-semibold'}>
                  {title}
                </h2>
              )}
              {headerAside}
            </div>
          )}
          {description != null && (
            <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
              {description}
            </p>
          )}
        </div>
      )}
      {children != null && <div className={bodyClassName}>{children}</div>}
    </section>
  );
}
