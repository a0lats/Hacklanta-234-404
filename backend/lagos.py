"""Lagos notice-period check.

!!! NOT YET VERIFIED. Olu must check these against the Lagos State Tenancy
Law 2011 (the Act itself, not a blog) before the pitch, then set VERIFIED = True.

Shape of the rule we encode (to be confirmed):
  1. A "notice to quit" whose minimum length depends on how often rent is paid.
  2. Then a separate 7-day notice of the owner's intention to recover possession.
  3. Only a court order can remove a tenant (no forced eviction).
"""

from __future__ import annotations

from datetime import date

VERIFIED = False

# Minimum notice-to-quit length, in days, by rent period. CONFIRM EACH VALUE.
MIN_NOTICE_DAYS = {
    "weekly": 7,
    "monthly": 30,
    "quarterly": 90,
    "half_yearly": 90,
    "yearly": 180,
}

OWNER_INTENTION_NOTICE_DAYS = 7


def check_quit_notice(notice_date: date, vacate_by: date, rent_period: str) -> dict:
    required = MIN_NOTICE_DAYS.get(rent_period)
    given = (vacate_by - notice_date).days
    if required is None:
        return {"ok": None, "given_days": given, "required_days": None,
                "verified": VERIFIED}
    return {"ok": given >= required, "given_days": given,
            "required_days": required, "verified": VERIFIED}
