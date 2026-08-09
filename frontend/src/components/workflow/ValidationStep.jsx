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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DATE_FORMAT_OPTIONS, FREQUENCY_OPTIONS, downloadWorkbook,
} from '@/lib/srriApi';
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
  navFile,
  onNavFile,
  frequency,
  onFrequencyChange,
  dateFormat,
  onDateFormatChange,
  referenceDate,
  onReferenceDateChange,
  disclosures,
  headerFindings,
  navFindings,
  validating,
  onRunValidation,
  acknowledged,
  setAcknowledged,
  audit,
}) {
  const [workbookError, setWorkbookError] = React.useState('');
  const [downloading, setDownloading] = React.useState(false);

  const getWorkbook = async () => {
    setWorkbookError('');
    setDownloading(true);
    try {
      await downloadWorkbook({
        file: navFile,
        frequency,
        dateFormat,
        currency: data.shareClassBaseCurrency,
        referenceDate,
        hasCharges: Number(data.entryCost) > 0 || Number(data.exitCost) > 0,
        filename: `${(navFile?.name || 'nav').replace(/\.[^.]+$/, '')}-srri-calculation.xlsx`,
      });
    } catch (err) {
      setWorkbookError(err.message);
    } finally {
      setDownloading(false);
    }
  };
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* ---------------- LEFT — inputs ---------------- */}
        <div className="space-y-5 min-w-0">
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
                {/* Stored under a URL-safe name; saved under the real one. */}
                <a href="/nav-template.xlsx" download="NAV Request Template_V1.xlsx">
                  <Download className="h-4 w-4 mr-1.5" /> Template
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Upload the Excel NAV history used to compute SRRI and past performance. Download the
              template if you need the expected layout — fill in the header block and the
              Date / NAV columns from row 8.
            </p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/40 transition">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {navFile?.name || 'Click to select a NAV file'}
              </span>
              <span className="text-[11px] text-muted-foreground">.xlsx, .xls, .csv or .txt</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => onNavFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Frequency</Label>
                <Select value={frequency} onValueChange={onFrequencyChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Date format</Label>
                <Select value={dateFormat} onValueChange={onDateFormatChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_FORMAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label} — {o.hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 mt-3">
              <Label className="text-xs font-medium text-muted-foreground">
                Reference date
              </Label>
              <Input
                type="date"
                value={referenceDate || ''}
                onChange={(e) => onReferenceDateChange(e.target.value)}
                className="max-w-[200px]"
              />
              {/* Deliberately NOT defaulted to today: the same file must produce
                  the same document whenever it is re-run (rule 5). */}
              <p className="text-[11px] text-muted-foreground">
                Leave blank to use the last date in the NAV file. Governs which
                calendar years appear in past performance.
              </p>
            </div>

            {/* The engine cannot tell 03/04 apart on its own. Getting this wrong
                produces a wrong SRRI with no other symptom, so it is an explicit
                choice rather than a silent default. */}
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Date format must match the file. A US-formatted file read as DMY produces a wrong
              SRRI with no other warning.
            </p>

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Button onClick={onRunValidation} disabled={validating}>
                {validating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-1" />
                )}
                {validating ? 'Validating…' : 'Run validation'}
              </Button>
              {navFile && (
                <Button variant="outline" onClick={getWorkbook} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1.5" />
                  )}
                  Calculation workbook
                </Button>
              )}
            </div>
            {workbookError && <p className="text-[11px] text-red-600 mt-2">{workbookError}</p>}
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

          {disclosures?.length > 0 && (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold mb-0.5">Required disclosures</h2>
              {/* Art. 15(5). These are NOT in the calculation workbook by
                  design — they must sit alongside the published chart, so the
                  document layer takes them from the response. */}
              <p className="text-[11px] text-muted-foreground mb-2.5">
                Art. 15(5) — must appear alongside the past-performance chart.
              </p>
              <ul className="space-y-1.5">
                {disclosures.map((d, i) => (
                  <li key={i} className="text-[11px] leading-relaxed border-l-2 border-primary/30 pl-2">
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <DocumentPreviewPanel data={data} />

          {/* Rule 5 — a published figure must be re-derivable. Everything needed
              to reproduce this SRRI comes back with it, so show it rather than
              discard it. */}
          {audit && (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold mb-0.5">Calculation provenance</h2>
              <p className="text-[11px] text-muted-foreground mb-2.5">
                Stored with the document so any figure can be re-derived.
              </p>
              <dl className="text-[11px] space-y-1">
                {[
                  ['Engine', `${audit.engine_name} ${audit.engine_version}`],
                  ['Basis', `${audit.frequency} — m=${audit.m}, T=${audit.window}, ${audit.annualisation}`],
                  ['Date format used', audit.date_format_resolved.toUpperCase()],
                  ['Box 3 buffer', `${audit.buffer_months} months`],
                  [
                    'Minimum window',
                    `${audit.min_periods}${audit.min_periods_is_regulatory_default ? ' (regulatory default)' : ' (OVERRIDDEN)'}`,
                  ],
                  ['Input file', audit.input_filename || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground shrink-0">{k}</dt>
                    <dd className="text-right font-medium min-w-0 break-words">{v}</dd>
                  </div>
                ))}
                <div className="pt-1">
                  <dt className="text-muted-foreground">Input SHA-256</dt>
                  <dd className="font-mono text-[10px] break-all">{audit.input_sha256}</dd>
                </div>
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
