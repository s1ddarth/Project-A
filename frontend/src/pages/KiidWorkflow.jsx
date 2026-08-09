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
import { validateAndCalculate } from '@/lib/srriApi';

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

// Fields sent to the service for pass 1 (header checks). Only master data —
// the narrative blocks are irrelevant to validation.
const HEADER_FIELDS = [
  'subFundName', 'companyName', 'shareClassFullName', 'isin',
  'subFundBaseCurrency', 'shareClassBaseCurrency', 'hedged', 'accDis', 'scLetter',
];

function headerPayload(data) {
  return Object.fromEntries(HEADER_FIELDS.map((k) => [k, data[k]]));
}

/** Present a client-side failure in the same shape the service uses. */
function errorAsFinding(err) {
  return [{
    id: 'client-0',
    pass: 'header',
    severity: 'error',
    code: err.code || 'SERVICE_ERROR',
    message: err.message,
    remediation: err.remediation,
    detail: {},
  }];
}

export default function KiidWorkflow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(loadState);
  const [product, setProduct] = useState('ucits_kiid');
  const [mode, setMode] = useState('single');
  const [headerFindings, setHeaderFindings] = useState(null);
  const [navFindings, setNavFindings] = useState(null);
  const [validating, setValidating] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [navFile, setNavFile] = useState(null);
  const [frequency, setFrequency] = useState('auto');
  const [dateFormat, setDateFormat] = useState('dmy');
  // Blank means "derive from the last NAV observation" — see srriApi.
  const [referenceDate, setReferenceDate] = useState('');
  const [audit, setAudit] = useState(null);
  const [disclosures, setDisclosures] = useState([]);

  const update = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Changing an input invalidates the previous result — a stale SRRI next to
  // edited inputs is exactly the drift rule 5 exists to prevent.
  const invalidate = useCallback(() => {
    setHeaderFindings(null);
    setNavFindings(null);
    setAcknowledged(false);
    setAudit(null);
    setDisclosures([]);
    setData((prev) => ({
      ...prev, srriCategory: '', srriLabel: '', performanceYears: [],
    }));
  }, []);

  const onNavFile = useCallback((file) => {
    setNavFile(file);
    invalidate();
  }, [invalidate]);

  const runValidation = async () => {
    setValidating(true);
    setHeaderFindings(null);
    setNavFindings(null);
    setAcknowledged(false);
    setAudit(null);

    // Everything below comes back from the engine. Nothing here derives a risk
    // number, a risk label or a finding — that is the service's job (rule 4).
    try {
      const res = await validateAndCalculate({
        header: headerPayload(data),
        file: navFile,
        frequency,
        dateFormat,
        currency: data.shareClassBaseCurrency,
        referenceDate,
        // Art. 15(5)(b) only applies where entry or exit charges exist.
        hasCharges: Number(data.entryCost) > 0 || Number(data.exitCost) > 0,
      });
      setHeaderFindings(res.header_findings || []);
      setNavFindings(navFile ? res.nav_findings || [] : null);
      setAudit(res.audit || null);
      setDisclosures(res.past_performance?.disclosures || []);
      setData((prev) => ({
        ...prev,
        srriCategory: res.srri?.srri_disclosed != null ? String(res.srri.srri_disclosed) : '',
        srriLabel: res.srri?.risk_description || '',
        // Engine-computed from the same upload as the SRRI. Blank years are
        // kept: Art. 15(3) requires the year to appear with nothing else, so a
        // blank bar is still a bar and must not be dropped.
        performanceYears: (res.past_performance?.bars || []).map((b) => ({
          year: b.year,
          value: b.fund_return_pct,
          isBlank: b.is_blank,
        })),
      }));
    } catch (err) {
      setHeaderFindings(errorAsFinding(err));
      setNavFindings(null);
      setDisclosures([]);
      setData((prev) => ({ ...prev, srriCategory: '', srriLabel: '', performanceYears: [] }));
    } finally {
      setValidating(false);
    }
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
              navFile={navFile}
              onNavFile={onNavFile}
              frequency={frequency}
              onFrequencyChange={setFrequency}
              dateFormat={dateFormat}
              onDateFormatChange={setDateFormat}
              referenceDate={referenceDate}
              onReferenceDateChange={setReferenceDate}
              disclosures={disclosures}
              headerFindings={headerFindings}
              navFindings={navFindings}
              validating={validating}
              onRunValidation={runValidation}
              acknowledged={acknowledged}
              setAcknowledged={setAcknowledged}
              audit={audit}
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