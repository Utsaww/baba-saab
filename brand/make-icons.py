"""Builds the browser icons in src/app/ from brand/logo-source.jpg.

The curved slogan is cropped away (unreadable below ~64px); only the BS ring remains.
Run: python brand/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "brand" / "logo-source.jpg"
CENTRE = (349, 360)   # centre of the logo ring in the source image
RADIUS = 312          # just outside the ring, inside the slogan text
SUPERSAMPLE = 4       # draw the mask large, then shrink, for smooth edges


SLOGAN_MIN_RADIUS = 285  # slogan letters sit at least this far from the centre; the BS dots sit well inside
SLOGAN_MAX_AREA = 4000   # each slogan letter is a small blob; the ring and monogram are far larger


def without_slogan(image):
    """Paint the curved slogan black. The ring is slightly oval, so a round crop alone leaves slivers."""
    grey = image.convert("L")
    w, h = grey.size
    bright = grey.load()
    out = image.copy()
    paint = out.load()
    seen = bytearray(w * h)
    cx, cy = CENTRE
    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or bright[sx, sy] <= 60:
                continue
            blob, stack = [], [(sx, sy)]
            seen[sy * w + sx] = 1
            while stack:
                x, y = stack.pop()
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and bright[nx, ny] > 60:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            nearest = min(((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 for x, y in blob)
            if len(blob) < SLOGAN_MAX_AREA and nearest > SLOGAN_MIN_RADIUS:
                for x, y in blob:
                    paint[x, y] = (0, 0, 0)
    return out


def circular_logo(size):
    cx, cy = CENTRE
    box = (cx - RADIUS, cy - RADIUS, cx + RADIUS, cy + RADIUS)
    art = without_slogan(Image.open(SOURCE).convert("RGB")).crop(box).resize((size, size), Image.LANCZOS)
    big = size * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
    art.putalpha(mask.resize((size, size), Image.LANCZOS))
    return art


def save_png(image, path):
    # A 64-colour palette keeps the black/white/grey edges and shrinks the file.
    image.quantize(colors=64, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)


def main():
    app = ROOT / "src" / "app"
    # Browser tab icon: transparent outside the circle so it sits well on light and dark tabs.
    save_png(circular_logo(192), app / "icon.png")
    # iOS home-screen icon: iOS fills transparency with black anyway, so use a solid square.
    apple = Image.new("RGB", (180, 180), "black")
    apple.paste(circular_logo(164), (8, 8), circular_logo(164))
    apple.quantize(colors=64).save(app / "apple-icon.png", optimize=True)


if __name__ == "__main__":
    main()
