import { cn } from '@/lib/utils';

/**
 * Shared 1:2 two-column layout used by Validation and Editor.
 * Right column sticks and scrolls independently on xl+.
 *
 * @param {{
 *   left: import('react').ReactNode,
 *   right: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export default function WorkflowSplit({ left, right, className = undefined }) {
  return (
    <div className={cn('grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]', className)}>
      <div className="space-y-5 min-w-0">{left}</div>
      <div className="space-y-5 min-w-0 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
        {right}
      </div>
    </div>
  );
}
