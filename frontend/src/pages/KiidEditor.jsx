import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { printKiid, kiidPrintTitle } from '@/lib/printKiid';
import KiidForm from '@/components/kiid/KiidForm';
import KiidPreview from '@/components/kiid/KiidPreview';
import './kiid-editor.css';

// Controlled split-screen editor used as the final step of the KIID workflow.
// The parent owns the document data and the workflow chrome; this component
// owns preview status, the on-screen A4 page containers, and the print root.
// The document is rendered as HTML+CSS (see KiidPreview + kiid-document.css).
// Print uses an isolated iframe (see printKiid) to avoid Firefox/WebKit
// overflow clipping.
function StatusIndicator({ status }) {
  const map = {
    updating: { label: 'Updating…', icon: Loader2, className: 'text-amber-600', spin: true },
    'up-to-date': { label: 'Live preview', icon: CheckCircle2, className: 'text-emerald-600', spin: false },
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
const A4_WIDTH_PX = 210 * PX_PER_MM;
const A4_HEIGHT_PX = 297 * PX_PER_MM;
/** Horizontal inset inside the preview pane so the scaled page is not flush. */
const PREVIEW_PAD_X = 24;

const OVERFLOW_BANNER_BASE =
  'print:hidden sticky top-0 z-10 w-full max-w-full mb-3 flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium';

// Live indicator: a UCITS KIID must fit on exactly 2 pages, so warn when the
// content overflows its A4 page containers.
function OverflowIndicator({ overflow }) {
  const over = overflow.pages
    .map((mm, i) => ({ i, mm }))
    .filter((p) => p.mm > 0.5);
  if (over.length === 0) {
    return (
      <div
        className={cn(
          OVERFLOW_BANNER_BASE,
          'bg-emerald-50 border-emerald-200 text-emerald-700'
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
        Fits on 2 pages
      </div>
    );
  }
  return (
    <div
      className={cn(OVERFLOW_BANNER_BASE, 'bg-red-50 border-red-200 text-red-700')}
    >
      <AlertCircle className="h-4 w-4" />
      <span>
        Overflow: page {over[0].i + 1} exceeds A4 by ~{Math.round(over[0].mm)}mm — will not fit on 2
        pages.
      </span>
    </div>
  );
}

/**
 * @param {{
 *   data: Record<string, unknown>,
 *   update: (field: string, value: unknown) => void,
 *   printRef?: { current: { print: () => void } | null },
 * }} props
 */
export default function KiidEditor({ data, update, printRef }) {
  const [status, setStatus] = useState('up-to-date');
  const [overflow, setOverflow] = useState({ pages: [0, 0] });
  const [previewScale, setPreviewScale] = useState(1);
  const [scaleShellHeight, setScaleShellHeight] = useState(0);
  const previewPaneRef = useRef(null);
  const previewRef = useRef(null);
  const firstRun = useRef(true);

  // Brief "Updating…" flash when form data changes (HTML preview is live).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setStatus('updating');
    const t = setTimeout(() => setStatus('up-to-date'), 400);
    return () => clearTimeout(t);
  }, [JSON.stringify(data)]);

  // Fit-to-width scale for the fixed A4 preview inside the pane.
  // Transform is applied outside `.kiid-print-root` so printKiid clones
  // unscaled markup. Overflow uses unscaled offsetHeight (transforms do not
  // affect layout metrics).
  useEffect(() => {
    const pane = previewPaneRef.current;
    const root = previewRef.current;
    if (!pane || !root) return;

    const measure = () => {
      const available = Math.max(0, pane.clientWidth - PREVIEW_PAD_X * 2);
      const scale = available > 0 ? Math.min(1, available / A4_WIDTH_PX) : 1;
      setPreviewScale(scale);

      const pages = root.querySelectorAll('.kiid-page');
      const overs = Array.from(pages).map((p) =>
        Math.max(0, (p.offsetHeight - A4_HEIGHT_PX) / PX_PER_MM)
      );
      setOverflow({ pages: overs });

      // Layout height is unscaled; shrink the shell so scroll matches visuals.
      setScaleShellHeight(Math.ceil(root.offsetHeight * scale));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(root);
    return () => ro.disconnect();
  }, [JSON.stringify(data)]);

  // Expose print to the workflow footer without a second app header.
  useEffect(() => {
    if (!printRef) return undefined;
    printRef.current = {
      print: () => {
        // Clone the unscaled print root — scale wrapper is a sibling ancestor only.
        printKiid(previewRef.current, { title: kiidPrintTitle(data) });
      },
    };
    return () => {
      printRef.current = null;
    };
  }, [printRef, data]);

  return (
    <div className="kiid-editor">
      <div className="kiid-editor__body">
        <div className="kiid-editor__form">
          <div className="kiid-editor__form-inner">
            <div className="mb-4">
              <StatusIndicator status={status} />
            </div>
            <KiidForm data={data} update={update} />
            <div className="h-12" />
          </div>
        </div>
        <div ref={previewPaneRef} className="kiid-editor__preview">
          <div className="kiid-editor__preview-inner">
            <OverflowIndicator overflow={overflow} />
            <div
              className="kiid-editor__preview-scale-shell"
              style={{ height: scaleShellHeight || undefined }}
            >
              <div
                className="kiid-editor__preview-scale"
                style={{
                  transform: `scale(${previewScale})`,
                  width: '210mm',
                }}
              >
                <div ref={previewRef} className="kiid-editor__print-root kiid-print-root">
                  <KiidPreview data={data} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
