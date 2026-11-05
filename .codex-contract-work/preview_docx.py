import sys
from pathlib import Path

import pypdfium2 as pdfium
from docx import Document
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib import colors


def esc(value):
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")


def build_preview(docx_path, pdf_path, png_dir):
    pdfmetrics.registerFont(TTFont("Times", r"C:\Windows\Fonts\times.ttf"))
    pdfmetrics.registerFont(TTFont("Times-Bold", r"C:\Windows\Fonts\timesbd.ttf"))
    styles = getSampleStyleSheet()
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Times", fontSize=11, leading=13, alignment=TA_JUSTIFY, firstLineIndent=0.75 * cm, spaceAfter=3)
    bullet = ParagraphStyle("Bullet", parent=body, firstLineIndent=-0.35 * cm, leftIndent=0.6 * cm)
    heading = ParagraphStyle("Heading", parent=body, fontName="Times-Bold", alignment=TA_CENTER, firstLineIndent=0, spaceBefore=8, spaceAfter=5)
    title = ParagraphStyle("Title", parent=heading, fontSize=14, leading=17, spaceAfter=12)
    date = ParagraphStyle("Date", parent=body, alignment=TA_RIGHT, firstLineIndent=0, spaceAfter=10)
    small = ParagraphStyle("Small", parent=body, fontSize=9.5, leading=11, firstLineIndent=0)

    story = []
    doc = Document(docx_path)
    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue
        if text == "ДОГОВОР ВОЗМЕЗДНОГО ОКАЗАНИЯ УСЛУГ":
            style = title
        elif text.startswith("«___»"):
            style = date
        elif text[:1].isdigit() and text.upper() == text and ". " in text:
            style = heading
        elif text.startswith(("•", "- ")):
            style = bullet
        else:
            style = body
        story.append(Paragraph(esc(text), style))

    if doc.tables:
        table_data = []
        for row in doc.tables[0].rows:
            table_data.append([Paragraph(esc(cell.text), small) for cell in row.cells])
        table = Table(table_data, colWidths=[8.4 * cm, 9.1 * cm], repeatRows=0)
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LINEABOVE", (0, 0), (-1, -1), 0, colors.white),
        ]))
        story.append(Spacer(1, 6))
        story.append(table)

    preview = SimpleDocTemplate(str(pdf_path), pagesize=A4, leftMargin=2 * cm, rightMargin=1.5 * cm, topMargin=1.7 * cm, bottomMargin=1.7 * cm)
    preview.build(story)

    png_dir.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(pdf_path))
    for index, page in enumerate(pdf):
        bitmap = page.render(scale=1.8)
        bitmap.to_pil().save(png_dir / f"page-{index + 1}.png")
    print(f"pages={len(pdf)}")


if __name__ == "__main__":
    build_preview(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
