#!/usr/bin/env python3
"""Bake the reconstructed-coastline globes for the plate and drift labs into color textures.

Input: public/geo/reconstruction/coastlines-<age>-4k.webp (two-color masks from
bake-reconstructions.mjs: ocean #16374a, land #859779, plate outlines #c9d4ac).
Output: public/geo/reconstruction/paleo-<age>.webp, an equirectangular color map with
  - a continental shelf that fades with distance from the reconstructed coast,
  - calm land tones with gentle, smooth shading.
The coastline shapes are the data; shelf width, land tones and shading are illustrative.
Baking replaces a per-pixel shader whose derivative-based relief broke into blocks.

Needs numpy, scipy and pillow. Usage: python3 scripts/bake-paleo-globes.py
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / "public" / "geo" / "reconstruction"
W, H = 4096, 2048
KM_PER_PX = 40030 / W  # along the equator


def srgb(hexcode):
    return np.array([int(hexcode[i : i + 2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255


DEEP, SHELF = srgb("#10324a"), srgb("#3d7f8f")
LOW, MID, HIGH = srgb("#6f8a58"), srgb("#9a9468"), srgb("#b3a585")
COAST = srgb("#d9d2a8")


def sphere_noise(width, height, seed=7):
    """Smooth fractal noise sampled on the sphere, so it has no seam or polar pinch."""
    rng = np.random.default_rng(seed)
    lat = np.deg2rad(90 - (np.arange(height) + 0.5) / height * 180)[:, None]
    lon = np.deg2rad((np.arange(width) + 0.5) / width * 360 - 180)[None, :]
    p = np.stack(
        [np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat) * np.ones_like(lon)]
    )
    total = np.zeros((height, width), np.float32)
    for octave, (freq, amp) in enumerate([(2, 0.55), (4, 0.25), (9, 0.13), (20, 0.07)]):
        grid = rng.random((2 * freq + 3,) * 3).astype(np.float32)
        coords = (p + 1) * freq + 1  # into lattice index space
        total += amp * ndimage.map_coordinates(grid, coords.reshape(3, -1), order=3, mode="nearest").reshape(height, width)
    total -= total.min()
    return total / total.max()


def bake(age, relief):
    raw = np.asarray(Image.open(ROOT / f"coastlines-{age}-4k.webp").convert("RGB"), np.float32) / 255
    # Plate outlines inside the continents leave hairline gaps in the mask; close them.
    mask = ndimage.binary_closing(raw[..., 1] > 0.45, structure=np.ones((5, 5)), iterations=1)
    land = ndimage.gaussian_filter(mask.astype(np.float32), 0.8)
    land = np.clip((land - 0.5) * 3 + 0.5, 0, 1)
    # Distance from the coast in km, measured east–west on each row (scaled by latitude).
    dist = ndimage.distance_transform_edt(land < 0.5)
    rows = np.cos(np.deg2rad(90 - (np.arange(H) + 0.5) / H * 180))[:, None]
    km = dist * KM_PER_PX * np.maximum(rows, 0.2)
    shelf = np.exp(-km / 120)[..., None]
    sea = DEEP + (SHELF - DEEP) * shelf * 0.85

    h = relief
    tone = np.where(
        (h < 0.55)[..., None],
        LOW + (MID - LOW) * np.clip(h / 0.55, 0, 1)[..., None],
        MID + (HIGH - MID) * np.clip((h - 0.55) / 0.3, 0, 1)[..., None],
    )
    # Soft hillshade from the smooth relief, lit from the northwest.
    gy, gx = np.gradient(ndimage.gaussian_filter(h, 2))
    shade = np.clip(1 + (-gx + gy) * 22, 0.9, 1.08)[..., None]
    ground = tone * shade
    # A faint light rim along the reconstructed coast so the shape reads at a glance.
    rim = (ndimage.gaussian_filter(land, 2.0) * (1 - land) * 4).clip(0, 1)[..., None] * 0.35
    color = sea * (1 - land[..., None]) + ground * land[..., None]
    color = color * (1 - rim) + COAST * rim
    out = Image.fromarray((np.clip(color, 0, 1) * 255 + 0.5).astype(np.uint8))
    path = ROOT / f"paleo-{age}.webp"
    out.save(path, quality=84, method=6)
    return path.stat().st_size


def main():
    relief = sphere_noise(W, H)
    total = 0
    for age in range(10, 251, 10):
        size = bake(age, relief)
        total += size
        print(f"{age} Ma: {size / 1e3:.0f} kB")
    print(f"total {total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
