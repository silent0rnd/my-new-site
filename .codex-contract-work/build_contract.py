import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

from extract_doc import extract_word_text


def replace_once(text, old, new):
    count = text.count(old)
    if count != 1:
        raise ValueError(f"Expected one match, found {count}: {old[:80]}")
    return text.replace(old, new, 1)


def normalize(text):
    text = text.replace("\r", "\n").replace("\x0b", "\n").replace("\x0c", "\n")
    text = text.replace("\u2014", "-").replace("\u2013", "-").replace("\u2011", "-")
    text = text.replace("\x03", "").replace("\x04", "")
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(
        r"(?<!\d)\d{1,3}(?:[ \u00a0]\d{3})+(?!\d)",
        lambda match: re.sub(r"[ \u00a0]", "\u00a0", match.group(0)),
        text,
    )
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def apply_changes(text):
    text = replace_once(
        text,
        "2.1. Исполнитель по заданию Заказчика обязуется оказать услуги, указанные в п.2.2 настоящего Договора, а Заказчик обязуется принять и оплатить указанные услуги в сроки и в порядке, определенные настоящим Договором и Приложениями к нему, каждое из которых является неотъемлемой частью настоящего Договора.",
        "2.1. По настоящему Договору Исполнитель обязуется по заданию Заказчика оказать услугу по настройке рекламных кампаний на платформе «Яндекс.Директ», а Заказчик обязуется принять и оплатить оказанную услугу в порядке и на условиях, предусмотренных настоящим Договором.",
    )
    text = replace_once(
        text,
        "2.2. Исполнитель по заданию Заказчика обязуется оказать услуги по созданию и ведению кампании контекстной рекламы в системе Яндекс Директ, по ключевым запросам, подобранным Исполнителем и согласованным с Заказчиком. Данная услуга включает в себя:",
        "2.2. Исполнитель по заданию Заказчика обязуется оказать услуги по настройке рекламных кампаний в системе Яндекс.Директ по ключевым запросам, подобранным Исполнителем и согласованным с Заказчиком. Данная услуга включает в себя:",
    )
    text = replace_once(
        text,
        "2.2.1. Создание кампании контекстной рекламы для услуг, представленных на сайте заказчика.",
        "2.2.1. Настройка рекламных кампаний для услуг, представленных на сайте Заказчика:",
    )
    text = replace_once(
        text,
        "2.2.2. Ведение рекламной кампании по контекстной рекламе:",
        "2.2.2. Сопровождение и оптимизация рекламных кампаний:",
    )
    anchor = "• оптимизация бюджета в зависимости от количества продаж, (далее - «Услуги»)."
    addition = (
        anchor
        + "\nПосле завершения настройки рекламной кампании в рекламном кабинете Заказчика Исполнитель в течение 30 (тридцати) календарных дней осуществляет сопровождение и оптимизацию кампании для обеспечения ее корректной работы. Указанное сопровождение входит в стоимость настройки рекламной кампании и не требует отдельной оплаты."
        + "\nПо истечении указанного 30-дневного срока Исполнитель продолжает оказывать услуги сопровождения и оптимизации рекламных кампаний на платной основе до момента прекращения настоящего Договора."
    )
    text = replace_once(text, anchor, addition)
    text = replace_once(
        text,
        "3.1.1. Оплата за первый месяц оказания услуг Исполнителем по настоящему Договору производится в следующем порядке:\n- 15\u00a0000 (пятнадцать тысяч) рублей выплачивается в течение 3 (трех) рабочих дней с момента подписания настоящего Договора, и в случае расторжения договора не возвращается Заказчику. Оставшаяся сумма в размере 15\u00a0000 (пятнадцать тысяч) рублей выплачивается спустя 30 календарных дней с момента запуска рекламной кампании.",
        "3.1.1. Стоимость услуги по настройке рекламной кампании составляет 30\u00a0000 (тридцать тысяч) рублей и оплачивается в следующем порядке:\n- 15\u00a000 (пятнадцать тысяч) рублей выплачивается в течение 3 (трех) рабочих дней с момента подписания настоящего Договора и в случае расторжения Договора не возвращается Заказчику;\n- оставшаяся часть стоимости настройки в размере 15\u00a0000 (пятнадцать тысяч) рублей выплачивается спустя 30 (тридцать) календарных дней с момента запуска рекламной кампании.",
    )
    text = replace_once(
        text,
        "3.1.2. Оплата за второй и последующие месяцы оказания услуг Исполнителем по настоящему Договору производится единым платежом и рассчитывается исходя из месячного рекламного бюджета Заказчика по следующей прогрессивной шкале:",
        "3.1.2. После окончания предусмотренного п. 2.2.2 настоящего Договора 30-дневного периода сопровождения услуги сопровождения и оптимизации рекламных кампаний оказываются на платной основе. Оплата производится единым платежом и рассчитывается исходя из месячного рекламного бюджета Заказчика по следующей прогрессивной шкале:",
    )
    text = replace_once(
        text,
        "3.1.2.1. По соглашению Сторон порядок расчета стоимости Услуг за второй и последующие месяцы может быть изменен.",
        "3.1.2.1. По соглашению Сторон порядок расчета стоимости платных услуг сопровождения и оптимизации после окончания предусмотренного п. 2.2.2 настоящего Договора 30-дневного периода может быть изменен.",
    )
    text = replace_once(
        text,
        "3.1.2.2 В случае если в соответствующем расчетном периоде рекламная кампания фактически осуществляла показы хотя бы в течение одного календарного дня, минимальная фиксированная стоимость Услуг Исполнителя за такой расчетный период подлежит оплате в полном размере независимо от количества календарных дней фактического размещения рекламы, в том числе если показы осуществлялись в выходной или праздничный день.",
        "3.1.2.2. После окончания предусмотренного п. 2.2.2 настоящего Договора 30-дневного периода, если в соответствующем платном расчетном периоде рекламная кампания фактически осуществляла показы хотя бы в течение одного календарного дня, минимальная фиксированная стоимость Услуг Исполнителя за такой расчетный период подлежит оплате в полном размере независимо от количества календарных дней фактического размещения рекламы, в том числе если показы осуществлялись в выходной или праздничный день.",
    )
    text = replace_once(
        text,
        "3.1.3. Оплата Услуг за второй и последующие месяцы оказания услуг производится Заказчиком на основании счета Исполнителя на условиях 100% постоплаты не позднее отчетного числа. Отчетное число - получение предоплаты за первый месяц оказания услуг.",
        "3.1.3. Оплата платных услуг сопровождения и оптимизации производится Заказчиком на основании счета Исполнителя на условиях 100% постоплаты не позднее отчетного числа. Отчетным числом является число календарного месяца, соответствующее дате окончания предусмотренного п. 2.2.2 настоящего Договора 30-дневного периода. Первый платный расчетный период начинается на следующий календарный день после окончания указанного периода. Если в соответствующем месяце отсутствует такое число, отчетным числом является последний календарный день месяца.",
    )
    text = replace_once(
        text,
        "4.2. Сроком начала Исполнителем оказания Услуг по настоящему Договору является день получения предоплаты в размере 15\u00a0000 (пятнадцать тысяч) рублей.",
        "4.2. Сроком начала оказания услуги по настройке рекламной кампании является день получения Исполнителем предоплаты в размере 15\u00a0000 (пятнадцать тысяч) рублей.",
    )
    text = replace_once(
        text,
        "4.3. Исполнитель уведомил Заказчика, что время на создание Рекламной кампании в системе контекстной рекламы Яндекс Директ составляет до 7 (семи) календарных дней с момента получения предоплаты за первый месяц оказания услуг Исполнителем.",
        "4.3. Срок настройки рекламной кампании в системе Яндекс.Директ составляет до 7 (семи) календарных дней с момента получения Исполнителем предоплаты за настройку рекламной кампании.",
    )
    text = replace_once(
        text,
        "4.4. Период ведения рекламных кампаний в Яндекс Директ составляет 30 (тридцать) календарных дней, при этом течение срока ведения Исполнителем рекламной кампании по размещению контекстной рекламы Заказчика в Яндекс Директ начинается со дня прохождения модерации рекламных объявлений в Яндекс Директ и пополнения Заказчиком баланса рекламной кампании (п.3.4 настоящего договора) на аккаунте Яндекс Директ.",
        "4.4. После завершения настройки рекламной кампании Исполнитель в течение 30 (тридцати) календарных дней осуществляет ее сопровождение и оптимизацию без дополнительной оплаты. Указанный срок исчисляется со дня прохождения модерации рекламных объявлений в системе Яндекс.Директ и пополнения Заказчиком баланса рекламной кампании в соответствии с п. 3.4 настоящего Договора.",
    )
    text = replace_once(
        text,
        "5.1.1. Оказать Услуги по размещению контекстной рекламы в соответствии с п. 2.1., 2.2. настоящего Договора, проводить консультации по вопросам, возникающим у Заказчика в связи с оказанием ему Услуг путем телефонных переговоров или переписки по электронной почте.",
        "5.1.1. Оказать услуги по настройке, сопровождению и оптимизации рекламных кампаний в соответствии с п. 2.1 и 2.2 настоящего Договора, проводить консультации по вопросам, возникающим у Заказчика в связи с оказанием Услуг, путем телефонных переговоров или переписки по электронной почте.",
    )
    return text


def set_cell_margins(cell, top=80, start=80, bottom=80, end=80):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_run_font(run, size=11, bold=False):
    run.font.name = "Times New Roman"
    run.font.size = Pt(size)
    run.font.bold = bold
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Times New Roman")
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Times New Roman")
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "Times New Roman")


def add_text_paragraph(container, text, kind="body"):
    paragraph = container.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.line_spacing = 1.0
    if kind == "heading":
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_before = Pt(8)
        paragraph.paragraph_format.space_after = Pt(5)
        run = paragraph.add_run(text)
        set_run_font(run, 11, True)
    elif kind == "title":
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_after = Pt(12)
        run = paragraph.add_run(text)
        set_run_font(run, 14, True)
    elif kind == "date":
        paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        paragraph.paragraph_format.space_after = Pt(10)
        run = paragraph.add_run(text)
        set_run_font(run, 11, False)
    elif kind == "bullet":
        paragraph.paragraph_format.left_indent = Cm(0.6)
        paragraph.paragraph_format.first_line_indent = Cm(-0.35)
        run = paragraph.add_run(text)
        set_run_font(run, 11, False)
    else:
        paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        paragraph.paragraph_format.first_line_indent = Cm(0.75)
        run = paragraph.add_run(text)
        set_run_font(run, 11, False)
    return paragraph


def build_docx(source, destination):
    text = normalize(extract_word_text(source))
    text = apply_changes(text)
    before_requisites, requisites = text.split("10. АДРЕСА И РЕКВИЗИТЫ СТОРОН", 1)

    document = Document()
    section = document.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.7)
    section.bottom_margin = Cm(1.7)
    section.left_margin = Cm(2)
    section.right_margin = Cm(1.5)

    normal = document.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(11)
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")

    lines = [line.strip() for line in before_requisites.replace("\x07", "\n").splitlines()]
    for line in lines:
        if not line:
            continue
        if line == "ДОГОВОР ВОЗМЕЗДНОГО ОКАЗАНИЯ УСЛУГ":
            add_text_paragraph(document, line, "title")
        elif re.fullmatch(r"«___» ___ 2026 г\.", line):
            add_text_paragraph(document, line, "date")
        elif re.fullmatch(r"\d+\. .+", line) and line.upper() == line:
            add_text_paragraph(document, line, "heading")
        elif line.startswith("•") or line.startswith("- "):
            add_text_paragraph(document, line, "bullet")
        else:
            add_text_paragraph(document, line, "body")

    add_text_paragraph(document, "10. АДРЕСА И РЕКВИЗИТЫ СТОРОН", "heading")
    req = normalize(requisites).replace("\x07", "\n")
    left_match = re.search(r"Заказчик\s*(.*?)\s*Исполнитель", req, re.S)
    right_match = re.search(r"Исполнитель\s*(.*?)(?:Заказчик _______________)", req, re.S)
    left_text = "Заказчик\n" + (left_match.group(1).strip() if left_match else "***")
    right_text = "Исполнитель\n" + (right_match.group(1).strip() if right_match else req.strip())

    table = document.add_table(rows=2, cols=2)
    table.autofit = False
    widths = [Cm(8.4), Cm(9.1)]
    for row in table.rows:
        for index, cell in enumerate(row.cells):
            cell.width = widths[index]
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
            set_cell_margins(cell)
    for index, content in enumerate((left_text, right_text)):
        cell = table.cell(0, index)
        cell.text = ""
        for line_index, line in enumerate(content.splitlines()):
            paragraph = cell.paragraphs[0] if line_index == 0 else cell.add_paragraph()
            paragraph.paragraph_format.space_after = Pt(2)
            run = paragraph.add_run(line.strip())
            set_run_font(run, 10, line_index == 0)
    signatures = ("Заказчик _______________", "Исполнитель _______________")
    for index, content in enumerate(signatures):
        cell = table.cell(1, index)
        cell.text = ""
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_before = Pt(10)
        run = paragraph.add_run(content)
        set_run_font(run, 10, False)

    for row in table.rows:
        for cell in row.cells:
            tc_pr = cell._tc.get_or_add_tcPr()
            borders = OxmlElement("w:tcBorders")
            for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
                tag = OxmlElement(f"w:{edge}")
                tag.set(qn("w:val"), "nil")
                borders.append(tag)
            tc_pr.append(borders)

    document.save(destination)


if __name__ == "__main__":
    build_docx(Path(sys.argv[1]), Path(sys.argv[2]))
