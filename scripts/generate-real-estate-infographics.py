from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "blog"
W, H = 1536, 1152
BG, WHITE, INK, MUTED, ORANGE, PALE, LINE = "#FAFAF8", "#FFFFFF", "#171B20", "#6D7177", "#FF6A00", "#FFF0E5", "#ECEDEA"
FONT = Path("C:/Windows/Fonts/arialbd.ttf")

def font(size):
    return ImageFont.truetype(str(FONT), size)

def center(draw, box, text, size, fill=INK):
    f = font(size)
    l, t, r, b = draw.textbbox((0, 0), text, font=f)
    x = box[0] + (box[2] - box[0] - (r - l)) / 2
    y = box[1] + (box[3] - box[1] - (b - t)) / 2 - 8
    draw.text((x, y), text, font=f, fill=fill)

def shadowed_card(base, xy, radius=34):
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((xy[0], xy[1] + 14, xy[2], xy[3] + 14), radius, fill=(23, 27, 32, 30))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(shadow)
    ImageDraw.Draw(base).rounded_rectangle(xy, radius, fill=WHITE, outline=LINE, width=2)

def title(draw, headline, subline):
    center(draw, (80, 64, W - 80, 150), headline, 58)
    center(draw, (80, 154, W - 80, 202), subline, 27, MUTED)

def footer(draw, text):
    f = font(25)
    l, _, r, _ = draw.textbbox((0, 0), text, font=f)
    x1, x2 = (W - (r - l)) / 2 - 150, (W + (r - l)) / 2 + 150
    draw.line((x1 - 115, 1065, x1, 1065), fill=ORANGE, width=5)
    draw.line((x2, 1065, x2 + 115, 1065), fill=ORANGE, width=5)
    draw.text(((W - (r - l)) / 2, 1046), text, font=f, fill=INK)

def icon_house(draw, cx, cy):
    draw.polygon([(cx-68, cy-5), (cx, cy-65), (cx+68, cy-5)], fill=ORANGE)
    draw.rounded_rectangle((cx-52, cy-5, cx+52, cy+70), 9, fill=INK)
    draw.rectangle((cx-12, cy+31, cx+12, cy+70), fill=WHITE)

def icon_key(draw, cx, cy):
    draw.ellipse((cx-60, cy-50, cx+8, cy+18), outline=INK, width=16)
    draw.line((cx, cy+4, cx+73, cy+77), fill=INK, width=16)
    draw.line((cx+43, cy+47, cx+67, cy+23), fill=ORANGE, width=16)
    draw.line((cx+60, cy+64, cx+84, cy+40), fill=ORANGE, width=16)

def icon_building(draw, cx, cy):
    draw.rounded_rectangle((cx-54, cy-70, cx+54, cy+72), 12, fill=INK)
    for y in (-40, 0, 40):
        for x in (-25, 8): draw.rounded_rectangle((cx+x, cy+y, cx+x+16, cy+y+18), 3, fill=WHITE)
    draw.rectangle((cx-9, cy+42, cx+10, cy+72), fill=ORANGE)

def icon_arrows(draw, cx, cy):
    draw.rounded_rectangle((cx-62, cy-26, cx+12, cy+30), 12, fill=INK)
    draw.polygon([(cx+4, cy-60), (cx+80, cy+2), (cx+4, cy+64)], fill=ORANGE)
    draw.polygon([(cx-15, cy-60), (cx-89, cy+2), (cx-15, cy+64)], fill=INK)

def structure():
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)
    title(d, "Структура рекламы недвижимости", "Разделяйте спрос, объекты и бюджет")
    cards = [(96, 296, 402, 840), (430, 296, 736, 840), (764, 296, 1070, 840), (1098, 296, 1404, 840)]
    labels = [("Новостройки", icon_house), ("Вторичка", icon_key), ("Trade-in", icon_arrows), ("Коммерция", icon_building)]
    for box, (label, icon) in zip(cards, labels):
        shadowed_card(img, box)
        icon(d, (box[0]+box[2])//2, 470)
        center(d, (box[0]+18, 610, box[2]-18, 680), label, 34)
        center(d, (box[0]+24, 700, box[2]-24, 754), "Отдельная кампания", 22, MUTED)
    footer(d, "Управляйте каждым направлением отдельно")
    return img

def funnel():
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)
    title(d, "Воронка аналитики", "От клика до сделки")
    labels = ["Клик", "Заявка", "Квалификация", "Показ", "Сделка"]
    xs = [72, 367, 662, 957, 1252]
    for idx, (x, label) in enumerate(zip(xs, labels)):
        box = (x, 355, x+212, 800)
        shadowed_card(img, box)
        cx = x + 106
        if idx == 0:
            d.polygon([(cx-38, 450), (cx+42, 496), (cx+5, 506), (cx+33, 552), (cx+10, 566), (cx-20, 519), (cx-42, 545)], fill=ORANGE)
        elif idx == 1:
            d.rounded_rectangle((cx-45, 437, cx+45, 558), 12, fill=INK); d.rectangle((cx-23, 470, cx+24, 479), fill=WHITE); d.rectangle((cx-23, 496, cx+14, 505), fill=WHITE)
        elif idx == 2:
            d.ellipse((cx-36, 435, cx+36, 507), fill=INK); d.line((cx-58, 566, cx, 507, cx+58, 566), fill=ORANGE, width=15)
        elif idx == 3: icon_house(d, cx, 486)
        else:
            d.line((cx-47, 505, cx-10, 542, cx+55, 448), fill=INK, width=19); d.line((cx-47, 505, cx-10, 542), fill=ORANGE, width=7)
        center(d, (x+12, 635, x+200, 700), label, 27)
        if idx < 4:
            ax = x + 225
            d.polygon([(ax, 564), (ax+46, 564), (ax+46, 548), (ax+76, 577), (ax+46, 606), (ax+46, 590), (ax, 590)], fill=ORANGE)
    footer(d, "Оптимизируйте по качественным действиям")
    return img

def search_rsya():
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)
    title(d, "Поиск и РСЯ для недвижимости", "Два сценария работы со спросом")
    cards = [(152, 310, 700, 850), (836, 310, 1384, 850)]
    data = [("Поиск", "Сформированный спрос", ["Горячий запрос", "Точный объект", "Быстрый лид"]), ("РСЯ", "Поиск аудитории", ["Охват", "Прогрев", "Возврат"])]
    for box, (heading, sub, chips) in zip(cards, data):
        shadowed_card(img, box, 42)
        center(d, (box[0], 366, box[2], 424), heading, 46)
        center(d, (box[0], 442, box[2], 490), sub, 26, MUTED)
        for i, chip in enumerate(chips):
            y = 540 + i * 84
            d.rounded_rectangle((box[0]+108, y, box[2]-108, y+57), 22, fill=PALE, outline=ORANGE, width=2)
            center(d, (box[0]+110, y+4, box[2]-110, y+57), chip, 24)
    d.rounded_rectangle((579, 913, 957, 991), 26, fill=WHITE, outline=ORANGE, width=3)
    center(d, (579, 921, 957, 985), "Работают вместе", 27, ORANGE)
    return img

def save(image, stem, webp=False):
    rgb = image.convert("RGB")
    if webp: rgb.save(OUT / f"{stem}.webp", "WEBP", quality=86, method=6)
    else: rgb.save(OUT / f"{stem}.jpg", "JPEG", quality=91, optimize=True)

if __name__ == "__main__":
    save(structure(), "yandex-direct-nedvizhimost-1-structure")
    save(funnel(), "yandex-direct-nedvizhimost-2-funnel")
    save(search_rsya(), "yandex-direct-nedvizhimost-3-search-rsya")
    save(structure(), "yandex-direct-nedvizhimost", webp=True)
