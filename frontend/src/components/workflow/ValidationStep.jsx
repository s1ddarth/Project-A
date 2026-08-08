import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import HeaderForm from '@/components/kiid/HeaderForm';
import ValidationResults from '@/components/workflow/ValidationResults';
import DocumentPreviewPanel from '@/components/workflow/DocumentPreviewPanel';

/**
 * Prominent, full-width status strip.
 *
 * Errors and warnings must be visible without scrolling — a blocking error the
 * user has to hunt for is a blocking error they will miss.
 */
function StatusBanner({ ran, errors, warnings, awaitingFile }) {
  if (!ran) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">Not yet validated</p>
          <p className="text-xs text-muted-foreground">
            Complete the fund header, upload a NAV file, then run validation.
          </p>
        </div>
      </div>
    );
  }

  if (errors > 0) {
    return (
      <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 flex items-center gap-3">
        <XCircle className="h-6 w-6 text-red-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-800">
            {errors} blocking error{errors === 1 ? '' : 's'}
            {warnings > 0 && ` and ${warnings} warning${warnings === 1 ? '' : 's'}`}
          </p>
          <p className="text-xs text-red-700">
            Errors must be resolved before you can continue to the editor.
          </p>
        </div>
      </div>
    );
  }

  if (warnings > 0) {
    return (
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">
            {warnings} warning{warnings === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-amber-800">
            You may continue once you have acknowledged them.
          </p>
        </div>
      </div>
    );
  }

  if (awaitingFile) {
    return (
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">Header checks passed</p>
          <p className="text-xs text-amber-800">
            Upload a NAV file and re-run validation to compute the SRRI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3 flex items-center gap-3">
      <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
      <div>
        <p className="text-sm font-bold text-emerald-900">All checks passed</p>
        <p className="text-xs text-emerald-800">Proceed to the editor.</p>
      </div>
    </div>
  );
}

// Validation step: header form + Excel NAV upload + run validation + two
// separate result sections (header checks and NAV file checks). Findings and
// the computed SRRI are stubbed by the parent workflow for now.
export default function ValidationStep({
  data,
  update,
  navFileName,
  onNavFile,
  headerFindings,
  navFindings,
  validating,
  onRunValidation,
  acknowledged,
  setAcknowledged,
  demoState,
  onDemoStateChange,
}) {
  const totalErrors =
    (headerFindings || []).filter((f) => f.severity === 'error').length +
    (navFindings || []).filter((f) => f.severity === 'error').length;
  const totalWarnings =
    (headerFindings || []).filter((f) => f.severity === 'warning').length +
    (navFindings || []).filter((f) => f.severity === 'warning').length;

  const ran = headerFindings !== null;
  const showAck = ran && totalErrors === 0 && totalWarnings > 0;

  return (
    <div className="space-y-4">
      <StatusBanner
        ran={ran}
        errors={totalErrors}
        warnings={totalWarnings}
        awaitingFile={ran && navFindings === null}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ---------------- LEFT — inputs ---------------- */}
        <div className="space-y-5 min-w-0">
          {/* Demo state control — clearly labelled as a demo-only affordance. */}
          <section className="rounded-xl border bg-amber-50/60 border-amber-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Demo state</span>
                  <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">
                    Demo only
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Switches the stubbed validation result. A real service will replace this.
                </p>
              </div>
              <ToggleGroup
                type="single"
                value={demoState}
                onValueChange={onDemoStateChange}
                size="sm"
                variant="outline"
              >
                <ToggleGroupItem value="clean" aria-label="Clean">Clean</ToggleGroupItem>
                <ToggleGroupItem value="warnings" aria-label="Warnings only">Warnings only</ToggleGroupItem>
                <ToggleGroupItem value="errors" aria-label="Errors">Errors</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-1">Fund header</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Enter the fund identification details. Header checks validate these fields; the NAV
              file checks validate the uploaded spreadsheet.
            </p>
            <HeaderForm data={data} update={update} />
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h2 className="text-base font-semibold">NAV file</h2>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a href="/nav-template.xlsx" download>
                  <Download className="h-4 w-4 mr-1.5" /> Template
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Upload the Excel NAV history used to compute SRRI and past performance. Download the
              template if you need the expected column layout.
            </p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/40 transition">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {navFileName || 'Click to select an .xlsx NAV file'}
              </span>
              <span className="text-[11px] text-muted-foreground">Excel (.xlsx) — stubbed for now</span>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => onNavFile(e.target.files?.[0]?.name || '')}
              />
            </label>
            <Button className="mt-4" onClick={onRunValidation} disabled={validating}>
              {validating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              {validating ? 'Validating…' : 'Run validation'}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2">
              Header checks run on the form; NAV file checks require a file to be uploaded.
            </p>
          </section>

          {showAck && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={setAcknowledged}
                id="ack-warnings"
                className="mt-0.5"
              />
              <Label htmlFor="ack-warnings" className="text-xs leading-relaxed text-amber-900">
                I acknowledge the {totalWarnings} warning(s) above and accept the risk of proceeding
                to the editor.
              </Label>
            </div>
          )}
        </div>

        {/* ---------------- RIGHT — findings, then preview ---------------- */}
        <div className="space-y-5 min-w-0 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold mb-0.5">Header checks</h2>
            <p className="text-[11px] text-muted-foreground mb-2.5">
              ISIN format and check digit, currency consistency, required fields.
            </p>
            {ran ? (
              <ValidationResults findings={headerFindings} />
            ) : (
              <p className="text-xs text-muted-foreground italic">Run validation to see results.</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold mb-0.5">NAV file checks</h2>
            <p className="text-[11px] text-muted-foreground mb-2.5">
              Date and price parsing, duplicates, gaps, stale prices, non-positive values, extreme
              moves, coverage length.
            </p>
            {navFindings === null ? (
              <p className="text-xs text-muted-foreground italic">
                Upload a NAV file and run validation to see file checks.
              </p>
            ) : (
              <ValidationResults findings={navFindings} />
            )}
          </section>

          <DocumentPreviewPanel data={data} />
        </div>
      </div>
    </div>
  );
}
