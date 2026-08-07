import React, { useState, useEffect, useRef } from 'react';
import { Printer, Loader2, CheckCircle2, AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import KiidForm from '@/components/kiid/KiidForm';
import KiidPreview from '@/components/kiid/KiidPreview';

// Controlled split-screen editor used as the final step of the KIID workflow.
// The parent owns the document data; this component owns preview status, the
// on-screen A4 page containers, and the print/export action.
function StatusIndicator({ status }) {
  const map = {
    compiling: { label: 'Compiling…', icon: Loader2, className: 'text-amber-600', spin: true },
    'up-to-date': { label: 'Up to date', icon: CheckCircle2, className: 'text-emerald-600', spin: false },
    error: { label: 'Compile error', icon: AlertCircle, className: 'text-red-600', spin: false },
  };
  const s = map[status] || map['up-to-date'];
  const Icon = s.icon;
  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium', s.className)}>
      <Icon className={cn('h-3.5 w-3.5', s.spin && 'animate-spin')} />
      {s.label}
    </div>
  );
}

const PX_PER_MM = 96 / 25.4;
const A4_HEIGHT_PX = 297 * PX_PER_MM;

// Live indicator: a UCITS KIID must fit on exactly 2 pages, so warn when the
// content overflows its A4 page containers.
function OverflowIndicator({ overflow }) {
  const over = overflow.pages
    .map((mm, i) => ({ i, mm }))
    .filter((p) => p.mm > 0.5);
  if (over.length === 0) {
    return (
      <div className="print:hidden sticky top-0 z-10 mx-auto max-w-[210mm] mb-3 flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Fits on 2 pages
      </div>
    );
  }
  return (
    <div className="print:hidden sticky top-0 z-10 mx-auto max-w-[210mm] mb-3 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700">
      <AlertCircle className="h-4 w-4" />
      <span>
        Overflow: page {over[0].i + 1} exceeds A4 by ~{Math.round(over[0].mm)}mm — will not fit on 2 pages.
      </span>
    </div>
  );
}

export default function KiidEditor({ data, update, onBack, onReset }) {
  const [status, setStatus] = useState('up-to-date');
  const [overflow, setOverflow] = useState({ pages: [0, 0] });
  const previewRef = useRef(null);
  const firstRun = useRef(true);

  // Debounced "compiling → up-to-date" indicator driven by data changes.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setStatus('compiling');
    const t = setTimeout(() => setStatus('up-to-date'), 700);
    return () => clearTimeout(t);
  }, [JSON.stringify(data)]);

  // Measure each A4 page container; flag overflow when content exceeds 297mm.
  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const measure = () => {
      const pages = root.querySelectorAll('.bg-white.shadow-xl');
      const overs = Array.from(pages).map((p) =>
        Math.max(0, (p.offsetHeight - A4_HEIGHT_PX) / PX_PER_MM)
      );
      setOverflow({ pages: overs });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [JSON.stringify(data)]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col bg-background print:h-auto print:block print:overflow-visible">
      <header className="flex items-center justify-between gap-4 px-5 h-14 border-b bg-card shrink-0 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            K
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight truncate">KIID Editor</h1>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              {data.subFundName || 'Untitled fund'} · {data.isin || 'no ISIN'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusIndicator status={status} />
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset} title="Reset to sample data">
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          )}
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print / Save as PDF
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 print:h-auto print:block">
        <div className="w-[45%] overflow-y-auto border-r bg-muted/20 print:hidden">
          <div className="p-5 max-w-2xl mx-auto">
            <KiidForm data={data} update={update} />
            <div className="h-12" />
          </div>
        </div>
        <div className="w-[55%] bg-slate-200/60 overflow-auto h-full print:w-auto print:h-auto print:overflow-visible print:bg-transparent print:block">
          <OverflowIndicator overflow={overflow} />
          <div ref={previewRef} className="kiid-print-root inline-block print:block">
            <KiidPreview data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}