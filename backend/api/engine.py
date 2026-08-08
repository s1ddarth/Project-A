"""Import shim for the SRRI engine.

`srri_engine.py` lives in a sibling directory and is imported, never modified or
reimplemented (rule 4). Its own test suite adds that directory to `sys.path` the
same way, so this mirrors an existing convention rather than inventing one.

Import engine names from here so there is exactly one place that knows where the
engine lives.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ENGINE_DIR = Path(__file__).resolve().parent.parent / "srri_engine"
if str(_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(_ENGINE_DIR))

from srri_engine import (  # noqa: E402,F401
    ENGINE_NAME,
    ENGINE_VERSION,
    METHODOLOGY_REF,
    DateFormat,
    Finding,
    Frequency,
    ResultStatus,
    SRRIInputError,
    SRRIResult,
    Severity,
    export_workbook,
    run,
)

__all__ = [
    "ENGINE_NAME", "ENGINE_VERSION", "METHODOLOGY_REF",
    "DateFormat", "Finding", "Frequency", "ResultStatus",
    "SRRIInputError", "SRRIResult", "Severity",
    "export_workbook", "run",
]
