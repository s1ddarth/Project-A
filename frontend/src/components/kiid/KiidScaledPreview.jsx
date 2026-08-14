import { useEffect, useRef, useState } from 'react';
import './kiid-scaled-preview.css';

const PX_PER_MM = 96 / 25.4;
const A4_WIDTH_PX = 210 * PX_PER_MM;
const A4_HEIGHT_PX = 297 * PX_PER_MM;
/** Horizontal inset inside the preview pane so the scaled page is not flush. */
const PREVIEW_PAD_X = 24;

/**
 * Fit-to-width A4 preview shell used by Validation and the Editor.
 *
 * Children render at real A4 geometry (`.kiid-page` / `kiid-document.css`);
 * this wrapper only scales them to the pane width. Scale is applied outside
 * the print root so `printKiid` can clone unscaled markup.
 *
 * @param {{
 *   children: import('react').ReactNode,
 *   measureKey?: unknown,
 *   contentRef?: { current: HTMLElement | null },
 *   before?: import('react').ReactNode,
 *   onOverflow?: (pages: number[]) => void,
 *   className?: string,
 * }} props
 */
export default function KiidScaledPreview({
  children,
  measureKey,
  contentRef,
  before = null,
  onOverflow,
  className,
}) {
  const [previewScale, setPreviewScale] = useState(1);
  const [scaleShellHeight, setScaleShellHeight] = useState(0);
  const paneRef = useRef(null);
  const localContentRef = useRef(null);
  const onOverflowRef = useRef(onOverflow);
  onOverflowRef.current = onOverflow;

  useEffect(() => {
    const pane = paneRef.current;
    const root = localContentRef.current;
    if (!pane || !root) return undefined;

    const measure = () => {
      const available = Math.max(0, pane.clientWidth - PREVIEW_PAD_X * 2);
      const scale = available > 0 ? Math.min(1, available / A4_WIDTH_PX) : 1;
      setPreviewScale(scale);

      const pages = root.querySelectorAll('.kiid-page');
      const overs = Array.from(pages).map((p) =>
        Math.max(0, (p.offsetHeight - A4_HEIGHT_PX) / PX_PER_MM)
      );
      onOverflowRef.current?.(overs);

      setScaleShellHeight(Math.ceil(root.offsetHeight * scale));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(root);
    return () => ro.disconnect();
  }, [measureKey]);

  return (
    <div ref={paneRef} className={className ? `kiid-scaled-preview ${className}` : 'kiid-scaled-preview'}>
      <div className="kiid-scaled-preview__inner">
        {before}
        <div
          className="kiid-scaled-preview__scale-shell"
          style={{ height: scaleShellHeight || undefined }}
        >
          <div
            className="kiid-scaled-preview__scale"
            style={{
              transform: `scale(${previewScale})`,
              width: '210mm',
            }}
          >
            <div
              ref={(node) => {
                localContentRef.current = node;
                if (contentRef) contentRef.current = node;
              }}
              className="kiid-scaled-preview__print-root kiid-print-root"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
