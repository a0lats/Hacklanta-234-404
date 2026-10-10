"""Deadline math for a Georgia eviction (dispossessory) answer.

Rule (as written by Georgia magistrate courts, e.g. Clayton County):
  - The tenant has 7 days from the date they were served to file an answer.
  - The 7 days INCLUDE weekends and holidays.
  - If the 7th day falls on a weekend or legal holiday, the deadline moves to
    5:00 PM on the next business day.

Plain Python, no AI. This is the one calculation the app must never get wrong.

Holiday list: Georgia state holidays, from georgia.gov ("Georgia State
Holidays 2026"). Courts follow the state holiday calendar. UPDATE THIS LIST
EVERY YEAR - only 2026 is fully verified here.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta

ANSWER_DAYS = 7
DEADLINE_TIME = "5:00 PM"

# Source: https://georgia.gov/georgia-state-holidays-2026
GA_STATE_HOLIDAYS = {
    date(2026, 1, 1): "New Year's Day",
    date(2026, 1, 19): "Martin Luther King Jr.'s Birthday",
    date(2026, 4, 3): "State Holiday",
    date(2026, 5, 25): "Memorial Day",
    date(2026, 6, 19): "Juneteenth",
    date(2026, 7, 3): "Independence Day (observed)",
    date(2026, 9, 7): "Labor Day",
    date(2026, 10, 12): "Columbus Day",
    date(2026, 11, 11): "Veterans Day",
    date(2026, 11, 26): "Thanksgiving Day",
    date(2026, 11, 27): "State Holiday",
    date(2026, 12, 24): "Washington's Birthday (observed)",
    date(2026, 12, 25): "Christmas Day",
    # 2027: only partly published so far. Verify before relying on these.
    date(2027, 1, 1): "New Year's Day",
    date(2027, 1, 18): "Martin Luther King Jr.'s Birthday",
}

KNOWN_HOLIDAY_YEARS = {2026}


def is_business_day(d: date) -> bool:
    return d.weekday() < 5 and d not in GA_STATE_HOLIDAYS


def _why_closed(d: date) -> str:
    if d in GA_STATE_HOLIDAYS:
        return GA_STATE_HOLIDAYS[d]
    return "Saturday" if d.weekday() == 5 else "Sunday"


@dataclass
class Deadline:
    served_on: str          # ISO date the tenant was served
    seventh_day: str        # ISO date of day 7
    deadline: str           # ISO date answer is due
    deadline_time: str      # always "5:00 PM"
    deadline_label: str     # "Monday, October 19, 2026"
    days_left: int          # whole days from today until the deadline date
    status: str             # "open" | "due_today" | "missed"
    moved: bool             # True if day 7 fell on a weekend/holiday
    moved_reason: str | None
    holiday_list_verified: bool  # False if a date falls outside verified years

    def to_dict(self) -> dict:
        return asdict(self)


def answer_deadline(served_on: date, today: date | None = None) -> Deadline:
    """Compute the answer deadline from the service date."""
    today = today or date.today()
    seventh = served_on + timedelta(days=ANSWER_DAYS)

    due = seventh
    moved_reason = None
    while not is_business_day(due):
        if moved_reason is None:
            moved_reason = (
                f"Day 7 ({seventh.strftime('%a %b %-d')}) is "
                f"{_why_closed(seventh)}, so the deadline moves to the next "
                "business day."
            )
        due += timedelta(days=1)

    days_left = (due - today).days
    if days_left < 0:
        status = "missed"
    elif days_left == 0:
        status = "due_today"
    else:
        status = "open"

    verified = all(
        d.year in KNOWN_HOLIDAY_YEARS for d in (served_on, seventh, due)
    )

    return Deadline(
        served_on=served_on.isoformat(),
        seventh_day=seventh.isoformat(),
        deadline=due.isoformat(),
        deadline_time=DEADLINE_TIME,
        deadline_label=due.strftime("%A, %B %-d, %Y"),
        days_left=days_left,
        status=status,
        moved=due != seventh,
        moved_reason=moved_reason,
        holiday_list_verified=verified,
    )


def parse_iso(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()
