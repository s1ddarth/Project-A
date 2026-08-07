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

/* Flex print layouts are unreliable in WebKit — use block flow. */
.kiid-print-root .kiid-doc {
  display: block !important;
  gap: 0 !important;
  padding: 0 !important;
  align-items: stretch !important;
}

/* Flow into @page margins — do not keep on-screen A4 card chrome. */
.kiid-print-root .kiid-page {
  display: block !important;
  width: auto !important;
  min-height: 0 !important;
  height: auto !important;
  padding: 0 !important;
  box-shadow: none !important;
  margin: 0 !important;
  background: transparent !important;
  overflow: visible !important;
}

.kiid-print-root .kiid-page:first-of-type {
  break-after: page;
  page-break-after: always;
}

.kiid-print-root .kiid-page:nth-of-type(2) {
  break-before: page;
  page-break-before: always;
}

/* Soft fragmentation for Chromium/Firefox (Safari overrides below). */
.kiid-print-root .kiid-redbox {
  break-inside: auto;
  page-break-inside: auto;
}

.kiid-print-root .kiid-header,
.kiid-print-root .kiid-charges,
.kiid-print-root .kiid-regulatory,
.kiid-print-root .kiid-perf-chart,
.kiid-print-root .kiid-perf-chart svg,
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
  overflow: hidden !important;
}
`;

/**
 * WebKit largely ignores break-inside:avoid on bordered blocks and will slice
 * red/blue boxes mid-chart. inline-block creates an atomic fragment that
 * Safari will push to the next page instead of splitting.
 */
const SAFARI_PRINT_CSS = `
.kiid-print-root .kiid-redbox,
.kiid-print-root .kiid-bluebox {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
  -webkit-column-break-inside: avoid !important;
  display: inline-block !important;
  width: 100% !important;
  max-width: 100% !important;
  vertical-align: top;
  box-sizing: border-box !important;
  overflow: hidden !important;
}

.kiid-print-root .kiid-split {
  display: table !important;
  width: 100% !important;
  table-layout: fixed !important;
  border-collapse: separate !important;
  border-spacing: 10px 0 !important;
}

.kiid-print-root .kiid-split__left,
.kiid-print-root .kiid-split__right,
.kiid-print-root .kiid-split__left--wide,
.kiid-print-root .kiid-split__right--narrow {
  display: table-cell !important;
  vertical-align: top !important;
  float: none !important;
}

.kiid-print-root .kiid-split__left { width: 47% !important; }
.kiid-print-root .kiid-split__right { width: 51% !important; }
.kiid-print-root .kiid-split__left--wide { width: 51% !important; }
.kiid-print-root .kiid-split__right--narrow { width: 47% !important; }

.kiid-print-root .kiid-perf-chart,
.kiid-print-root .kiid-perf-chart svg {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
  -webkit-column-break-inside: avoid !important;
}
`;

function isSafariBrowser() {
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox/i.test(ua);
}

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

function sizeIframeToContent(iframe, idoc, rootClone) {
  // Safari often prints only the iframe's box; size it to the full document.
  const height = Math.ceil(
    Math.max(
      rootClone.scrollHeight,
      rootClone.offsetHeight,
      idoc.body.scrollHeight,
      idoc.documentElement.scrollHeight,
      1123 * 2
    )
  );
  iframe.style.width = '210mm';
  iframe.style.height = `${height + 32}px`;
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
  const safari = isSafariBrowser();

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Print KIID');
  // Keep the iframe "visible" to the engine (opacity:0 blanks Safari prints)
  // but park it off-screen so the user never sees it.
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '-10000px',
    width: '210mm',
    height: '600mm',
    border: '0',
    opacity: '1',
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
  layout.textContent = PRINT_LAYOUT_CSS + (safari ? SAFARI_PRINT_CSS : '');
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
    sizeIframeToContent(iframe, idoc, clone);
    iwin.addEventListener('afterprint', cleanup);
    // Fallback if afterprint is delayed or missing.
    setTimeout(cleanup, 60_000);
    iwin.focus();
    iwin.print();
  };

  waitForStylesheets(idoc).then(() => {
    // Allow layout/fonts a couple frames after styles apply (Safari needs more).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(runPrint, safari ? 150 : 50);
      });
    });
  });
}
