"""'Things to check' cards. Plain rules, no AI. Every card is information,
never advice: it says what MAY apply and points to legal aid.

Card shape: {"id", "level": "red"|"amber"|"info", "title", "body"}
"""

from __future__ import annotations

from deadline import answer_deadline, parse_iso
from lagos import check_quit_notice
from datetime import date


def _card(cid, level, title, body):
    return {"id": cid, "level": level, "title": title, "body": body}


def atlanta_cards(fields: dict, extras: dict, today: date | None = None) -> dict:
    cards = []
    deadline = None

    if fields.get("served_on"):
        d = answer_deadline(parse_iso(fields["served_on"]), today=today)
        deadline = d.to_dict()
        if d.status == "missed":
            cards.append(_card(
                "deadline_missed", "red",
                "Your 7 days may have passed",
                "Contact legal aid or the court clerk today. Ask what options "
                "are still open. Do not wait."))
        elif d.status == "due_today":
            cards.append(_card(
                "due_today", "red", "Your answer is due TODAY by 5:00 PM",
                "File today: online, at the courthouse, or with help from legal aid."))
        if d.moved:
            cards.append(_card("deadline_moved", "info",
                               "Your deadline was moved", d.moved_reason))
        if not d.holiday_list_verified:
            cards.append(_card(
                "holiday_unverified", "amber", "Double-check this date",
                "Our holiday list for this year is not confirmed. Call the "
                "court clerk to confirm your deadline."))
    else:
        cards.append(_card(
            "no_service_date", "red", "We need the date you were served",
            "Look for the date the sheriff or marshal wrote on the paper. "
            "Your 7 days start from that date."))

    if fields.get("reason") == "nonpayment":
        cards.append(_card(
            "pay_to_end", "amber", "You may be able to pay to end this case",
            "In Georgia, a tenant may be able to stop a nonpayment case by "
            "paying all the rent owed plus court costs. There are limits on "
            "how often this can be used. Ask legal aid if this applies to you."))

    rent = extras.get("monthly_rent")
    amount = fields.get("amount_claimed")
    if rent and amount and amount > rent * 1.5:
        months = amount / rent
        cards.append(_card(
            "amount_high", "amber", "Check the amount they claim",
            f"They claim ${amount:,.2f}, about {months:.1f} months of your "
            f"rent. Compare every fee with your lease and your receipts."))

    if extras.get("locked_out") or extras.get("utilities_cut"):
        cards.append(_card(
            "self_help", "red", "Lockouts and utility shut-offs",
            "In Georgia, a landlord must go through court to remove a tenant. "
            "Changing locks or cutting utilities without a court order is not "
            "allowed. Tell legal aid right away."))

    cards.append(_card(
        "answer_counts", "info", "Filing an answer gets you a hearing",
        "If you file an answer on time, the court sets a hearing date. If you "
        "don't, the landlord can ask the court to remove you without one."))

    return {"jurisdiction": "atlanta", "deadline": deadline, "cards": cards}


def lagos_cards(fields: dict, extras: dict) -> dict:
    cards = []
    result = None
    if fields.get("notice_date") and fields.get("vacate_by") and extras.get("rent_period"):
        result = check_quit_notice(parse_iso(fields["notice_date"]),
                                   parse_iso(fields["vacate_by"]),
                                   extras["rent_period"])
        if result["ok"] is False:
            cards.append(_card(
                "notice_too_short", "amber", "This notice may be too short",
                f"It gives you {result['given_days']} days. For your rent "
                f"period the law may require at least {result['required_days']} "
                "days. Ask a lawyer or legal aid to check."))
        if not result["verified"]:
            cards.append(_card(
                "lagos_unverified", "amber", "Rules not yet confirmed",
                "These Lagos notice periods are still being checked. Confirm "
                "with a lawyer before relying on them."))
    else:
        cards.append(_card(
            "need_dates", "red", "We need two dates and your rent period",
            "The date on the notice, the date it says to leave, and how often "
            "you pay rent (monthly, yearly...)."))

    cards.append(_card(
        "court_order", "info", "Only a court can remove you",
        "A landlord should not force you out, change locks or remove your "
        "things without a court order. Keep every notice you receive."))
    return {"jurisdiction": "lagos", "notice_check": result, "cards": cards}


def run_checks(fields: dict, extras: dict | None = None,
               today: date | None = None) -> dict:
    extras = extras or {}
    if fields.get("jurisdiction") == "lagos":
        return lagos_cards(fields, extras)
    return atlanta_cards(fields, extras, today=today)
