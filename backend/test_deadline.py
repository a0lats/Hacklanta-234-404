from datetime import date

from deadline import answer_deadline


def test_plain_weekday():
    # Served Mon Oct 12? no - served Tue Oct 13 -> day 7 Tue Oct 20 (business day)
    d = answer_deadline(date(2026, 10, 13), today=date(2026, 10, 13))
    assert d.deadline == "2026-10-20"
    assert d.moved is False
    assert d.days_left == 7


def test_demo_case_served_friday_lands_on_friday():
    # Served Fri Oct 9 -> day 7 Fri Oct 16, a business day
    d = answer_deadline(date(2026, 10, 9), today=date(2026, 10, 10))
    assert d.deadline == "2026-10-16"
    assert d.days_left == 6


def test_day7_saturday_moves_to_monday():
    # Served Sat Oct 10 -> day 7 Sat Oct 17 -> Mon Oct 19
    d = answer_deadline(date(2026, 10, 10), today=date(2026, 10, 13))
    assert d.seventh_day == "2026-10-17"
    assert d.deadline == "2026-10-19"
    assert d.moved is True
    assert "Saturday" in d.moved_reason
    assert d.deadline_label == "Monday, October 19, 2026"


def test_day7_sunday_moves_to_monday():
    d = answer_deadline(date(2026, 10, 11))
    assert d.seventh_day == "2026-10-18"
    assert d.deadline == "2026-10-19"


def test_day7_columbus_day_moves_to_tuesday():
    # Served Mon Oct 5 -> day 7 Mon Oct 12 (Columbus Day, GA state holiday)
    d = answer_deadline(date(2026, 10, 5), today=date(2026, 10, 5))
    assert d.seventh_day == "2026-10-12"
    assert d.deadline == "2026-10-13"
    assert "Columbus Day" in d.moved_reason


def test_thanksgiving_chain_rolls_past_weekend():
    # Served Thu Nov 19 -> day 7 Thu Nov 26 (Thanksgiving), Fri 27 state
    # holiday, Sat, Sun -> Mon Nov 30
    d = answer_deadline(date(2026, 11, 19))
    assert d.deadline == "2026-11-30"


def test_christmas_chain():
    # Served Thu Dec 17 -> day 7 Thu Dec 24 (holiday), Fri 25 (holiday),
    # Sat, Sun -> Mon Dec 28
    d = answer_deadline(date(2026, 12, 17))
    assert d.deadline == "2026-12-28"


def test_weekends_count_inside_the_seven_days():
    # Served Wed Oct 14 -> day 7 Wed Oct 21. The weekend in between counts.
    d = answer_deadline(date(2026, 10, 14))
    assert d.deadline == "2026-10-21"


def test_status_missed_and_due_today():
    assert answer_deadline(date(2026, 10, 1), today=date(2026, 10, 20)).status == "missed"
    assert answer_deadline(date(2026, 10, 13), today=date(2026, 10, 20)).status == "due_today"


def test_unverified_year_flagged():
    d = answer_deadline(date(2027, 3, 1))
    assert d.holiday_list_verified is False
