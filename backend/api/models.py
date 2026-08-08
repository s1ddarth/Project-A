"""Wire format for the SRRI service.

One finding shape for both validation passes, so the frontend renders header
checks and NAV-file checks through the same component. `code` is a stable
machine-readable string — the UI branches on it and never parses English.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from engine import Finding as EngineFinding


class ApiFinding(BaseModel):
    """A single validation finding, from either pass."""
    id: str                       # stable within a response; React keys need one
    pass_: str = Field(..., alias="pass", serialization_alias="pass")
    code: str
    severity: str                 # error | warning | info
    message: str
    remediation: Optional[str] = None
    detail: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


def from_engine_finding(f: EngineFinding, index: int) -> ApiFinding:
    """Engine findings carry an enum code and no id; the wire format needs both."""
    return ApiFinding(
        id=f"nav-{index}",
        **{"pass": "nav"},
        code=f.code.value,
        severity=f.severity.value,
        message=f.message,
        remediation=f.remediation,
        detail=f.detail or {},
    )


class SrriPayload(BaseModel):
    """The headline numbers. `srri_disclosed` is what the document shows;
    `srri_raw` is included so the editor can explain when the Box 3 buffer is
    holding a migration back."""
    as_of_date: Optional[date] = None
    annualised_volatility: Optional[float] = None
    srri_raw: Optional[int] = None
    srri_disclosed: Optional[int] = None
    risk_description: Optional[str] = None

    input_cadence: Optional[str] = None
    input_first_date: Optional[date] = None
    input_last_date: Optional[date] = None
    input_rows: int = 0
    history_years: Optional[float] = None
    n_periods: int = 0
    n_valid_periods: int = 0


class AuditPayload(BaseModel):
    """Rule 5 — everything needed to re-derive this figure later."""
    engine_name: str
    engine_version: str
    methodology_ref: str
    calculated_at: datetime
    input_sha256: str
    input_filename: Optional[str] = None
    frequency: str
    m: int
    window: int
    annualisation: str
    date_format_resolved: str
    buffer_months: int
    min_periods: int
    min_periods_is_regulatory_default: bool


class ValidateResponse(BaseModel):
    """Envelope returned by POST /v1/srri.

    `status` is the single field the UI branches on:
      blocked          — errors present, nothing was calculated
      ok_with_warnings — a figure was produced but must be acknowledged
      ok               — clean
      awaiting_file    — header checks ran, no NAV file was supplied
      no_valid_srri    — the file was readable but never met the window
    """
    status: str
    header_findings: list[ApiFinding] = Field(default_factory=list)
    nav_findings: list[ApiFinding] = Field(default_factory=list)
    srri: Optional[SrriPayload] = None
    audit: Optional[AuditPayload] = None
