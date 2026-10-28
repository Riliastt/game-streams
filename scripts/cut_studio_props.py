"""Remove white studio backdrops from generated studio props → transparent PNGs."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

try:
    from scipy import ndimage
except ImportError:
    import subprocess
    import sys

    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'scipy', '-q'])
    from scipy import ndimage

SRC = Path(r'C:\Users\user\.cursor\projects\c-Users-user-Desktop-Game-Streams\assets')
DST = Path(r'c:\Users\user\Desktop\Game Streams\public\art\studio')

FILES = {
    'desk_1.jpg': 'prop_desk_1.png',
    'desk_2.jpg': 'prop_desk_2.png',
    'desk_3.jpg': 'prop_desk_3.png',
    'desk_4.jpg': 'prop_desk_4.png',
    'laptop_1.jpg': 'prop_laptop_1.png',
    'laptop_2.jpg': 'prop_laptop_2.png',
    'laptop_3.jpg': 'prop_laptop_3.png',
    'laptop_4.jpg': 'prop_laptop_4.png',
    'mic_1.jpg': 'prop_mic_1.png',
    'mic_2.jpg': 'prop_mic_2.png',
    'mic_3.jpg': 'prop_mic_3.png',
    'mic_4.jpg': 'prop_mic_4.png',
    'cam_1.jpg': 'prop_cam_1.png',
    'cam_2.jpg': 'prop_cam_2.png',
    'cam_3.jpg': 'prop_cam_3.png',
    'cam_4.jpg': 'prop_cam_4.png',
}


def _is_backdrop(r: int, g: int, b: int, mode: str) -> bool:
    mx = max(r, g, b)
    mn = min(r, g, b)
    avg = (r + g + b) / 3
    sat = mx - mn
    if mode == 'desk':
        # Only near-white / light gray walls — never wood beige
        return avg >= 232 and sat <= 28
    if mode == 'laptop':
        # Keep white screens: only kill backdrop if very white AND from edge flood
        return avg >= 235 and sat <= 22
    # mic / cam
    return avg >= 225 and sat <= 30


def flood_alpha(im: Image.Image, mode: str = 'prop') -> Image.Image:
    arr = np.array(im.convert('RGBA'))
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)

    def edge_bg(y: int, x: int) -> bool:
        r, g, b = map(int, rgb[y, x])
        return _is_backdrop(r, g, b, mode)

    visited = np.zeros((h, w), dtype=bool)
    stack: list[tuple[int, int]] = []
    for x in range(w):
        for y in (0, h - 1):
            if edge_bg(y, x):
                stack.append((y, x))
                visited[y, x] = True
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y, x] and edge_bg(y, x):
                stack.append((y, x))
                visited[y, x] = True

    # Flood only through similar near-white pixels
    while stack:
        y, x = stack.pop()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if ny < 0 or nx < 0 or ny >= h or nx >= w or visited[ny, nx]:
                continue
            r, g, b = map(int, rgb[ny, nx])
            if not _is_backdrop(r, g, b, mode):
                continue
            visited[ny, nx] = True
            stack.append((ny, nx))

    alpha = arr[:, :, 3].astype(np.int16)
    alpha[visited] = 0

    # Soft fringe: 1px dilate, only if still near-white
    dil = ndimage.binary_dilation(visited, iterations=1)
    fringe = dil & ~visited
    for y, x in zip(*np.where(fringe)):
        r, g, b = map(int, rgb[y, x])
        avg = (r + g + b) / 3
        sat = max(r, g, b) - min(r, g, b)
        if avg >= 210 and sat <= 35:
            alpha[y, x] = 0

    # Desks: also clear light floor under legs if connected-ish light gray
    if mode == 'desk':
        # Remove remaining pure white islands
        white = (
            (rgb[:, :, 0] >= 240)
            & (rgb[:, :, 1] >= 240)
            & (rgb[:, :, 2] >= 240)
            & (alpha > 0)
        )
        # Only clear white clusters that touch image border OR are tiny speckles
        labeled, n = ndimage.label(white)
        for i in range(1, n + 1):
            ys, xs = np.where(labeled == i)
            if ys.size == 0:
                continue
            on_border = (
                (ys == 0).any()
                or (ys == h - 1).any()
                or (xs == 0).any()
                or (xs == w - 1).any()
            )
            if on_border or ys.size < 80:
                alpha[ys, xs] = 0

    out = arr.copy()
    out[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    out[out[:, :, 3] == 0, :3] = 0
    return Image.fromarray(out)


def mode_for(name: str) -> str:
    if name.startswith('desk'):
        return 'desk'
    if name.startswith('laptop'):
        return 'laptop'
    return 'prop'


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    for src_name, out_name in FILES.items():
        p = SRC / src_name
        if not p.exists():
            print('MISSING', p)
            continue
        cut = flood_alpha(Image.open(p), mode=mode_for(src_name))
        bbox = cut.getbbox()
        if bbox:
            pad = 6
            x0, y0, x1, y1 = bbox
            cut = cut.crop(
                (
                    max(0, x0 - pad),
                    max(0, y0 - pad),
                    min(cut.width, x1 + pad),
                    min(cut.height, y1 + pad),
                )
            )
        cut.save(DST / out_name, 'PNG')
        a = np.array(cut)[:, :, 3]
        print(out_name, cut.size, f'opaque%{100 * (a > 0).mean():.1f}')
    print('done')


if __name__ == '__main__':
    main()
