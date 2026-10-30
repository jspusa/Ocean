#!/usr/bin/env python3
"""Prepare the verified Rock Face pair offline; never write production assets.

Requires existing Pillow and NumPy. No downloads, resizing, color transforms,
normal flips, quality search, or semantic image edits are performed. Encoding is
reproducible with the Pillow/libjpeg versions recorded in the receipt.
"""

import argparse
import hashlib
import json
import platform
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "qa/parity/v01847-rock"
SIZE = (2048, 2048)
PAIR_BUDGET_BYTES = 2_215_377  # v0.18.46 production pair; not decoded GPU memory.
ASSETS = (
    ("Diffuse", "rock_face_diff_2k.jpg", "rock_diff.jpg", 88),
    ("nor_gl", "rock_face_nor_gl_2k.jpg", "rock_nor_gl.jpg", 90),
)


def digest(data, algorithm):
    return hashlib.new(algorithm, data).hexdigest()


def record(path):
    data = path.read_bytes()
    return {
        "filename": path.name,
        "bytes": len(data),
        "sha256": digest(data, "sha256"),
        "md5": digest(data, "md5"),
    }


def read_rgb(path, Image):
    with Image.open(path) as image:
        if image.format != "JPEG" or image.mode != "RGB" or image.size != SIZE:
            raise ValueError(f"Expected RGB JPEG at {SIZE}, got {path.name}: "
                             f"{image.format}/{image.mode}/{image.size}")
        if image.getexif().get(274, 1) != 1:
            raise ValueError(f"Unsupported orientation metadata: {path.name}")
        image.load()
        return image.copy()


def angular_error(source, candidate, np):
    """Compare all decoded RGB normals, normalized as runtime direction vectors.

    RGB is decoded to [-1, 1] without sRGB conversion. Work in short row blocks
    to avoid keeping two full float64 RGB images in memory. This only measures
    additional JPEG encoding error relative to the already-lossy source JPG.
    """
    errors = np.empty(SIZE[0] * SIZE[1], dtype=np.float64)
    offset = 0
    for y in range(0, SIZE[1], 64):
        box = (0, y, SIZE[0], min(y + 64, SIZE[1]))
        a = np.asarray(source.crop(box), dtype=np.float64) / 127.5 - 1.0
        b = np.asarray(candidate.crop(box), dtype=np.float64) / 127.5 - 1.0
        a /= np.linalg.norm(a, axis=-1, keepdims=True)
        b /= np.linalg.norm(b, axis=-1, keepdims=True)
        cosine = np.clip(np.sum(a * b, axis=-1), -1.0, 1.0)
        block = np.degrees(np.arccos(cosine)).ravel()
        errors[offset:offset + block.size] = block
        offset += block.size
    return {
        "reference": "decoded original JPEG, not an uncompressed scan",
        "method": "normalize(RGB / 127.5 - 1); acos(clamped dot), every pixel",
        "pixels": int(errors.size),
        "unit": "degrees",
        "mean": float(np.mean(errors)),
        "rms": float(np.sqrt(np.mean(errors * errors))),
        "p50": float(np.percentile(errors, 50)),
        "p95": float(np.percentile(errors, 95)),
        "p99": float(np.percentile(errors, 99)),
        "max": float(np.max(errors)),
        "fraction_above_5_degrees": float(np.mean(errors > 5)),
        "fraction_above_10_degrees": float(np.mean(errors > 10)),
        "interpretation": "Encoding fidelity only; visual quality still needs in-game review.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE)
    args = parser.parse_args()
    try:
        import numpy as np
        from PIL import Image, __version__ as pillow_version, features
    except ImportError as exc:
        parser.error(f"Existing Pillow and NumPy are required; nothing was installed: {exc}")

    source_dir = args.source_dir.resolve()
    output_dir = source_dir / "prepared"
    if source_dir == ROOT / "assets" or ROOT / "assets" in source_dir.parents:
        parser.error("The source directory must be outside production assets.")
    manifest_path = source_dir / "source-files.json"
    info_path = source_dir / "source-info.json"
    manifest = json.loads(manifest_path.read_text())
    info = json.loads(info_path.read_text())
    if info.get("name") != "Rock Face":
        raise ValueError("Source metadata does not identify Rock Face.")

    # Validate both source members before producing either candidate.
    sources = []
    for role, filename, output_name, quality in ASSETS:
        path = source_dir / filename
        entry = manifest[role]["2k"]["jpg"]
        expected_url = ("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/"
                        f"rock_face/{filename}")
        original = record(path)
        if entry["url"] != expected_url:
            raise ValueError(f"Unexpected provenance URL for {filename}")
        if original["bytes"] != entry["size"] or original["md5"] != entry["md5"]:
            raise ValueError(f"Source size/MD5 mismatch: {filename}")
        image = read_rgb(path, Image)
        sources.append((role, path, output_name, quality, original, entry, image))

    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for role, path, output_name, quality, original, entry, image in sources:
        candidate_path = output_dir / output_name
        encoding = {"quality": quality, "subsampling": 0,
                    "optimize": True, "progressive": False}
        image.save(candidate_path, format="JPEG", **encoding,
                   exif=b"", icc_profile=None)
        decoded = read_rgb(candidate_path, Image)
        result = {
            "role": role,
            "source": {**original, "url": entry["url"], "verified_api_md5": True},
            "candidate": {**record(candidate_path), "dimensions": list(decoded.size),
                          "mode": decoded.mode, "encoding": encoding},
            "color_interpretation": "sRGB color" if role == "Diffuse" else "linear normal data",
            "pixel_coordinates_unchanged": True,
            "normal_convention": "OpenGL +Y; no channel flips" if role == "nor_gl" else None,
            "resized": False,
            "metadata_policy": "No EXIF or ICC copied; decoded RGB values are not color transformed.",
        }
        if role == "nor_gl":
            result["angular_error"] = angular_error(image, decoded, np)
        if record(path) != original:
            raise ValueError(f"Original changed during preparation: {path.name}")
        results.append(result)

    total = sum(item["candidate"]["bytes"] for item in results)
    source_total = sum(item["source"]["bytes"] for item in results)
    receipt = {
        "schema": 1,
        "status": "prepared candidate; not installed or visually accepted",
        "tool": record(Path(__file__)),
        "environment": {"python": platform.python_version(), "pillow": pillow_version,
                        "libjpeg": features.version("jpg"), "numpy": np.__version__},
        "provenance": {
            "asset": "Rock Face", "publisher": "Poly Haven",
            "asset_url": "https://polyhaven.com/a/rock_face",
            "files_api_url": "https://api.polyhaven.com/files/rock_face",
            "info_api_url": "https://api.polyhaven.com/info/rock_face",
            "license": "CC0-1.0",
            "license_url": "https://polyhaven.com/license",
            "legal_text_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "authors": info["authors"],
            "source_dimensions_mm": info.get("dimensions"),
            "source_width_m": round(info["dimensions"][0] / 1000, 6),
            "metadata_files": [record(manifest_path), record(info_path)],
        },
        "invariants": {"same_aligned_2048_square_grid": True, "normal_flip": False,
                       "semantic_edits": False, "production_assets_written": False,
                       "fixed_encoding_runs_per_image": 1},
        "assets": results,
        "compressed_bytes": {"original_pair": source_total, "candidate_pair": total,
                             "v01846_production_pair_budget": PAIR_BUDGET_BYTES,
                             "within_budget": total <= PAIR_BUDGET_BYTES,
                             "reduction_from_source_fraction": 1.0 - total / source_total},
        "gpu_memory": {
            "dimensions_and_texture_count": "unchanged (two 2048 x 2048 textures)",
            "pair_rgba8_base_level_bytes": SIZE[0] * SIZE[1] * 4 * 2,
            "pair_rgba8_full_mip_chain_bytes": sum((SIZE[0] >> i) ** 2 * 4 * 2
                                                  for i in range(12)),
            "note": "Accounting only, not measured GPU allocation or timing; mobile downscale stays runtime-owned.",
        },
    }
    receipt_path = output_dir / "receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"receipt": str(receipt_path), "compressed_bytes": receipt["compressed_bytes"],
                      "normal_angular_error": results[1]["angular_error"]}, indent=2))


if __name__ == "__main__":
    main()
