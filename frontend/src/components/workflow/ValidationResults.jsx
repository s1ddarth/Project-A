import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Renders a structured list of validation findings from the SRRI service.
// Purely presentational — the gate logic (errors block, warnings require
// acknowledgement) lives in the step, and the findings themselves are produced
// by the engine. Nothing here derives or interprets a finding; it keys off the
// machine-readable `code` and `severity` and never parses the message text.
const STYLES = {
  error: {
    Icon: AlertCircle,
    row: 'border-red-200 bg-red-50',
    icon: 'text-red-600',
    chip: 'bg-red-600',
  },
  warning: {
    Icon: AlertTriangle,
    row: 'border-amber-200 bg-amber-50',
    icon: 'text-amber-600',
    chip: 'bg-amber-600',
  },
  info: {
    Icon: Info,
    row: 'border-slate-200 bg-slate-50',
    icon: 'text-slate-500',
    chip: 'bg-slate-500',
  },
};

export default function ValidationResults({ findings }) {
  const list = findings || [];
  const counts = {
    error: list.filter((f) => f.severity === 'error').length,
    warning: list.filter((f) => f.severity === 'warning').length,
    info: list.filter((f) => f.severity === 'info').length,
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs flex-wrap">
        <span className="px-2 py-1 rounded-md bg-red-100 text-red-700 font-medium">
          {counts.error} error{counts.error === 1 ? '' : 's'}
        </span>
        <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-700 font-medium">
          {counts.warning} warning{counts.warning === 1 ? '' : 's'}
        </span>
        {counts.info > 0 && (
          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">
            {counts.info} note{counts.info === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No findings.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((f) => {
            const style = STYLES[f.severity] || STYLES.info;
            const { Icon } = style;
            return (
              <li
                key={f.id}
                className={cn('flex items-start gap-3 rounded-lg border p-3', style.row)}
              >
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', style.icon)} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white',
                        style.chip
                      )}
                    >
                      {f.severity}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{f.code}</span>
                  </div>
                  <p className="text-sm mt-1">{f.message}</p>
                  {/* The engine says how to fix what it found; dropping that
                      would leave the user with a code and no next step. */}
                  {f.remediation && (
                    <p className="text-xs mt-1.5 text-muted-foreground border-l-2 pl-2 border-current/20">
                      {f.remediation}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
