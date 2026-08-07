/**
 * Print a KIID by cloning it into an isolated iframe.
 *
 * Avoids Firefox/WebKit bugs where nested flex + overflow:auto shells clip
 * or drop sections during in-page window.print().
 */

const PRINT_LAYOUT_CSS = `
@page {
  size: A4;
  margin: 12mm 14mm;
}

html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  height: auto !important;
  overflow: visible !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.kiid-print-root {
  display: block !important;
}

.kiid-print-root .kiid-doc {
  gap: 0 !important;
  padding: 0 !important;
  align-items: stretch !important;
}

/* Flow into @page margins — do not keep on-screen A4 card chrome. */
.kiid-print-root .kiid-page {
  width: auto !important;
  min-height: 0 !important;
  height: auto !important;
  padding: 0 !important;
  box-shadow: none !important;
  margin: 0 !important;
  background: transparent !important;
}

.kiid-print-root .kiid-page:nth-of-type(2) {
  break-before: page;
  page-break-before: always;
}

/* Soft fragmentation: never blank-out a tall section (Firefox/WebKit). */
.kiid-print-root .kiid-redbox {
  break-inside: auto;
  page-break-inside: auto;
}

.kiid-print-root .kiid-header,
.kiid-print-root .kiid-charges,
.kiid-print-root .kiid-regulatory,
.kiid-print-root .kiid-perf-chart,
.kiid-print-root .kiid-bullets li {
  break-inside: avoid;
  page-break-inside: avoid;
}

.kiid-print-root .kiid-page > .kiid-redbox:last-child {
  margin-bottom: 0 !important;
}

.kiid-perf-chart,
.kiid-perf-chart .recharts-responsive-container,
.kiid-perf-chart .recharts-wrapper {
  width: 100% !important;
  height: 150px !important;
  min-height: 150px !important;
  overflow: visible !important;
}
`;

function copyStylesInto(targetDoc) {
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const css = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
      const style = targetDoc.createElement('style');
      style.textContent = css;
      targetDoc.head.appendChild(style);
    } catch {
      // Cross-origin sheets: link by href when available.
      if (sheet.href) {
        const link = targetDoc.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        targetDoc.head.appendChild(link);
      }
    }
  });
}

function waitForStylesheets(doc) {
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  if (links.length === 0) return Promise.resolve();
  return Promise.all(
    links.map(
      (link) =>
        new Promise((resolve) => {
          if (link.sheet) {
            resolve();
            return;
          }
          link.addEventListener('load', resolve, { once: true });
          link.addEventListener('error', resolve, { once: true });
        })
    )
  );
}

/** Build a filesystem-friendly Save-as-PDF title. */
export function kiidPrintTitle(data = {}) {
  const fund = String(data.subFundName || 'KIID')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const isin = String(data.isin || '')
    .replace(/[^\w-]/g, '')
    .slice(0, 20);
  return [fund || 'KIID', isin, 'KIID'].filter(Boolean).join('-');
}

/**
 * @param {HTMLElement | null} rootEl  `.kiid-print-root` element
 * @param {{ title?: string }} [options]
 */
export function printKiid(rootEl, options = {}) {
  if (!rootEl) return;

  const title = options.title || 'KIID';
  const prevTitle = document.title;
  document.title = title;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Print KIID');
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '210mm',
    height: '297mm',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    document.title = prevTitle;
    iframe.remove();
    return;
  }

  idoc.open();
  idoc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title></title></head><body></body></html>'
  );
  idoc.close();
  idoc.title = title;

  copyStylesInto(idoc);

  const layout = idoc.createElement('style');
  layout.textContent = PRINT_LAYOUT_CSS;
  idoc.head.appendChild(layout);

  const clone = /** @type {HTMLElement} */ (rootEl.cloneNode(true));
  clone.classList.add('kiid-print-root');
  idoc.body.appendChild(clone);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.title = prevTitle;
    iwin.removeEventListener('afterprint', cleanup);
    iframe.remove();
  };

  const runPrint = () => {
    iwin.addEventListener('afterprint', cleanup);
    // Fallback if afterprint is delayed or missing.
    setTimeout(cleanup, 60_000);
    iwin.focus();
    iwin.print();
  };

  waitForStylesheets(idoc).then(() => {
    // Allow layout/fonts one frame after styles apply.
    requestAnimationFrame(() => {
      setTimeout(runPrint, 50);
    });
  });
}
