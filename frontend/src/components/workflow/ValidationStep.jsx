import React from 'react';
import { FileSpreadsheet, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import HeaderForm from '@/components/kiid/HeaderForm';
import ValidationResults from '@/components/workflow/ValidationResults';

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
  const headerErrors = (headerFindings || []).filter((f) => f.severity === 'error');
  const navErrors = (navFindings || []).filter((f) => f.severity === 'error');
  const totalErrors = headerErrors.length + navErrors.length;
  const totalWarnings =
    (headerFindings || []).filter((f) => f.severity === 'warning').length +
    (navFindings || []).filter((f) => f.severity === 'warning').length;

  const ran = headerFindings !== null;
  const showAck = ran && totalErrors === 0 && totalWarnings > 0;
  const showPass = ran && navFindings !== null && totalErrors === 0 && totalWarnings === 0;
  const showBlock = ran && totalErrors > 0;

  return (
    <div className="space-y-6">
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
          Enter the fund identification details. Header checks validate these fields; the NAV file
          checks validate the uploaded spreadsheet.
        </p>
        <HeaderForm data={data} update={update} />
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-1">NAV file</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Upload the Excel NAV history used to compute SRRI and validate performance.
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

      {/* Pass 1 — header checks */}
      {ran && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-1">Header checks</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Validates the fund identification form fields (ISIN format and check digit, currency
            consistency, required fields).
          </p>
          <ValidationResults findings={headerFindings} />
        </section>
      )}

      {/* Pass 2 — NAV file checks */}
      {ran && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-1">NAV file checks</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Validates the uploaded spreadsheet (date/price parsing, duplicates, gaps, stale prices,
            non-positive values, extreme moves, coverage length).
          </p>
          {navFindings === null ? (
            <p className="text-sm text-muted-foreground italic">
              Upload a NAV file and run validation to see file checks.
            </p>
          ) : (
            <ValidationResults findings={navFindings} />
          )}
        </section>
      )}

      {/* Summary / gate messaging */}
      {ran && (
        <div className="space-y-3">
          {showPass && (
            <p className="text-xs text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> All checks passed — proceed to the editor.
            </p>
          )}
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
          {showBlock && (
            <p className="text-xs text-red-600">
              {totalErrors} blocking error{totalErrors === 1 ? '' : 's'} must be resolved before
              proceeding.
            </p>
          )}
        </div>
      )}
    </div>
  );
}