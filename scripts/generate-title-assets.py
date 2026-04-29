from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
FONT_PATH = "/System/Library/Fonts/AppleSDGothicNeo.ttc"


TITLE_ASSETS = [
    {
        "text": "북룸",
        "file": "title-bookroom.png",
        "ink": (13, 63, 44, 255),
        "cream": (245, 225, 172, 255),
        "accent": (0, 139, 116, 255),
        "spray": (9, 92, 73, 150),
        "font_size": 158,
        "seed": 11,
    },
    {
        "text": "독서생활",
        "file": "title-reading-life.png",
        "ink": (14, 62, 43, 255),
        "cream": (246, 225, 171, 255),
        "accent": (139, 166, 127, 255),
        "spray": (64, 113, 87, 150),
        "font_size": 122,
        "seed": 22,
    },
    {
        "text": "책가게",
        "file": "title-bookstore.png",
        "ink": (27, 38, 31, 255),
        "cream": (248, 204, 151, 255),
        "accent": (151, 104, 55, 255),
        "spray": (129, 80, 42, 145),
        "font_size": 132,
        "seed": 33,
    },
]


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size=size)


def text_bbox(text: str, title_font: ImageFont.FreeTypeFont) -> tuple[int, int, int, int]:
    scratch = Image.new("RGBA", (10, 10))
    draw = ImageDraw.Draw(scratch)
    return draw.textbbox((0, 0), text, font=title_font, stroke_width=0)


def draw_spray(draw: ImageDraw.ImageDraw, rng: random.Random, cx: int, cy: int, w: int, h: int, color: tuple[int, int, int, int]):
    for _ in range(180):
        angle = rng.uniform(0, math.tau)
        radius_x = rng.gauss(w * 0.34, w * 0.13)
        radius_y = rng.gauss(h * 0.28, h * 0.12)
        x = int(cx + math.cos(angle) * radius_x + rng.uniform(-24, 24))
        y = int(cy + math.sin(angle) * radius_y + rng.uniform(-18, 18))
        dot = rng.choice([2, 2, 3, 4, 5])
        alpha = rng.randint(28, color[3])
        draw.ellipse((x, y, x + dot, y + dot), fill=(color[0], color[1], color[2], alpha))


def draw_drips(draw: ImageDraw.ImageDraw, rng: random.Random, x0: int, baseline: int, width: int, ink: tuple[int, int, int, int]):
    for _ in range(9):
        x = x0 + rng.randint(20, max(22, width - 20))
        length = rng.randint(14, 48)
        line_width = rng.randint(4, 8)
        alpha = rng.randint(125, 210)
        y1 = baseline + rng.randint(-3, 15)
        y2 = y1 + length
        draw.line((x, y1, x + rng.randint(-4, 5), y2), fill=(ink[0], ink[1], ink[2], alpha), width=line_width)
        r = max(3, line_width - 1)
        draw.ellipse((x - r, y2 - r, x + r, y2 + r), fill=(ink[0], ink[1], ink[2], alpha))


def draw_fast_stroke(draw: ImageDraw.ImageDraw, rng: random.Random, x0: int, y: int, width: int, accent: tuple[int, int, int, int], cream: tuple[int, int, int, int]):
    points = []
    for i in range(8):
        t = i / 7
        x = x0 + int(width * t)
        wave = math.sin(t * math.pi * 1.2) * 10
        points.append((x, int(y + wave + rng.uniform(-4, 4))))
    draw.line(points, fill=(accent[0], accent[1], accent[2], 220), width=10, joint="curve")
    draw.line([(x + 16, yy + 14) for x, yy in points[:-1]], fill=(cream[0], cream[1], cream[2], 190), width=4)


def render(asset: dict[str, object]) -> None:
    scale = 2
    canvas_w, canvas_h = 1280 * scale, 380 * scale
    rng = random.Random(asset["seed"])
    title_font = font(int(asset["font_size"]) * scale)
    text = str(asset["text"])
    ink = asset["ink"]
    cream = asset["cream"]
    accent = asset["accent"]
    spray = asset["spray"]

    image = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    bbox = text_bbox(text, title_font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (canvas_w - text_w) // 2
    y = int(canvas_h * 0.17)
    if text == "북룸":
        y += 12 * scale
    if text == "독서생활":
        y += 18 * scale

    cx = canvas_w // 2
    cy = y + text_h // 2

    draw_spray(draw, rng, cx, cy + 10 * scale, text_w, text_h, spray)

    for dx, dy, alpha in [(-18, 12, 130), (16, -10, 105), (24, 18, 80)]:
        draw.text(
            (x + dx * scale, y + dy * scale),
            text,
            font=title_font,
            fill=(accent[0], accent[1], accent[2], alpha),
            stroke_width=7 * scale,
            stroke_fill=(cream[0], cream[1], cream[2], max(50, alpha - 35)),
        )

    draw.text(
        (x, y),
        text,
        font=title_font,
        fill=ink,
        stroke_width=14 * scale,
        stroke_fill=cream,
    )
    draw.text(
        (x - 3 * scale, y - 3 * scale),
        text,
        font=title_font,
        fill=ink,
        stroke_width=3 * scale,
        stroke_fill=(255, 255, 255, 110),
    )

    # White cut strokes add an urban sprayed-letter feel without hurting Korean legibility.
    for _ in range(6):
        sx = x + rng.randint(20, max(24, text_w - 40))
        sy = y + rng.randint(32, max(36, text_h - 18))
        draw.line(
            (sx, sy, sx + rng.randint(30, 80) * scale, sy + rng.randint(-5, 7) * scale),
            fill=(255, 255, 255, 185),
            width=rng.randint(4, 7) * scale,
        )

    underline_y = y + text_h + 42 * scale
    underline_w = int(text_w * rng.uniform(0.78, 0.92))
    underline_x = (canvas_w - underline_w) // 2 + rng.randint(-18, 18) * scale
    draw_fast_stroke(draw, rng, underline_x, underline_y, underline_w, accent, cream)
    draw_drips(draw, rng, x, y + text_h - 6 * scale, text_w, ink)

    # Slight angle and crop-safe padding.
    image = image.rotate(-1.8, resample=Image.Resampling.BICUBIC, expand=False)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=115, threshold=3))
    image = image.resize((1280, 380), Image.Resampling.LANCZOS)
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        pad = 20
        crop_box = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(image.width, bbox[2] + pad),
            min(image.height, bbox[3] + pad),
        )
        image = image.crop(crop_box)

    out = ASSETS / str(asset["file"])
    image.save(out)
    print(out)


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    for asset in TITLE_ASSETS:
        render(asset)


if __name__ == "__main__":
    main()
