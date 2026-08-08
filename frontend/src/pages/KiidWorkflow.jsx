import React, { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WorkflowStepper from '@/components/workflow/WorkflowStepper';
import ProductPicker from '@/components/workflow/ProductPicker';
import ProductionMode from '@/components/workflow/ProductionMode';
import ValidationStep from '@/components/workflow/ValidationStep';
import KiidEditor from '@/pages/KiidEditor';
import { defaultData, sampleData } from '@/lib/kiidData';
import { cn } from '@/lib/utils';

const STEPS = ['Product', 'Production', 'Validation', 'Editor'];
// v2: srriCategory/srriLabel/performanceYears became engine-computed and start
// empty, and accDis was added. Bumping the key avoids resurrecting a v1 draft
// that would show a typed-looking SRRI the engine never produced.
const STORAGE_KEY = 'kiid-editor-state-v2';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultData, ...sampleData, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt state */
  }
  return { ...defaultData, ...sampleData };
}

// ---- Stubbed findings, split into two passes. A real Python service will ----
// ---- supply these later; the shape (id, severity, code, message) is the  ----
// ---- contract. The demo state switches between Clean / Warnings / Errors. ----

// Pass 1 — header checks: validate the fund identification form fields. Runs
// on the form, independent of the uploaded file.
const HEADER_FINDINGS_BY_DEMO = {
  clean: [],
  warnings: [],
  errors: [
    { id: 'h1', severity: 'error', code: 'ISIN_CHECKSUM', message: 'ISIN check digit does not match the expected value for IE00BDBB9Q16.' },
    { id: 'h2', severity: 'error', code: 'CURRENCY_MISMATCH', message: 'Share class currency (USD) differs from sub-fund base currency (EUR) — a mismatch means the wrong share class would be generated.' },
  ],
};

// Pass 2 — NAV file checks: validate the uploaded spreadsheet itself. Runs on
// the file, so only produced when a NAV file has been uploaded.
const NAV_FINDINGS_BY_DEMO = {
  clean: [],
  warnings: [
    { id: 'n1', severity: 'warning', code: 'PARTIAL_YEAR', message: 'Performance figure for 2024 is a partial year — ensure the past-performance disclaimer is present.' },
    { id: 'n2', severity: 'warning', code: 'STALE_PRICE', message: 'NAV price for 2024-11-29 is over 30 days old; confirm the latest valuation has been uploaded.' },
  ],
  errors: [
    { id: 'n3', severity: 'error', code: 'NAV_HISTORY_SHORT', message: 'NAV history contains only 4 consecutive years; a minimum of 5 is required to compute SRRI.' },
    { id: 'n4', severity: 'warning', code: 'PARTIAL_YEAR', message: 'Performance figure for 2024 is a partial year — ensure the past-performance disclaimer is present.' },
  ],
};

// Stubbed engine response. Everything below is computed by the Python service
// from the uploaded NAV file — the SRRI category, its matching risk wording and
// the past-performance figures. None of it may ever be typed by a user.
const STUB_SRRI = '4';
const STUB_SRRI_LABEL = 'Medium Risk';
const STUB_PERFORMANCE_YEARS = [
  { year: 2019, value: 8.2 },
  { year: 2020, value: 5.4 },
  { year: 2021, value: 14.1 },
  { year: 2022, value: -6.8 },
  { year: 2023, value: 11.5 },
  { year: 2024, value: 7.3 },
];

export default function KiidWorkflow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(loadState);
  const [product, setProduct] = useState('ucits_kiid');
  const [mode, setMode] = useState('single');
  const [demoState, setDemoState] = useState('warnings'); // clean | warnings | errors
  const [headerFindings, setHeaderFindings] = useState(null);
  const [navFindings, setNavFindings] = useState(null);
  const [validating, setValidating] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [navFileName, setNavFileName] = useState('');

  const update = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const changeDemoState = useCallback((v) => {
    if (!v) return;
    setDemoState(v);
    // Clear previous results so the user re-runs with the new state.
    setHeaderFindings(null);
    setNavFindings(null);
    setAcknowledged(false);
  }, []);

  const runValidation = () => {
    setValidating(true);
    setHeaderFindings(null);
    setNavFindings(null);
    setAcknowledged(false);
    setTimeout(() => {
      const header = HEADER_FINDINGS_BY_DEMO[demoState];
      const nav = navFileName ? NAV_FINDINGS_BY_DEMO[demoState] : null;
      setHeaderFindings(header);
      setNavFindings(nav);
      // The engine only returns figures when the file was actually accepted, so
      // a blocking error must leave the computed fields unresolved rather than
      // populating the document with numbers nothing stands behind.
      const blocked = [...header, ...(nav || [])].some((f) => f.severity === 'error');
      setData((prev) =>
        navFileName && !blocked
          ? {
              ...prev,
              srriCategory: STUB_SRRI,
              srriLabel: STUB_SRRI_LABEL,
              performanceYears: STUB_PERFORMANCE_YEARS,
            }
          : { ...prev, srriCategory: '', srriLabel: '', performanceYears: [] }
      );
      setValidating(false);
    }, 1000);
  };

  const reset = () => setData({ ...defaultData, ...sampleData });

  const allFindings = [...(headerFindings || []), ...(navFindings || [])];
  const errors = allFindings.filter((f) => f.severity === 'error');
  const warnings = allFindings.filter((f) => f.severity === 'warning');
  // Proceed requires both passes to have run (so a NAV file must be uploaded),
  // no blocking errors, and any warnings acknowledged.
  const canProceed =
    headerFindings !== null &&
    navFindings !== null &&
    errors.length === 0 &&
    (warnings.length === 0 || acknowledged);

  // The editor step takes over the full screen with its own header (preview +
  // download), so it is rendered outside the stepper shell.
  if (step === 3) {
    return <KiidEditor data={data} update={update} onBack={() => setStep(2)} onReset={reset} />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center justify-between gap-4 px-5 h-14 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            K
          </div>
          <h1 className="text-sm font-semibold">UCITS KIID Generator</h1>
        </div>
        {step > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
      </header>

      <div className="px-5 pt-4 shrink-0">
        <WorkflowStepper steps={STEPS} current={step} onStepClick={(i) => setStep(i)} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* The validation step runs a two-column layout, so it needs the full
            width; the picker steps stay narrow and centred. */}
        <div className={cn('mx-auto p-6', step === 2 ? 'max-w-[1500px]' : 'max-w-3xl')}>
          {step === 0 && <ProductPicker value={product} onChange={setProduct} />}
          {step === 1 && <ProductionMode value={mode} onChange={setMode} />}
          {step === 2 && (
            <ValidationStep
              data={data}
              update={update}
              navFileName={navFileName}
              onNavFile={setNavFileName}
              headerFindings={headerFindings}
              navFindings={navFindings}
              validating={validating}
              onRunValidation={runValidation}
              acknowledged={acknowledged}
              setAcknowledged={setAcknowledged}
              demoState={demoState}
              onDemoStateChange={changeDemoState}
            />
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-4 px-5 h-16 border-t bg-card shrink-0">
        <div className="text-xs text-muted-foreground">
          {step === 0 && 'Select a document type to begin.'}
          {step === 1 && 'Choose how you want to produce documents.'}
          {step === 2 && headerFindings === null && 'Upload a NAV file and run validation.'}
          {step === 2 &&
            headerFindings !== null &&
            `${errors.length} error(s), ${warnings.length} warning(s).`}
        </div>
        <div className="flex items-center gap-2">
          {step < 2 && (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && product !== 'ucits_kiid'}
            >
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={!canProceed}>
              Proceed to editor <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}