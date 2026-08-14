import { Lock } from 'lucide-react';
import KiidPreview from '@/components/kiid/KiidPreview';
import KiidScaledPreview from '@/components/kiid/KiidScaledPreview';
import { isSrriResolved } from '@/components/kiid/SrriScale';

/**
 * Validation-step preview: header, SRRI scale and past-performance chart only.
 *
 * Same A4 shell and shared document blocks as the editor (rule 1); narrative
 * sections stay out until step 4. SRRI / past performance render their
 * unresolved states until NAV validation succeeds (rule 3).
 */
export default function DocumentPreviewPanel({ data }) {
  const d = data || {};
  const srriResolved = isSrriResolved(d.srriCategory);
  const measureKey = JSON.stringify({
    subFundName: d.subFundName,
    companyName: d.companyName,
    shareClassFullName: d.shareClassFullName,
    isin: d.isin,
    srriCategory: d.srriCategory,
    performanceYears: d.performanceYears,
    subFundBaseCurrency: d.subFundBaseCurrency,
  });

  return (
    <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="border-b bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Header and SRRI preview</h2>
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            <Lock className="h-2.5 w-2.5" /> Computed from NAV Upload
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {srriResolved
            ? 'Header, risk scale and past performance — same layout as the editor.'
            : 'SRRI and past performance stay unresolved until NAV validation succeeds.'}
        </p>
      </div>

      <div className="p-3 bg-muted/20">
        <KiidScaledPreview measureKey={measureKey}>
          <KiidPreview data={d} variant="validation" />
        </KiidScaledPreview>
      </div>
    </section>
  );
}
