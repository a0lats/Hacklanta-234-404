"""One-page summary to hand to legal aid.

Everything a lawyer asks first, on one page: the deadline, the court and case
number, the amount, what the tenant ticked themselves, and the things to check.
Built in memory and returned as bytes. Nothing is written to disk.
"""

from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from answer_pdf import ATLANTA_DEFENSES, _esc, _nice, _styles

RENT_PERIODS = {"weekly": "Every week", "monthly": "Every month", "quarterly": "Every 3 months",
                "half_yearly": "Every 6 months", "yearly": "Every year"}

LAGOS_FORCE = [
    ("locks", "Landlord changed the locks or locked me out"),
    ("things", "Landlord removed my things, doors, windows or roof"),
    ("threats", "Landlord threatened me or sent people to force me out"),
]

NOTE = ("Made with 7 Days, a free information tool. This is NOT legal advice. "
        "The tenant filled this in and checked it against their paper. Nothing was saved.")


def _blank(v):
    return _esc(v) if v not in (None, "") else "<font color='#888888'>Not given</font>"


def _facts_table(rows, s):
    t = Table([[Paragraph(f"<b>{k}</b>", s["Box"]), Paragraph(v, s["Box"])] for k, v in rows],
              colWidths=[2.1 * inch, 4.7 * inch])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#d5dce6")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def summary_pdf(fields: dict, extras: dict, check: dict, selected: list[str],
                own_words: str = "", tenant: dict | None = None,
                lagos_force: dict | None = None) -> bytes:
    tenant = tenant or {}
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=0.8 * inch, rightMargin=0.8 * inch,
                            topMargin=0.6 * inch, bottomMargin=0.6 * inch,
                            title="Summary for legal aid")
    s = _styles()
    lagos = fields.get("jurisdiction") == "lagos"
    story = [Paragraph("Summary for legal aid", s["Heading1"]),
             Paragraph("Please read this first. It has the key dates and facts from my paper.", s["Normal"]),
             Spacer(1, 10)]

    # The one thing that matters most goes in a highlighted box at the top.
    if lagos:
        nc = (check or {}).get("notice_check") or {}
        given, req = nc.get("given_days"), nc.get("required_days")
        head = f"Notice gives <b>{_esc(given)} days</b> to leave"
        if nc.get("ok") is False and req:
            head += f". Minimum may be <b>{req} days</b> for this rent period (if the agreement doesn't set its own)."
        elif nc.get("ok"):
            head += ". This looks long enough for the rent period."
    else:
        d = (check or {}).get("deadline") or {}
        if d.get("status") == "missed":
            head = f"<b>The 7-day answer deadline may have passed</b> ({_esc(d.get('deadline_label'))}, 5:00 PM)."
        elif d.get("deadline_label"):
            head = f"Answer due by <b>{_esc(d['deadline_label'])}, 5:00 PM</b>"
            if d.get("days_left") is not None and d.get("status") == "open":
                head += f" ({d['days_left']} day{'s' if d['days_left'] != 1 else ''} left)"
            elif d.get("status") == "due_today":
                head += " (TODAY)"
        else:
            head = "<b>Date served is missing</b>, so the deadline could not be worked out."
    box = Table([[Paragraph(head, s["Box"])]], colWidths=[6.8 * inch])
    box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff6c2")),
                             ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#15233f")),
                             ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                             ("LEFTPADDING", (0, 0), (-1, -1), 10)]))
    story += [box, Spacer(1, 12)]

    if lagos:
        rows = [
            ("Notice date", _blank(_nice(fields.get("notice_date")))),
            ("Leave by", _blank(_nice(fields.get("vacate_by")))),
            ("Rent paid", _blank(RENT_PERIODS.get(extras.get("rent_period")))),
            ("Landlord", _blank(fields.get("landlord_name"))),
            ("Tenant", _blank(tenant.get("name") or fields.get("tenant_name"))),
            ("Property", _blank(fields.get("property_address"))),
        ]
    else:
        amount = fields.get("amount_claimed")
        rows = [
            ("Date served", _blank(_nice(fields.get("served_on")))),
            ("Court", _blank(fields.get("court"))),
            ("Case number", _blank(fields.get("case_number"))),
            ("Amount claimed", _blank(f"${amount:,.2f}" if amount else None)),
            ("Monthly rent", _blank(f"${extras['monthly_rent']:,.2f}" if extras.get("monthly_rent") else None)),
            ("Landlord", _blank(fields.get("landlord_name"))),
            ("Tenant", _blank(tenant.get("name") or fields.get("tenant_name"))),
            ("Property", _blank(fields.get("property_address"))),
            ("Locked out / utilities cut", "Yes" if extras.get("locked_out") or extras.get("utilities_cut") else "No"),
        ]
    if tenant.get("phone"):
        rows.append(("Phone", _esc(tenant["phone"])))
    story += [_facts_table(rows, s), Spacer(1, 12)]

    if lagos:
        force = lagos_force or {}
        if any(v is not None for v in force.values()):
            story.append(Paragraph("What the landlord has done", s["Heading3"]))
            for key, text in LAGOS_FORCE:
                v = force.get(key)
                ans = "Yes" if v else "No" if v is False else "Not answered"
                story.append(Paragraph(f"{text}: <b>{ans}</b>", s["Box"]))
            story.append(Spacer(1, 10))
    else:
        story.append(Paragraph("What I ticked myself", s["Heading3"]))
        chosen = [t for k, t in ATLANTA_DEFENSES if k in set(selected or [])]
        if chosen:
            for t in chosen:
                story.append(Paragraph(f"&bull; {_esc(t)}", s["Box"]))
        else:
            story.append(Paragraph("Nothing ticked yet.", s["Box"]))
        story.append(Spacer(1, 10))

    if own_words:
        story += [Paragraph("In my own words", s["Heading3"]), Paragraph(_esc(own_words), s["Box"]),
                  Spacer(1, 10)]

    cards = [c for c in (check or {}).get("cards", []) if c.get("level") in ("red", "amber")]
    if cards:
        story.append(Paragraph("Things the app flagged to check", s["Heading3"]))
        for c in cards:
            story.append(Paragraph(f"&bull; <b>{_esc(c['title'])}.</b> {_esc(c['body'])}", s["Box"]))
        story.append(Spacer(1, 10))

    story += [Spacer(1, 6), Paragraph(NOTE, s["Small"])]
    doc.build(story)
    return buf.getvalue()
