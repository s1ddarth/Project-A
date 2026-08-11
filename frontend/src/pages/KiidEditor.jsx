import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { printKiid, kiidPrintTitle } from '@/lib/printKiid';
import KiidForm from '@/components/kiid/KiidForm';
import KiidPreview from '@/components/kiid/KiidPreview';
import KiidScaledPreview from '@/components/kiid/KiidScaledPreview';
import WorkflowSplit from '@/components/workflow/WorkflowSplit';
import WorkflowPanel from '@/components/workflow/WorkflowPanel';

// Controlled split-screen editor used as the final step of the KIID workflow.
// The parent owns the document data and the workflow chrome; this component
// owns the on-screen A4 page containers and the print root.
// Layout chrome (1:2 split + cards) is shared with Validation via WorkflowSplit /
// WorkflowPanel. The document is rendered as HTML+CSS (see KiidPreview +
// kiid-document.css). Print uses an isolated iframe (see printKiid) to avoid
// Firefox/WebKit overflow clipping.

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
  const [overflow, setOverflow] = useState({ pages: [0, 0] });
  const previewRef = useRef(null);

  // Expose print to the workflow footer without a second app header.
  useEffect(() => {
    if (!printRef) return undefined;
    printRef.current = {
      print: () => {
        // Clone the unscaled print root — scale wrapper is outside that node.
        printKiid(previewRef.current, { title: kiidPrintTitle(data) });
      },
    };
    return () => {
      printRef.current = null;
    };
  }, [printRef, data]);

  return (
    <div className="kiid-editor xl:h-full xl:min-h-0">
      <WorkflowSplit
        className="xl:h-full"
        left={
          <div className="kiid-editor__form print:hidden">
            <KiidForm data={data} update={update} />
          </div>
        }
        right={
          <WorkflowPanel title="Live preview" compact>
            <KiidScaledPreview
              measureKey={JSON.stringify(data)}
              contentRef={previewRef}
              onOverflow={(pages) => setOverflow({ pages })}
              before={<OverflowIndicator overflow={overflow} />}
            >
              <KiidPreview data={data} />
            </KiidScaledPreview>
          </WorkflowPanel>
        }
      />
    </div>
  );
}
