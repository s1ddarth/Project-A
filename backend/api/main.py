"""FastAPI service wrapping the SRRI engine.

The engine is imported and called, never reimplemented (rule 4). This module
owns HTTP concerns only: multipart parsing, the wire format, and CORS.

Endpoints
    GET  /health              liveness + engine version
    POST /v1/srri             header checks + SRRI from an uploaded NAV file
    POST /v1/srri/workbook    the audit workbook for the same upload

Both POSTs are stateless: nothing is stored between calls, so a result cannot
go stale and there is no session to lose. The workbook endpoint re-accepts the
file rather than keying off a server-side id — the browser already holds the
File object, and PROJECT_CONTEXT section 3 wants the demo path to accept,
validate, calculate, return and discard.
"""
from __future__ import annotations

import json
import logging
import os

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from engine import (
    ENGINE_NAME,
    ENGINE_VERSION,
    METHODOLOGY_REF,
    DateFormat,
    Frequency,
    ResultStatus,
    SRRIInputError,
    Severity,
    export_workbook,
    run,
)
from header_checks import check_header
from models import (
    ApiFinding,
    AuditPayload,
    SrriPayload,
    ValidateResponse,
    from_engine_finding,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("srri_api")

# Vite dev server by default; override in deployment.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

# A NAV history is a two-column series; anything much larger is not one.
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))

app = FastAPI(
    title="SRRI service",
    version=ENGINE_VERSION,
    description="UCITS KIID SRRI calculation (CESR/10-673) and input validation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "engine_name": ENGINE_NAME,
        "engine_version": ENGINE_VERSION,
        "methodology_ref": METHODOLOGY_REF,
    }


def _parse_enum(raw: str, enum, label: str):
    try:
        return enum(raw)
    except ValueError:
        allowed = ", ".join(e.value for e in enum)
        raise HTTPException(422, f"Invalid {label} {raw!r}. Expected one of: {allowed}.")


async def _read_upload(file: UploadFile) -> bytes:
    raw = await file.read()
    if not raw:
        raise HTTPException(422, "The uploaded file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            413, f"File is {len(raw):,} bytes; the limit is {MAX_UPLOAD_BYTES:,}."
        )
    return raw


def _run_engine(raw: bytes, filename: str, frequency: str, date_format: str):
    """Call the engine, converting only genuinely unreadable input into HTTP."""
    freq = _parse_enum(frequency, Frequency, "frequency")
    fmt = _parse_enum(date_format, DateFormat, "date_format")
    try:
        return run(raw, freq, date_format=fmt, filename=filename)
    except SRRIInputError as exc:
        # Not recoverable into findings — the bytes are not a price series.
        raise HTTPException(
            422,
            detail={
                "code": exc.finding.code.value,
                "severity": exc.finding.severity.value,
                "message": exc.finding.message,
                "remediation": exc.finding.remediation,
            },
        )


@app.post("/v1/srri", response_model=ValidateResponse)
async def validate_and_calculate(
    header: str = Form(
        "{}",
        description="JSON object of master-data form fields for the header checks.",
    ),
    frequency: str = Form("auto", description="auto | weekly | monthly"),
    date_format: str = Form("dmy", description="dmy | mdy | iso | auto"),
    file: UploadFile | None = File(
        None, description="NAV history (.xlsx/.xls/.csv/.txt). Optional."
    ),
) -> ValidateResponse:
    """Run both validation passes and, when a file is supplied, the SRRI.

    The file is optional so the header form can be checked before the user has
    a NAV file to hand — which is how the validation page already behaves.
    """
    try:
        fields = json.loads(header) if header else {}
        if not isinstance(fields, dict):
            raise ValueError
    except ValueError:
        raise HTTPException(422, "`header` must be a JSON object.")

    header_findings = check_header(fields)
    header_blocked = any(f.severity == "error" for f in header_findings)

    if file is None:
        return ValidateResponse(
            status="blocked" if header_blocked else "awaiting_file",
            header_findings=header_findings,
        )

    raw = await _read_upload(file)
    result = _run_engine(raw, file.filename or "upload", frequency, date_format)

    # `run()` resolves the frequency in both validate() and calculate(), and each
    # appends to the same list, so FREQUENCY_AUTO_SELECTED arrives twice. Showing
    # a user the same sentence twice is a UI bug, so collapse exact duplicates
    # here. Fixing the double-append belongs in the engine, which this service
    # does not modify.
    seen: set[tuple[str, str]] = set()
    nav_findings: list[ApiFinding] = []
    for f in result.findings:
        key = (f.code.value, f.message)
        if key in seen:
            continue
        seen.add(key)
        nav_findings.append(from_engine_finding(f, len(nav_findings)))

    # A header error blocks even when the file itself is clean: the figure would
    # be attached to the wrong share class.
    if header_blocked or result.status is ResultStatus.BLOCKED:
        status = "blocked"
    elif result.status is ResultStatus.NO_VALID_SRRI:
        status = "no_valid_srri"
    elif any(f.severity is Severity.WARNING for f in result.findings) or any(
        f.severity == "warning" for f in header_findings
    ):
        status = "ok_with_warnings"
    else:
        status = "ok"

    srri = None
    audit = None
    if status != "blocked":
        srri = SrriPayload(
            as_of_date=result.as_of_date,
            annualised_volatility=result.annualised_volatility,
            srri_raw=result.srri_raw,
            srri_disclosed=result.srri_disclosed,
            risk_description=result.risk_description,
            input_cadence=result.input_cadence.value if result.input_cadence else None,
            input_first_date=result.input_first_date,
            input_last_date=result.input_last_date,
            input_rows=result.input_rows,
            history_years=result.history_years,
            n_periods=result.n_periods,
            n_valid_periods=result.n_valid_periods,
        )
        a = result.audit
        audit = AuditPayload(
            engine_name=a.engine_name,
            engine_version=a.engine_version,
            methodology_ref=a.methodology_ref,
            calculated_at=a.calculated_at,
            input_sha256=a.input_sha256,
            input_filename=a.input_filename,
            frequency=a.frequency.value,
            m=a.m,
            window=a.window,
            annualisation=a.annualisation,
            date_format_resolved=a.date_format_resolved.value,
            buffer_months=a.buffer_months,
            min_periods=a.min_periods,
            min_periods_is_regulatory_default=a.min_periods_is_regulatory_default,
        )

    log.info(
        "srri status=%s sha=%s srri=%s file=%s",
        status, result.audit.input_sha256[:12], result.srri_disclosed, file.filename,
    )
    return ValidateResponse(
        status=status,
        header_findings=header_findings,
        nav_findings=nav_findings,
        srri=srri,
        audit=audit,
    )


@app.post("/v1/srri/workbook")
async def workbook(
    frequency: str = Form("auto"),
    date_format: str = Form("dmy"),
    file: UploadFile = File(..., description="The same NAV file that was validated."),
) -> Response:
    """The Summary / Calculations / Distribution / Methodology / Audit workbook.

    A genuine audit artifact derived from the result, not the result itself —
    it should be attached to the published document as evidence.
    """
    raw = await _read_upload(file)
    result = _run_engine(raw, file.filename or "upload", frequency, date_format)
    if result.status is ResultStatus.BLOCKED:
        raise HTTPException(
            422, "The NAV file has blocking errors; no workbook was produced."
        )

    xlsx = export_workbook(result)
    stem = (file.filename or "nav").rsplit(".", 1)[0][:60]
    return Response(
        content=xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{stem}-srri-calculation.xlsx"',
            # So the browser can name the download and show provenance.
            "X-Engine-Version": result.audit.engine_version,
            "X-Input-Sha256": result.audit.input_sha256,
        },
    )
