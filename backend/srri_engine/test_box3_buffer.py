"""test_box3_buffer.py — CESR/10-673 Box 3 migration buffer.

Why this file exists
--------------------
`test_srri_engine.py` §3 covers the buffer, and all 88 of its checks pass against
both the pre-3.0.0 implementation and the current one. That is the problem: the
two implementations *agree* on every case it exercises, so the pack was silent on
exactly the behaviour 3.0.0 changed.

Run side by side, old and new differ like this:

    clean 4-month run to one class    old == new
    flapping between old and new      old == new
    straddles two new buckets         old holds the stale class, new migrates
    volatility rises 4 -> 5 -> 6      old holds 4 then jumps, new goes to 6

The old test was `all(win == cur)`: every reference point in the window had to
equal the *same* new class. That is strictly stronger than Box 3 §2, which asks
only that volatility has fallen *outside the previous category* at each point.
Under the old rule a fund whose volatility had risen from band 4 through 5 into 6
kept disclosing 4 — understating risk indefinitely.

These checks are written against the text of Box 3, not against current output, so
they fail if the old behaviour returns and they do not simply ratify whatever the
code happens to do today.

Box 3 as implemented
--------------------
§2 TRIGGER   revise only if volatility fell outside the previous category at EACH
             reference point over the preceding 4 months. One reading back at the
             old class resets.
§3 SELECTION once triggered, take the bucket matched for the MAJORITY of those
             reference points.
HOUSE RULE   §3 is silent on ties; ties resolve to the HIGHER risk class — where
             the regulation does not decide, disclose the greater risk.
"""
from __future__ import annotations

import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).parent))

from srri_engine import (  # noqa: E402
    BUFFER_MONTHS_DEFAULT, ENGINE_VERSION, _buffer_core, apply_buffer_zone,
)

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f"  — {detail}" if detail and not cond else ""))


def monthly(values, start="2020-01-31"):
    """A clean month-end series of disclosed-SRRI candidates."""
    idx = pd.date_range(start, periods=len(values), freq="ME")
    return pd.Series([float(v) for v in values], index=idx)


def disclosed(values, buffer=BUFFER_MONTHS_DEFAULT, start="2020-01-31"):
    return [int(x) for x in _buffer_core(monthly(values, start), buffer)]


def legacy_buffer(s, buffer_months):
    """The pre-3.0.0 implementation, kept ONLY as a regression tripwire.

    Not a reference implementation — it is the bug. If a change makes the engine
    agree with this on the straddle cases below, the Box 3 §2/§3 fix has been
    reverted.
    """
    vals = s.to_numpy(dtype=float)
    out = np.full(len(vals), np.nan)
    for i, cur in enumerate(vals):
        if i == 0:
            out[i] = cur
            continue
        prev = out[i - 1]
        if cur == prev:
            out[i] = prev
            continue
        win = vals[max(0, i - buffer_months + 1): i + 1]
        out[i] = cur if (len(win) >= buffer_months and bool(np.all(win == cur))) else prev
    return pd.Series(out, index=s.index)


print(f"\nCESR/10-673 Box 3 — migration buffer   (engine {ENGINE_VERSION})")

# ======================================================================
print("\n1. §2 TRIGGER — departure from the previous category")

out = disclosed([4, 4, 4, 4, 5, 5, 5, 5, 5, 5])
check("1.a sustained departure migrates once the window is satisfied",
      out[-1] == 5, f"got {out}")

out = disclosed([4, 4, 4, 5, 4, 5, 4, 5, 4, 5])
check("1.b one reading back at the old class resets the trigger",
      set(out) == {4}, f"got {out}")

# Box 3 §2 is 'each reference point over the preceding 4 months', so a departure
# shorter than the window must not migrate however large the jump.
out = disclosed([3, 3, 3, 3, 3, 3, 7, 7])
check("1.c a departure shorter than 4 months does not migrate",
      out[-1] == 3, f"got {out}")

out = disclosed([5, 5, 5, 5, 4, 4, 4, 4, 4, 4])
check("1.d the rule is symmetric — a fall migrates too",
      out[-1] == 4, f"got {out}")

# ======================================================================
print("\n2. §3 SELECTION — majority bucket across the window")

# The case the old pack never covered: volatility leaves band 4 and straddles
# 5 and 6 without ever returning. §2 is satisfied (4 never reappears), so §3
# picks the majority.
out = disclosed([4, 4, 4, 4, 5, 5, 6, 5, 5, 5])
check("2.a straddling two new buckets migrates to the majority",
      out[-1] == 5, f"got {out}")

out = disclosed([4, 4, 4, 4, 6, 6, 5, 6, 6, 6])
check("2.b majority is counted, not the latest reading",
      out[-1] == 6, f"got {out}")

# The regulation is silent here; the house convention is documented in
# _buffer_core and disclosing the greater risk is the conservative reading.
out = disclosed([4, 4, 4, 4, 5, 6, 5, 6])
check("2.c a tie resolves to the HIGHER risk class",
      out[-1] == 6, f"got {out}")

out = disclosed([6, 6, 6, 6, 5, 4, 5, 4])
check("2.d a tie on the way down also resolves higher",
      out[-1] == 5, f"got {out}")

# ======================================================================
print("\n3. Regression — the pre-3.0.0 bug must not return")

straddle = monthly([4, 4, 4, 4, 5, 6, 5, 6, 5, 6])
new_out = [int(x) for x in _buffer_core(straddle, 4)]
old_out = [int(x) for x in legacy_buffer(straddle, 4)]
check("3.a old implementation held the stale class (evidence of the bug)",
      set(old_out) == {4}, f"legacy gave {old_out}")
check("3.b current implementation migrates instead of holding",
      new_out[-1] != 4, f"got {new_out}")
check("3.c current implementation disagrees with the legacy one here",
      new_out != old_out)

rising = monthly([4, 4, 4, 5, 5, 6, 6, 6, 6, 6])
new_r = [int(x) for x in _buffer_core(rising, 4)]
old_r = [int(x) for x in legacy_buffer(rising, 4)]
check("3.d rising 4->5->6: legacy understated risk for longer",
      old_r.index(6) > new_r.index(6) if 6 in old_r and 6 in new_r else False,
      f"legacy {old_r} vs current {new_r}")
check("3.e understating risk is the failure mode being fixed",
      new_r[-1] == 6 and old_r.count(4) > new_r.count(4),
      f"legacy {old_r} vs current {new_r}")

# Both implementations must still agree where Box 3 is unambiguous, otherwise
# the fix has changed more than it should have.
for name, vals in [("clean run", [4, 4, 4, 4, 5, 5, 5, 5, 5, 5]),
                   ("flapping", [4, 4, 4, 5, 4, 5, 4, 5, 4, 5])]:
    s = monthly(vals)
    check(f"3.f unchanged where Box 3 is unambiguous — {name}",
          [int(x) for x in _buffer_core(s, 4)] == [int(x) for x in legacy_buffer(s, 4)])

# ======================================================================
print("\n4. The window is 4 CALENDAR MONTHS, not 4 data points")

# On a weekly grid, 4 months is ~17 reference points. A fixed 4-point window
# would migrate after a month, which Box 3 does not permit.
idx = pd.date_range("2020-01-03", periods=40, freq="W-FRI")
vals = [4.0] * 20 + [5.0] * 20
s = pd.Series(vals, index=idx)
out = [int(x) for x in _buffer_core(s, 4)]
first_five = out.index(5) if 5 in out else -1
elapsed_days = (idx[first_five] - idx[20]).days if first_five >= 0 else -1
check("4.a weekly grid migrates only after ~4 calendar months",
      first_five >= 0 and elapsed_days >= 110,
      f"migrated after {elapsed_days} days")
check("4.b weekly grid does not migrate after merely 4 points",
      first_five > 23, f"migrated at index {first_five}, band changed at 20")

# Month-end anchors are unevenly spaced; a naive DateOffset from 30 Nov lands on
# 30 Jul and pulls the 31 Jul point in, giving a 5-point window.
me = pd.date_range("2020-01-31", periods=12, freq="ME")
s = pd.Series([4.0] * 6 + [5.0] * 6, index=me)
out = [int(x) for x in _buffer_core(s, 4)]
check("4.c month-end anchors do not drag in an extra reference point",
      out.count(5) == 3, f"got {out}")

# ======================================================================
print("\n5. apply_buffer_zone — condensation and forward fill")

weekly_idx = pd.date_range("2020-01-03", periods=60, freq="W-FRI")
raw = pd.Series([np.nan] * 10 + [4.0] * 25 + [5.0] * 25, index=weekly_idx)
out = apply_buffer_zone(raw, BUFFER_MONTHS_DEFAULT)
check("5.a NaN prefix is dropped, not buffered over",
      out.notna().sum() > 0 and out.dropna().iloc[0] == 4.0)
check("5.b result is aligned back onto the calculation grid",
      len(out) == len(raw) and out.index.equals(raw.index))
check("5.c an empty series is handled without raising",
      len(apply_buffer_zone(pd.Series(dtype=float), 4)) == 0)

all_nan = pd.Series([np.nan] * 12, index=pd.date_range("2020-01-31", periods=12, freq="ME"))
check("5.d an all-NaN series yields no disclosed value",
      apply_buffer_zone(all_nan, 4).isna().all())

# ======================================================================
print("\n" + "=" * 70)
print(f"  {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    for f in FAIL:
        print(f"    FAILED: {f}")
print("=" * 70)
sys.exit(1 if FAIL else 0)
