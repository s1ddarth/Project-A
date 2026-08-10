import { cn } from '@/lib/utils';

/**
 * Shared 1:2 two-column layout used by Validation and Editor.
 * At xl+, both columns fill the available height and scroll independently.
 * Below xl, columns stack and the page scrolls as usual.
 *
 * @param {{
 *   left: import('react').ReactNode,
 *   right: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export default function WorkflowSplit({ left, right, className = undefined }) {
  return (
    <div
      className={cn(
        'grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:h-full xl:min-h-0',
        className
      )}
    >
      <div className="space-y-5 min-w-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
        {left}
      </div>
      <div className="space-y-5 min-w-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
        {right}
      </div>
    </div>
  );
}
