"""Build a starter answer PDF.

Atlanta: facts are pre-filled; every possible defense is listed in plain words
with an empty box. ONLY the defenses the tenant ticked themselves are marked.
The app never chooses a defense.

Lagos: a short reply letter to the landlord, filled with the tenant's facts.

Built in memory and returned as bytes. Nothing is written to disk.
"""

from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

# Plain-language defense options, adapted from the statements on Georgia
# magistrate court dispossessory answer forms.
ATLANTA_DEFENSES = [
    ("paid", "I paid the rent, or offered to pay it, and the landlord refused it."),
    ("tender", "I am offering to pay all rent owed plus court costs (tender)."),
    ("not_owed", "I do not owe the amount the landlord claims."),
    ("repairs", "The landlord did not make needed repairs, and this lowered the value of my home."),
    ("retaliation", "The landlord filed this after I complained about conditions or asked for repairs."),
    ("no_relationship", "I do not have a landlord-tenant relationship with the plaintiff."),
    ("self_help", "The landlord locked me out, removed my things, or cut my utilities without a court order."),
    ("other", "Other reason (write it below)."),
]

DISCLAIMER = ("Prepared with 7 Days, a free information tool. This is NOT legal "
              "advice and NOT an official court form. Your county may require "
              "its own form. Check with the court clerk or legal aid before filing.")


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("Small", parent=s["Normal"], fontSize=8.5,
                         textColor=colors.HexColor("#555555"), leading=11))
    s.add(ParagraphStyle("Box", parent=s["Normal"], fontSize=10.5, leading=14))
    return s


def _esc(v):
    if v is None or v == "":
        return "____________________"
    return (str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def atlanta_answer(fields: dict, tenant: dict, selected: list[str],
                   other_text: str = "", deadline: dict | None = None) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=0.8 * inch,
                            rightMargin=0.8 * inch, topMargin=0.7 * inch,
                            bottomMargin=0.7 * inch,
                            title="Dispossessory Answer (draft)")
    s = _styles()
    story = []

    story.append(Paragraph(f"IN THE {_esc(fields.get('court')).upper()}", s["Heading3"]))
    story.append(Paragraph("STATE OF GEORGIA", s["Normal"]))
    story.append(Spacer(1, 8))

    caption = Table([
        [Paragraph(f"<b>{_esc(fields.get('landlord_name'))}</b><br/>Plaintiff (landlord)", s["Normal"]),
         Paragraph(f"Case No. <b>{_esc(fields.get('case_number'))}</b>", s["Normal"])],
        [Paragraph("v.", s["Normal"]), ""],
        [Paragraph(f"<b>{_esc(tenant.get('name') or fields.get('tenant_name'))}</b><br/>Defendant (tenant)", s["Normal"]), ""],
    ], colWidths=[3.6 * inch, 3.2 * inch])
    caption.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                                 ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(caption)
    story.append(Spacer(1, 10))

    story.append(Paragraph("DISPOSSESSORY ANSWER (DRAFT)", s["Heading2"]))
    served = fields.get("served_on") or "____________"
    try:
        from datetime import date as _d
        served = _d.fromisoformat(served).strftime("%B %-d, %Y")
    except ValueError:
        pass
    due = (deadline or {}).get("deadline_label")
    line = f"I was served on <b>{_esc(served)}</b>."
    if due:
        line += f" This answer must be filed by <b>{_esc(due)}, 5:00 PM</b>."
    story.append(Paragraph(line, s["Normal"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("I am the Defendant. I state the following in response "
                           "to the Plaintiff's claim (marked boxes only):", s["Normal"]))
    story.append(Spacer(1, 6))

    chosen = set(selected or [])
    for key, text in ATLANTA_DEFENSES:
        mark = "[ X ]" if key in chosen else "[&nbsp;&nbsp;&nbsp;&nbsp;]"
        story.append(Paragraph(f"<font name='Courier'>{mark}</font>&nbsp;&nbsp;{text}", s["Box"]))
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>In my own words:</b>", s["Normal"]))
    story.append(Paragraph(_esc(other_text) if other_text else
                           "_" * 85 + "<br/><br/>" + "_" * 85, s["Normal"]))
    story.append(Spacer(1, 16))

    sig = Table([
        [Paragraph(f"{_esc(tenant.get('name') or fields.get('tenant_name'))}", s["Normal"]),
         Paragraph("______________________________", s["Normal"])],
        [Paragraph("Printed name", s["Small"]), Paragraph("Signature and date", s["Small"])],
        [Paragraph(_esc(tenant.get('address') or fields.get('property_address')), s["Normal"]),
         Paragraph(_esc(tenant.get('phone')), s["Normal"])],
        [Paragraph("Address", s["Small"]), Paragraph("Phone", s["Small"])],
    ], colWidths=[3.6 * inch, 3.2 * inch])
    story.append(sig)
    story.append(Spacer(1, 18))
    story.append(Paragraph("Each defendant must file their own answer.", s["Small"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph(DISCLAIMER, s["Small"]))

    doc.build(story)
    return buf.getvalue()


def _nice(v):
    from datetime import date as _d
    try:
        return _d.fromisoformat(v).strftime("%-d %B %Y")
    except (TypeError, ValueError):
        return v


LAGOS_DISCLAIMER = ("Prepared with 7 Days, a free information tool. This is NOT legal "
                    "advice. Ask a lawyer or legal aid to check your position.")


def lagos_letter(fields: dict, tenant: dict, check: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=inch,
                            rightMargin=inch, topMargin=inch,
                            bottomMargin=inch, title="Reply to Notice to Quit (draft)")
    s = _styles()
    nc = (check or {}).get("notice_check") or {}
    story = [
        Paragraph(_esc(tenant.get("name") or fields.get("tenant_name")), s["Normal"]),
        Paragraph(_esc(tenant.get("address") or fields.get("property_address")), s["Normal"]),
        Spacer(1, 14),
        Paragraph(f"To: {_esc(fields.get('landlord_name'))}", s["Normal"]),
        Spacer(1, 10),
        Paragraph("<b>RE: Your notice to quit dated "
                  f"{_esc(_nice(fields.get('notice_date')))}</b>", s["Normal"]),
        Spacer(1, 10),
        Paragraph("I acknowledge receipt of your notice dated "
                  f"{_esc(_nice(fields.get('notice_date')))}, which asks me to leave by "
                  f"{_esc(_nice(fields.get('vacate_by')))}.", s["Normal"]),
        Spacer(1, 8),
    ]
    if nc.get("ok") is False:
        story.append(Paragraph(
            f"The notice gives {nc.get('given_days')} days. I understand the "
            "Lagos State Tenancy Law sets a minimum notice period for my "
            "tenancy, and I ask that you confirm the notice complies with it.",
            s["Normal"]))
        story.append(Spacer(1, 8))
    story += [
        Paragraph("I also note that a tenant can only be removed from the "
                  "premises by an order of court. I will keep this notice and "
                  "all receipts, and I am seeking advice on my position.",
                  s["Normal"]),
        Spacer(1, 18),
        Paragraph("Yours faithfully,", s["Normal"]),
        Spacer(1, 28),
        Paragraph("______________________________", s["Normal"]),
        Spacer(1, 24),
        Paragraph(LAGOS_DISCLAIMER, s["Small"]),
    ]
    doc.build(story)
    return buf.getvalue()
