# UCITS KIID calculation engines — developer handover

Three modules that turn one uploaded NAV file into the two calculated figures a
UCITS Key Investor Information Document needs: the **SRRI** (1–7) and the
**past-performance bar chart**.

| File | What it does | Regulatory basis |
|---|---|---|
| `srri_engine.py` | SRRI, weekly and monthly bases, Box 3 migration buffer | CESR/10-673; Reg. (EU) No 583/2010 |
| `past_performance.py` | Calendar-year returns, bar chart, disclosures, Excel output | Reg. (EU) No 583/2010, Arts. 15–19 and Annex III |
| `returns_input.py` | Accepts a % return file instead of NAV prices and converts it | — |

**Python 3.10+.** Dependencies: `pandas`, `numpy`, `pydantic>=2`, `openpyxl`.
No other runtime dependencies, no network access, no database, no filesystem
requirement — every entry point accepts raw bytes and returns bytes.

---

## 1. The one call

```python
from datetime import date
from past_performance import run_kiid, merge_into_workbook, OutputProfile
from srri_engine import DateFormat, export_workbook

srri_result, pp_result = run_kiid(
    uploaded_bytes,                      # the file exactly as received
    reference_date=date(2026, 8, 9),     # KIID publication reference date
    currency="EUR",                      # share class base currency, from the form
    date_format=DateFormat.ISO,          # from the form — see §4
    filename="nav.xlsx",
)

if srri_result.is_blocked or pp_result.is_blocked:
    return {"errors": [f.model_dump() for f in
                       srri_result.errors + pp_result.errors]}

xlsx = merge_into_workbook(
    export_workbook(srri_result), pp_result, profile=OutputProfile.KIID
)
```

`run_kiid()` parses the upload **once** and hands the same parsed series to both
engines, so both results carry the identical input SHA-256. Do not call the two
engines separately on the same upload — you would read the file twice and the
audit hash would stop proving what was calculated.

Everything is JSON-serialisable: `result.model_dump(mode="json")` is what to
persist. The Excel workbook is an artifact derived from the result, never the
other way round — you can always rebuild it from stored data.

## 2. Percentage-return files

Some administrators send returns rather than NAV prices. `prices_from_upload()`
handles either and returns a price series ready for `run_kiid()`:

```python
from returns_input import prices_from_upload

prices, findings, hint = prices_from_upload(uploaded_bytes)
if prices is None:                      # units could not be determined
    return {"errors": [f.model_dump() for f in findings if f.severity == "error"]}

srri_result, pp_result = run_kiid(prices, reference_date=..., currency=...)
```

The file is asked before any heuristics run. Three signals, in precedence order:

| Signal | Example | Stored value | Divisor |
|---|---|---|---|
| Cell number format contains `%` | cell displays `1.25%` | `0.0125` | **1** |
| Value is text ending in `%` | `"1.25%"` | `1.25` | 100 |
| Header names a return | `Return %` with `1.25` | `1.25` | 100 |

**Do not "simplify" this into a check for a `%` character.** Excel percent
formatting stores the decimal, so a `%` in the cell format means *do not* divide
by 100, while a `%` in the header means *do*. Conflating them understates
volatility a hundredfold and moves the fund two risk classes.

Where the file declares nothing, units fall back to the magnitude of the largest
raw value. Two zones cannot be resolved and return `None` with an error finding
rather than a guess — 0.5 to 1.5, and anything below 0.02. Let the preparer
declare it via `kind=` instead.

## 3. Findings — the whole error model

Nothing is reported by logging or by raising. Every observation is a `Finding`
with a stable `code`, a `severity`, a human `message`, an optional
`remediation`, and a `detail` dict. The UI keys off `code`, never off message
text.

- `severity == "error"` — blocks. `result.is_blocked` is True and no figure was
  produced. Render `result.errors` and stop.
- `severity == "warning"` — the figure exists but the user must acknowledge.
  `result.requires_acknowledgement`.
- `severity == "info"` — display only.

Only a genuinely unreadable input raises (`SRRIInputError`). Everything
recoverable is a finding.

Upstream validation findings are passed in and travel with the results into
both audit sheets:

```python
from past_performance import currency_finding

guard = currency_finding(series_currency, base_currency)   # None if they agree
srri_result, pp_result = run_kiid(..., extra_findings=[guard] if guard else None)
```

`currency_finding()` is warn-only by house setting. A NAV series quoted in
anything but the share class's base currency measures the fund plus the exchange
rate: on `IE00BK5BQY34` the USD listing gave SRRI 6 against a published 5, and
2025 past performance of +36.2 % against a published +20.7 %.

## 4. What the form must collect

The NAV file does not carry these.

| Needed by | Field | Notes |
|---|---|---|
| Both | Reference date | Defaults to today, which is wrong for reproducing a past document |
| Both | Date format | `DMY`, `MDY` or `ISO`. Required — see below |
| SRRI | Frequency | `AUTO` is correct for almost everything |
| SRRI | Min-periods override | Only when history is short. Requires approver **and** reason; placeholders are rejected |
| Past performance | Base currency | Also drives the currency guard |
| Past performance | Entry/exit charges yes-no | Disapplies the Art. 15(5)(b) statement when no |
| Past performance, optional | Benchmark series and name | Art. 18, where the objectives reference one |
| Past performance, optional | Material changes | Date plus a real description; placeholders rejected |
| Past performance, optional | Administrator figures | Reconciled at 0.05 pp; does not override the computed figure |

**Date format cannot be inferred and must not be guessed.** `03/04/2024` is
3 April or 4 March and nothing in the file says which. The engine blocks with
`DATE_FORMAT_AMBIGUOUS`. A previous version hardcoded `dayfirst=True` and read
every US-format file wrong.

## 5. Output

`merge_into_workbook(..., profile=OutputProfile.KIID)` produces the house
format: `Summary` (trimmed to the headline result), `SRRI Calculations`,
`Audit & Findings`, `Past Performance` (figures plus a native Excel bar chart
built to Annex III), `PP Audit & Findings`. `OutputProfile.FULL` is the
unabridged version.

The Art. 15(5) statements are **not** in the KIID-profile workbook. They are
still required alongside the published chart and remain on
`pp_result.disclosures` — take them from there.

Build sheet contents at write time; do not delete rows from a finished
workbook. openpyxl does not re-anchor a chart or shift its `Reference` ranges
when rows move, so the chart silently ends up plotting the wrong cells.

## 6. Assumptions the engines make and cannot verify

1. **The NAV series is net of ongoing charges.** True by construction for a
   published NAV — management, depositary, administration and audit fees accrue
   daily inside the fund. No charge adjustment is applied and no OCF input is
   accepted. A gross-of-fee track record must be rejected upstream, never netted
   down here.
2. **The series is accumulating or already distribution-adjusted.** The engines
   neither fetch nor infer dividends. `EXTREME_RETURN` is the only tripwire.
3. **The series is in the share class's base currency.** See §3.

All three are recorded in the audit trail on every run.

## 7. Known gaps

- No holiday calendar. A Christmas week currently reads as a gap.
- The weekly grid is `resample("W-FRI")`. For a fund publishing on Wednesdays
  the returns are right but the workbook labels rows week-ending Friday, so the
  audit trail shows dates on which no NAV was struck.
- CESR Box 4 splicing is not implemented; funds under five years are blocked
  rather than spliced. Art. 19 simulation is declared and labelled, not
  performed.
- Structured UCITS have no past-performance section at all (Art. 36(1)). The
  engine does not detect this — do not call it for those funds.
- Template-contract validation (ISIN, metadata rows, header position) is not in
  these modules. It belongs in the validation step that runs before them.

## 8. Tests

Not included in this handover by request. They exist and are the executable
specification — every check names the article or annex paragraph it defends:

| Suite | Checks |
|---|---|
| `test_srri_engine.py` | 88 |
| `test_past_performance.py` | 184 |
| `test_returns_input.py` | 63 |

Ask for them before changing calculation logic. Several rules that look like
arbitrary constants are load-bearing, and the suites are where that is written
down.

## 9. Reconciliation status

`IE00BK5BQY34` (Vanguard FTSE Developed Europe ex UK, EUR): SRRI **5**, matching
the published KIID. Past-performance structure matches the published chart
exactly — ten slots, 2016–2018 blank, 2019 blank despite the class launching
that year. Figures sit within 0.5 pp because the test input is an exchange price
series with no 31 December observation; closing that needs an administrator NAV
file. Do not treat the figures as fully reconciled yet.
