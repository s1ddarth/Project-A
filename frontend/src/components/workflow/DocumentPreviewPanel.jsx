import React from 'react';
import { Lock } from 'lucide-react';
import KiidHeaderBlock from '@/components/kiid/KiidHeaderBlock';
import KiidPastPerformanceBlock from '@/components/kiid/KiidPastPerformanceBlock';
import SrriScale, { isSrriResolved } from '@/components/kiid/SrriScale';
import '@/components/kiid/kiid-document.css';

/**
 * Live preview of the document blocks that the validation step can already
 * resolve: the header, the SRRI scale and past performance.
 *
 * These are the *same* components the editor preview and the exported PDF use
 * (rule 1 — one render path), not a second copy. SRRI and past performance are
 * engine-computed, so both render an explicit unresolved state until a NAV file
 * has been validated; a blank chart or an unhighlighted scale must never be
 * mistakable for a real result (rule 3).
 */
function Block({ title, computed, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {computed && (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            <Lock className="h-2.5 w-2.5" /> Computed
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function DocumentPreviewPanel({ data }) {
  const d = data || {};
  const srriResolved = isSrriResolved(d.srriCategory);

  return (
    <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="border-b bg-muted/40 px-4 py-2.5">
        <h2 className="text-sm font-semibold">Document preview</h2>
        <p className="text-[11px] text-muted-foreground">
          Rendered from the KIID template — what you see here is what prints.
        </p>
      </div>

      <div className="kiid-doc bg-white p-4 space-y-4">
        <Block title="Header">
          <KiidHeaderBlock data={d} />
        </Block>

        <Block title="Risk and reward profile" computed>
          <SrriScale srriCategory={d.srriCategory} />
          {srriResolved ? (
            <p className="text-[11px] text-muted-foreground">
              {/* Label is derived by the engine (##SRRI_LABEL##), never mapped here. */}
              Category {d.srriCategory}
              {d.srriLabel ? ` — ${d.srriLabel}` : ''}
            </p>
          ) : (
            <p className="text-[11px] text-amber-700 bg-amber-50/70 border border-amber-300 border-dashed rounded px-2 py-1">
              Not yet calculated — upload a NAV file and run validation.
            </p>
          )}
        </Block>

        <Block title="Past performance" computed>
          <KiidPastPerformanceBlock data={d} />
        </Block>
      </div>
    </section>
  );
}
