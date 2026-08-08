import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Horizontal progress indicator for the workflow. Completed steps are clickable
// to navigate back; the current and future steps are not.
export default function WorkflowStepper({ steps, current, onStepClick }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = done && !!onStepClick;
        return (
          <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(i)}
              className={cn('flex items-center gap-2', clickable ? 'cursor-pointer' : 'cursor-default')}
            >
              <span
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition',
                  active && 'bg-primary text-primary-foreground border-primary',
                  done && !active && 'bg-primary/10 text-primary border-primary/30',
                  !active && !done && 'bg-muted text-muted-foreground border-muted'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:inline',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span className={cn('h-px flex-1 min-w-4', i < current ? 'bg-primary/40' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}