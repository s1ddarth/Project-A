import React from 'react';
import { cn } from '@/lib/utils';

const NAVY = '#1E2A56';

/**
 * The 1-7 SRRI risk scale; the selected category cell is highlighted navy.
 *
 * `srriCategory` is engine-computed. When it is empty the scale renders with no
 * cell highlighted and the caller is expected to show why — an unresolved risk
 * number must never look like a resolved one (rule 3).
 */
export default function SrriScale({ srriCategory }) {
  const active = String(srriCategory ?? '');
  return (
    <div className="grid grid-cols-7 border border-black text-center">
      {['1', '2', '3', '4', '5', '6', '7'].map((n) => {
        const isActive = active === n;
        return (
          <div
            key={n}
            className={cn(
              'py-1.5 text-sm border-r border-black last:border-r-0',
              isActive ? 'font-bold' : ''
            )}
            style={isActive ? { backgroundColor: NAVY, color: '#fff' } : undefined}
          >
            {n}
          </div>
        );
      })}
    </div>
  );
}

/** True when the value is a usable SRRI category. */
export function isSrriResolved(srriCategory) {
  return ['1', '2', '3', '4', '5', '6', '7'].includes(String(srriCategory ?? ''));
}
