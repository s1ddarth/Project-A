import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Renders a structured list of validation findings. Each finding has a severity
// of "error" or "warning". This component is purely presentational — the gate
// logic (errors block, warnings require acknowledgement) lives in the step.
export default function ValidationResults({ findings }) {
  const list = findings || [];
  const errors = list.filter((f) => f.severity === 'error');
  const warnings = list.filter((f) => f.severity === 'warning');

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        <span className="px-2 py-1 rounded-md bg-red-100 text-red-700 font-medium">
          {errors.length} error{errors.length === 1 ? '' : 's'}
        </span>
        <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-700 font-medium">
          {warnings.length} warning{warnings.length === 1 ? '' : 's'}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No findings.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((f) => {
            const isError = f.severity === 'error';
            const Icon = isError ? AlertCircle : AlertTriangle;
            return (
              <li
                key={f.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3',
                  isError ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 mt-0.5 shrink-0',
                    isError ? 'text-red-600' : 'text-amber-600'
                  )}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white',
                        isError ? 'bg-red-600' : 'bg-amber-600'
                      )}
                    >
                      {f.severity}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{f.code}</span>
                  </div>
                  <p className="text-sm mt-1">{f.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}