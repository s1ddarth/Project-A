"""Header checks — pass 1 of validation.

These run against the master-data form fields, before the NAV file is opened.
They are deliberately here rather than in the frontend: validation findings are
part of what makes a published document reproducible, so they belong on the
service that can be versioned and audited (issue #18).

Findings use the same wire model as the engine's, so the frontend renders one
shape regardless of which pass produced a finding.
"""
from __future__ import annotations

import re
from typing import Optional

from models import ApiFinding

# ISO 4217 is a 3-letter uppercase alphabetic code.
_CCY_RE = re.compile(r"^[A-Z]{3}$")
# ISO 6166: 2-letter country prefix, 9 alphanumeric NSIN, 1 numeric check digit.
_ISIN_RE = re.compile(r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$")


def _finding(code: str, severity: str, message: str,
             remediation: Optional[str] = None, **detail) -> ApiFinding:
    """Header findings use their own codes; the engine's FindingCode enum covers
    NAV-file conditions only, and widening it would mean editing the engine.

    The id is assigned per response by `check_header`, so it stays stable within
    a payload without any cross-request state.
    """
    return ApiFinding(
        id="", **{"pass": "header"},
        code=code, severity=severity, message=message,
        remediation=remediation, detail=detail,
    )


def isin_is_well_formed(isin: str) -> bool:
    return bool(_ISIN_RE.match((isin or "").strip().upper()))


def isin_check_digit(isin: str) -> Optional[int]:
    """The ISO 6166 check digit for the first 11 characters, or None if the
    value is not well formed.

    Letters expand to two digits (A=10 ... Z=35), then a Luhn checksum is taken
    over the resulting digit string.
    """
    s = (isin or "").strip().upper()
    if not _ISIN_RE.match(s):
        return None
    digits = "".join(c if c.isdigit() else str(ord(c) - 55) for c in s[:-1])
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 0:                 # double every second digit from the right
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return (10 - total % 10) % 10


def isin_is_valid(isin: str) -> bool:
    expected = isin_check_digit(isin)
    if expected is None:
        return False
    return expected == int((isin or "").strip().upper()[-1])


# Fields the KIID cannot be produced without. Keyed by the frontend's field
# names so a finding can be pointed back at the input that caused it.
REQUIRED_FIELDS: dict[str, str] = {
    "subFundName": "Sub-Fund name",
    "companyName": "Sub Fund Umbrella",
    "shareClassFullName": "Share Class Full Name",
    "isin": "ISIN",
    "subFundBaseCurrency": "Sub-Fund Base Currency",
    "shareClassBaseCurrency": "Share Class Base Currency",
    "accDis": "Acc / Dis",
}

ACC_DIS_VALUES = {"Accumulating", "Distributing"}


def check_header(fields: dict) -> list[ApiFinding]:
    """Validate the master-data form fields. Returns findings, never raises."""
    out: list[ApiFinding] = []
    g = lambda k: str(fields.get(k) or "").strip()  # noqa: E731

    # --- required fields -------------------------------------------------
    for key, label in REQUIRED_FIELDS.items():
        if not g(key):
            out.append(_finding(
                "REQUIRED_FIELD_MISSING", "error",
                f"{label} is required.",
                remediation=f"Enter a value for {label}.",
                field=key, label=label,
            ))

    # --- ISIN ------------------------------------------------------------
    isin = g("isin").upper()
    if isin:
        if not isin_is_well_formed(isin):
            out.append(_finding(
                "ISIN_MALFORMED", "error",
                f"{isin!r} is not a well-formed ISIN. Expected 2 letters, "
                "9 alphanumeric characters and 1 check digit.",
                remediation="Check the ISIN against the prospectus.",
                field="isin", value=isin,
            ))
        elif not isin_is_valid(isin):
            expected = isin_check_digit(isin)
            out.append(_finding(
                "ISIN_CHECKSUM", "error",
                f"ISIN check digit does not match the expected value for {isin}.",
                remediation=(
                    f"The check digit for {isin[:11]} should be {expected}. "
                    "A mistyped ISIN would publish the document against the wrong "
                    "security."
                ),
                field="isin", value=isin, expected_check_digit=expected,
            ))

    # --- benchmark ISIN, when supplied -----------------------------------
    bench = g("benchmarkIsin").upper()
    if bench and not isin_is_valid(bench):
        out.append(_finding(
            "BENCHMARK_ISIN_INVALID", "error",
            f"Benchmark ISIN {bench} is not valid.",
            remediation="Check the benchmark ISIN or clear the field.",
            field="benchmarkIsin", value=bench,
        ))

    # --- currencies ------------------------------------------------------
    sub_ccy, sc_ccy = g("subFundBaseCurrency").upper(), g("shareClassBaseCurrency").upper()
    for key, label, value in (
        ("subFundBaseCurrency", "Sub-Fund Base Currency", sub_ccy),
        ("shareClassBaseCurrency", "Share Class Base Currency", sc_ccy),
    ):
        if value and not _CCY_RE.match(value):
            out.append(_finding(
                "CURRENCY_MALFORMED", "error",
                f"{label} {value!r} is not a 3-letter ISO 4217 code.",
                remediation="Use a 3-letter code such as EUR, USD or GBP.",
                field=key, value=value,
            ))

    # A share class denominated in something other than the fund base currency
    # is normal — that is what a currency or hedged share class is. It is only
    # worth flagging when the class is not marked as hedged, because then the
    # SRRI carries unhedged FX volatility the narrative should explain.
    if sub_ccy and sc_ccy and _CCY_RE.match(sub_ccy) and _CCY_RE.match(sc_ccy):
        if sub_ccy != sc_ccy and not bool(fields.get("hedged")):
            out.append(_finding(
                "CURRENCY_MISMATCH_UNHEDGED", "warning",
                f"Share class currency ({sc_ccy}) differs from the sub-fund base "
                f"currency ({sub_ccy}) and the class is not marked as hedged.",
                remediation=(
                    "Confirm the share class really is unhedged, and that the NAV "
                    "series uploaded is the one denominated in "
                    f"{sc_ccy} — the SRRI will include unhedged currency volatility."
                ),
                sub_fund_currency=sub_ccy, share_class_currency=sc_ccy,
            ))

    # --- Acc / Dis -------------------------------------------------------
    acc_dis = g("accDis")
    if acc_dis and acc_dis not in ACC_DIS_VALUES:
        out.append(_finding(
            "ACC_DIS_INVALID", "error",
            f"Acc / Dis must be one of {', '.join(sorted(ACC_DIS_VALUES))}; got {acc_dis!r}.",
            remediation="Select Accumulating or Distributing.",
            field="accDis", value=acc_dis,
        ))

    return [f.model_copy(update={"id": f"header-{i}"}) for i, f in enumerate(out)]
