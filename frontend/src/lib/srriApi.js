/**
 * Client for the SRRI service.
 *
 * This module does no regulatory work. It posts inputs, and it renders whatever
 * the service returns — every finding, the SRRI, the risk wording and the audit
 * block all come from Python (rules 1 and 4). If you find yourself computing
 * something here, it belongs in the engine instead.
 */

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Frequency of the uploaded NAV series. `auto` lets the engine detect it. */
export const FREQUENCY_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/**
 * How to read ambiguous dates.
 *
 * There is deliberately no "safe" default surfaced as a silent choice: a
 * US-formatted file parsed as DMY produces a wrong SRRI with no other symptom,
 * which is the defect the engine was fixed for.
 */
export const DATE_FORMAT_OPTIONS = [
  { value: 'dmy', label: 'DMY', hint: '03/04/2024 = 3 April' },
  { value: 'mdy', label: 'MDY', hint: '03/04/2024 = 4 March' },
  { value: 'iso', label: 'ISO', hint: '2024-04-03' },
  { value: 'auto', label: 'Auto', hint: 'infer; errors if ambiguous' },
];

export class SrriApiError extends Error {
  constructor(message, { status, code, remediation } = {}) {
    super(message);
    this.name = 'SrriApiError';
    this.status = status;
    this.code = code;
    this.remediation = remediation;
  }
}

function requireBase() {
  if (!API_BASE) {
    throw new SrriApiError(
      'The SRRI service URL is not configured.',
      { code: 'API_NOT_CONFIGURED', remediation: 'Set VITE_API_URL in frontend/.env.local and restart the dev server.' }
    );
  }
}

/** FastAPI returns `detail` as either a string or a finding-shaped object. */
async function toError(response) {
  let detail;
  try {
    ({ detail } = await response.json());
  } catch {
    detail = null;
  }
  if (detail && typeof detail === 'object') {
    return new SrriApiError(detail.message || 'The service rejected the request.', {
      status: response.status,
      code: detail.code,
      remediation: detail.remediation,
    });
  }
  return new SrriApiError(
    typeof detail === 'string' ? detail : `Service returned ${response.status}.`,
    { status: response.status }
  );
}

function buildForm({ header, file, frequency, dateFormat, currency, referenceDate, hasCharges }) {
  const form = new FormData();
  form.append('header', JSON.stringify(header || {}));
  form.append('frequency', frequency || 'auto');
  form.append('date_format', dateFormat || 'dmy');
  form.append('currency', currency || '');
  // Empty means "derive from the last NAV observation" — the service must not
  // fall back to today, or the same file would produce a different document
  // next month.
  form.append('reference_date', referenceDate || '');
  form.append('has_entry_or_exit_charges', String(hasCharges !== false));
  if (file) form.append('file', file, file.name);
  return form;
}

/**
 * Run both validation passes and, when a file is given, the SRRI.
 *
 * `file` is optional — omitting it checks the header form alone, which is how
 * the validation step behaves before a NAV file has been chosen.
 */
export async function validateAndCalculate({
  header, file, frequency, dateFormat, currency, referenceDate, hasCharges, signal,
}) {
  requireBase();
  let response;
  try {
    response = await fetch(`${API_BASE}/v1/srri`, {
      method: 'POST',
      body: buildForm({ header, file, frequency, dateFormat, currency, referenceDate, hasCharges }),
      signal,
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw new SrriApiError(`Could not reach the SRRI service at ${API_BASE}.`, {
      code: 'SERVICE_UNREACHABLE',
      remediation: 'Start it with: cd backend/api && ../.venv/bin/uvicorn main:app --reload --port 8000',
    });
  }
  if (!response.ok) throw await toError(response);
  return response.json();
}

/**
 * Download the audit workbook for the same upload.
 *
 * The service is stateless, so the file is posted again rather than referenced
 * by an id — the browser still holds it, and there is no server-side result to
 * go stale.
 */
export async function downloadWorkbook({
  file, frequency, dateFormat, currency, referenceDate, hasCharges, filename,
}) {
  requireBase();
  const form = new FormData();
  form.append('frequency', frequency || 'auto');
  form.append('date_format', dateFormat || 'dmy');
  form.append('currency', currency || '');
  form.append('reference_date', referenceDate || '');
  form.append('has_entry_or_exit_charges', String(hasCharges !== false));
  form.append('file', file, file.name);

  let response;
  try {
    response = await fetch(`${API_BASE}/v1/srri/workbook`, { method: 'POST', body: form });
  } catch {
    throw new SrriApiError(`Could not reach the SRRI service at ${API_BASE}.`, {
      code: 'SERVICE_UNREACHABLE',
    });
  }
  if (!response.ok) throw await toError(response);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'srri-calculation.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
