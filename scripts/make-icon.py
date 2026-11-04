#!/usr/bin/env python3
"""Generate the 1024x1024 desktop app icon (assets/icon.png)."""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
SS = 2
S = SIZE * SS

BG_TOP = (11, 16, 23)
BG_BOTTOM = (21, 28, 37)
BLUE = (90, 162, 255)
BLUE_DEEP = (37, 99, 201)
GOLD_TOP = (255, 216, 155)
GOLD_MID = (224, 178, 92)
GOLD_LOW = (170, 111, 26)

FLAME = [
    (512, 180),
    (610, 320), (724, 400), (724, 570),
    (724, 710), (640, 820), (512, 850),
    (384, 820), (300, 710), (300, 570),
    (300, 470), (356, 392), (404, 316),
    (420, 378), (438, 438), (468, 470),
    (474, 396), (486, 300), (512, 180),
]


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(size, stops):
    image = Image.new("RGB", (1, size))
    draw = ImageDraw.Draw(image)
    for y in range(size):
        t = y / (size - 1)
        for index in range(len(stops) - 1):
            start, start_color = stops[index]
            end, end_color = stops[index + 1]
            if start <= t <= end:
                local = 0 if end == start else (t - start) / (end - start)
                draw.point((0, y), fill=lerp(start_color, end_color, local))
                break
    return image.resize((size, size), Image.BILINEAR)


def bezier(start, control1, control2, end, steps=24):
    points = []
    for step in range(steps + 1):
        t = step / steps
        mt = 1 - t
        x = (
            mt**3 * start[0]
            + 3 * mt**2 * t * control1[0]
            + 3 * mt * t**2 * control2[0]
            + t**3 * end[0]
        )
        y = (
            mt**3 * start[1]
            + 3 * mt**2 * t * control1[1]
            + 3 * mt * t**2 * control2[1]
            + t**3 * end[1]
        )
        points.append((x, y))
    return points


def flame_polygon(scale=1.0, cx=512, cy=512):
    points = []
    cursor = FLAME[0]
    index = 1
    while index < len(FLAME):
        control1, control2, end = FLAME[index], FLAME[index + 1], FLAME[index + 2]
        points.extend(bezier(cursor, control1, control2, end))
        cursor = end
        index += 3
    return [((x - cx) * scale + cx, (y - cy) * scale + cy) for x, y in points]


def scaled(points):
    return [(x * SS, y * SS) for x, y in points]


def mask_from_polygon(points, size=S):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(scaled(points), fill=255)
    return mask


def glow(mask, color, radius, alpha):
    blurred = mask.filter(ImageFilter.GaussianBlur(radius))
    layer = Image.new("RGBA", mask.size, color + (0,))
    layer.putalpha(blurred.point(lambda value: value * alpha // 255))
    return layer


def main():
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    background = vertical_gradient(S, [(0.0, BG_TOP), (1.0, BG_BOTTOM)]).convert("RGBA")
    rounded = Image.new("L", (S, S), 0)
    ImageDraw.Draw(rounded).rounded_rectangle(
        (0, 0, S - 1, S - 1), radius=220 * SS, fill=255
    )
    canvas.paste(background, (0, 0), rounded)

    blue_glow = Image.new("L", (S, S), 0)
    ImageDraw.Draw(blue_glow).ellipse(
        (-420 * SS, -420 * SS, 760 * SS, 620 * SS), fill=120
    )
    canvas.alpha_composite(glow(blue_glow, BLUE, 180 * SS, 60))

    gold_glow = Image.new("L", (S, S), 0)
    ImageDraw.Draw(gold_glow).ellipse(
        (420 * SS, 440 * SS, 1420 * SS, 1380 * SS), fill=110
    )
    canvas.alpha_composite(glow(gold_glow, GOLD_MID, 200 * SS, 55))

    outer = mask_from_polygon(flame_polygon(1.0))
    canvas.alpha_composite(glow(outer, GOLD_MID, 46 * SS, 120))

    gold_gradient = vertical_gradient(
        S, [(0.0, GOLD_TOP), (0.55, GOLD_MID), (1.0, GOLD_LOW)]
    ).convert("RGBA")
    canvas.paste(gold_gradient, (0, 0), outer)

    inner = mask_from_polygon(flame_polygon(0.44, cy=650))
    canvas.alpha_composite(glow(inner, BLUE, 26 * SS, 150))
    blue_gradient = vertical_gradient(
        S, [(0.0, (170, 214, 255)), (0.5, BLUE), (1.0, BLUE_DEEP)]
    ).convert("RGBA")
    canvas.paste(blue_gradient, (0, 0), inner)

    icon = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    output = Path(__file__).resolve().parent.parent / "assets" / "icon.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    icon.save(output, "PNG")
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
