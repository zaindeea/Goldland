#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gold Land — مولد الأيقونات من الشعار (tools/logo-source.png)
الصورة المصدر هي gl.png المرسلة: شارة GL — حرف G ذهبي على هيئة هلال
وحرف L أسود مندمج فيه، على خلفية بيضاء. لا نعيد رسم أي شيء — فقط قصّ
وتصغير وتوسيط حسب مقاس كل أصل (PWA icons / maskable / apple-touch / favicons).

لتغيير الشعار مستقبلاً: استبدل tools/logo-source.png ثم شغّل:
    python tools/make_icons.py
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(BASE)
SRC = os.path.join(BASE, "logo-source.png")

WHITE = (255, 255, 255, 255)
# عتبة اعتبار البكسل "محتوى" (خلفية الصورة بيضاء ناصعة مع ظلال رمادية فاتحة)
CONTENT_THRESHOLD = 245


def load_and_trim():
    img = Image.open(SRC).convert("RGBA")
    gray = img.convert("L")
    # قناع المحتوى: أي بكسل أغمق من العتبة (يشمل الظلال الخفيفة)
    mask = gray.point(lambda p: 255 if p < CONTENT_THRESHOLD else 0)
    bbox = mask.getbbox()
    del gray, mask
    if not bbox:
        raise SystemExit("لم يتم العثور على محتوى في الصورة المصدر!")
    pad = 8
    l, t, r, b = bbox
    l = max(0, l - pad); t = max(0, t - pad)
    r = min(img.width, r + pad); b = min(img.height, b + pad)
    img = img.crop((l, t, r, b))
    # الصورة المصدر قد تكون ضخمة (مثل 8650×8650) — نصغّرها مبكراً،
    # فأكبر مخرجات مطلوبة 1024 والدقة الزائدة لا فائدة منها
    if max(img.size) > 2048:
        s = 2048 / max(img.size)
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    return img


def content_mask(img):
    return img.convert("L").point(lambda p: 255 if p < CONTENT_THRESHOLD else 0)


def split_emblem(img, mask):
    """يفصل الشارة العلوية عن نص سفلي إن وُجد (فاصل فارغ واضح في النصف السفلي)."""
    w, h = mask.size
    px = mask.load()
    rows = []
    for y in range(h):
        rows.append(sum(1 for x in range(0, w, 4) if px[x, y] > 0))
    min_gap = max(8, h // 40)  # فاصل موثوق: لا يتحقق بسبب فراغات داخل الشارة
    best_len, best_mid, run_start = 0, None, None
    for y in range(h // 2, h):
        if rows[y] == 0:
            if run_start is None:
                run_start = y
            if y - run_start + 1 > best_len:
                best_len = y - run_start + 1
                best_mid = (run_start + y) // 2
        else:
            run_start = None
    if best_mid is None or best_len < min_gap:
        return img  # لا نص سفلي — الشارة هي الصورة كلها
    return img.crop((0, 0, w, best_mid))


def fit_paste(canvas, content, visible):
    """يصغّر المحتوى ليناسب visible من مقاس اللوحة ويوسّطه."""
    size = canvas.width
    scale = (size * visible) / max(content.size)
    w = max(1, round(content.width * scale))
    h = max(1, round(content.height * scale))
    resized = content.resize((w, h), Image.LANCZOS)
    canvas.paste(resized, ((size - w) // 2, (size - h) // 2), resized)
    return canvas


def rounded_mask(size, ratio):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=round(size * ratio), fill=255)
    return m


def render_square(content, size, visible, rounded=0.0, opaque=True):
    """لوحة مربعة: خلفية بيضاء + المحتوى موسط حسب visible.
    rounded>0 يقتصص الزوايا (أيقونات 'any')، opaque=False يجعل الخارج شفافاً."""
    canvas = Image.new("RGBA", (size, size), WHITE if opaque else (0, 0, 0, 0))
    fit_paste(canvas, content, visible)
    if rounded > 0:
        canvas.putalpha(Image.composite(canvas.getchannel("A"), Image.new("L", (size, size), 0), rounded_mask(size, rounded)))
    return canvas


def render_logo_png(lockup, height=560):
    """شعار الواجهة: قصّة محكمة للـ lockup بالكامل مع الخلفية البيضاء."""
    scale = height / lockup.height
    w = round(lockup.width * scale)
    return lockup.resize((w, height), Image.LANCZOS)


def save(img, name, **kw):
    path = os.path.join(OUT, name)
    img.save(path, **kw)
    print(f"{name:32s} {img.size[0]}x{img.size[1]}  {os.path.getsize(path)//1024} KB")


def main():
    lockup = load_and_trim()
    emblem = split_emblem(lockup, content_mask(lockup))
    print(f"المصدر بعد القص: {lockup.width}x{lockup.height} | الشارة: {emblem.width}x{emblem.height}")

    # الشعار داخل الواجهة (يُستخدم في القوائم والترويسات)
    save(render_logo_png(lockup), "logo.png")

    # أيقونات التطبيق — القفل الكامل (شارة + نص)
    save(render_square(lockup, 512, 0.84, rounded=0.185), "icon-512x512.png")
    save(render_square(lockup, 192, 0.84, rounded=0.185), "icon-192x192.png")
    save(render_square(lockup, 180, 0.86, rounded=0.0), "apple-touch-icon.png")  # iOS يقتصّ هو
    # أيقونات آمنة الاقتصاص (maskable) — المحتوى داخل المنطقة الآمنة
    save(render_square(lockup, 512, 0.58, rounded=0.0), "icon-maskable-512x512.png")
    save(render_square(lockup, 192, 0.58, rounded=0.0), "icon-maskable-192x192.png")

    # مصغّرات المتصفح — الشارة فقط (بدون نص) لتبقى مقروءة
    save(render_square(emblem, 48, 0.86, rounded=0.16), "_favicon-48.png")
    save(render_square(emblem, 32, 0.86, rounded=0.16), "favicon-32x32.png")
    save(render_square(emblem, 16, 0.88, rounded=0.16), "favicon-16x16.png")

    # علامة كبيرة مرجعية
    save(render_square(lockup, 1024, 0.90, rounded=0.0), "logo-mark-1024.png")

    ico_src = Image.open(os.path.join(OUT, "_favicon-48.png"))
    ico = Image.new("RGBA", (48, 48), WHITE)
    ico.paste(ico_src, (0, 0), ico_src)
    ico.save(os.path.join(OUT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    os.remove(os.path.join(OUT, "_favicon-48.png"))
    print("favicon.ico")


if __name__ == "__main__":
    main()
