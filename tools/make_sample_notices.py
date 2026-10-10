"""Make two printable demo props, both clearly marked SAMPLE:
  sample_notice_atlanta.pdf  - a fictional Georgia dispossessory summons
  sample_notice_lagos.pdf    - a fictional Lagos quit notice
All names, case numbers and the county are invented. Not real court papers.
"""

import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
W, H = letter


def watermark(c):
    c.saveState()
    c.setFillColor(colors.Color(0.85, 0.1, 0.1, alpha=0.18))
    c.setFont("Helvetica-Bold", 90)
    c.translate(W / 2, H / 2)
    c.rotate(35)
    c.drawCentredString(0, 0, "SAMPLE")
    c.restoreState()
    c.setFillColor(colors.HexColor("#b00020"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W / 2, 0.45 * 72,
                        "SAMPLE FOR DEMONSTRATION ONLY - NOT A REAL COURT DOCUMENT - ALL NAMES ARE FICTIONAL")
    c.setFillColor(colors.black)


def atlanta(path):
    c = canvas.Canvas(str(path), pagesize=letter)
    y = H - 72
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W / 2, y, "IN THE MAGISTRATE COURT OF SAMPLE COUNTY")
    y -= 18
    c.drawCentredString(W / 2, y, "STATE OF GEORGIA")
    y -= 36
    c.setFont("Helvetica", 11)
    c.drawString(72, y, "PEACHTREE EXAMPLE PROPERTIES LLC,")
    c.drawString(380, y, "Case No. 26-ED-SAMPLE-0419")
    y -= 15
    c.drawString(90, y, "Plaintiff,")
    y -= 22
    c.drawString(72, y, "v.")
    y -= 22
    c.drawString(72, y, "JORDAN SAMPLE and all other occupants,")
    y -= 15
    c.drawString(90, y, "Defendant.")
    y -= 15
    c.drawString(72, y, "100 Example St SW, Apt 4B, Atlanta, GA 30310")
    y -= 36

    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W / 2, y, "DISPOSSESSORY AFFIDAVIT AND SUMMONS")
    y -= 28
    c.setFont("Helvetica", 11)
    lines = [
        "Plaintiff states that Defendant is a tenant of the premises above and that",
        "Defendant has failed to pay rent which is now past due.",
        "",
        "Plaintiff demands possession of the premises and the following amounts:",
        "     Past due rent ............................................  $1,650.00",
        "     Late fees ..................................................     $200.00",
        "     TOTAL CLAIMED .........................................  $1,850.00",
        "",
        "SUMMONS TO THE DEFENDANT:",
        "You are required to answer this affidavit in writing or orally, and to file",
        "your answer with the Clerk of this Court within SEVEN (7) DAYS of the date",
        "of service. If you fail to answer, a writ of possession may issue against",
        "you without a hearing.",
    ]
    for ln in lines:
        c.drawString(72, y, ln)
        y -= 16
    y -= 20

    c.setStrokeColor(colors.black)
    c.rect(72, y - 70, W - 144, 82)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(84, y - 4, "RETURN OF SERVICE")
    c.setFont("Helvetica", 11)
    c.drawString(84, y - 24, "Served on the Defendant at the premises by tack and mail.")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(84, y - 46, "Date of service:  October 10, 2026")
    c.setFont("Helvetica", 10)
    c.drawString(84, y - 62, "Deputy: SAMPLE DEPUTY #000")
    watermark(c)
    c.save()


def lagos(path):
    c = canvas.Canvas(str(path), pagesize=letter)
    y = H - 80
    c.setFont("Helvetica", 11)
    c.drawString(72, y, "Chief Example Landlord")
    y -= 15
    c.drawString(72, y, "12 Sample Close, Surulere, Lagos")
    y -= 30
    c.drawString(72, y, "1st October, 2026")
    y -= 30
    c.drawString(72, y, "To: Mr. Tunde Sample (Yearly Tenant)")
    y -= 15
    c.drawString(72, y, "Flat 3, 12 Sample Close, Surulere, Lagos")
    y -= 36
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W / 2, y, "NOTICE TO QUIT")
    y -= 30
    c.setFont("Helvetica", 11)
    for ln in [
        "Take notice that you are required to quit and deliver up possession of",
        "the premises you occupy as yearly tenant at the above address on or",
        "before the 15th day of October, 2026.",
        "",
        "Failing which, steps will be taken to recover possession.",
    ]:
        c.drawString(72, y, ln)
        y -= 16
    y -= 30
    c.drawString(72, y, "Signed: ______________________")
    y -= 15
    c.drawString(72, y, "Chief Example Landlord")
    watermark(c)
    c.save()


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    atlanta(OUT / "sample_notice_atlanta.pdf")
    lagos(OUT / "sample_notice_lagos.pdf")
    print("wrote", OUT)
