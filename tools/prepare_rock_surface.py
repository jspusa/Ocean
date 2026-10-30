#!/usr/bin/env python3
"""Prepare a whitelisted, verified rock pair offline; never write production assets.

Requires existing Pillow and NumPy. No downloads, tinting, normal flips, quality
search, or semantic edits are performed. The default preserves the v47 Rock Face
2048 recipe. Explicit 1536 output uses one shared Lanczos sampling grid; normal
directions are normalized, resampled as floats and renormalized. Encoding is
reproducible with the Pillow/libjpeg versions recorded in the receipt.
"""

import argparse
import hashlib
import json
import platform
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "qa/parity/v01847-rock"
SOURCE_SIZE = (2048, 2048)
PAIR_BUDGET_BYTES = 2_215_377  # v0.18.46/47 production pair; not decoded GPU memory.
SUPPORTED_ASSETS = {
    "rock_face": {"name": "Rock Face", "source_dir": DEFAULT_SOURCE},
    "rock_boulder_dry": {"name": "Rock Boulder Dry",
                         "source_dir": ROOT / "qa/parity/v01848-rock"},
}
MAPS = (
    ("Diffuse", "diff", "rock_diff.jpg", 88),
    ("nor_gl", "nor_gl", "rock_nor_gl.jpg", 90),
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


def read_rgb(path, Image, size=SOURCE_SIZE):
    with Image.open(path) as image:
        if image.format != "JPEG" or image.mode != "RGB" or image.size != size:
            raise ValueError(f"Expected RGB JPEG at {size}, got {path.name}: "
                             f"{image.format}/{image.mode}/{image.size}")
        if image.getexif().get(274, 1) != 1:
            raise ValueError(f"Unsupported orientation metadata: {path.name}")
        image.load()
        return image.copy()


def normalize_vectors(vectors, np):
    lengths = np.linalg.norm(vectors, axis=-1, keepdims=True)
    if not np.all(np.isfinite(lengths)) or np.any(lengths < 1e-12):
        raise ValueError("Invalid or degenerate normal direction; no silent fallback applied")
    return vectors / lengths


def prepare_image(source, role, size, Image, np):
    if size == SOURCE_SIZE:
        # Preserve v47's default decoded pixels and one-pass JPEG recipe.
        return source, None, {"resized": False, "normal_renormalized": False}
    processing = {
        "resized": True, "input_dimensions": list(SOURCE_SIZE),
        "output_dimensions": list(size), "filter": "Pillow Lanczos",
        "same_coordinate_grid_as_other_map": True,
        "crop_rotation_or_channel_flip": False,
    }
    if role == "Diffuse":
        return source.resize(size, Image.Resampling.LANCZOS), None, {
            **processing, "normal_renormalized": False,
            "color_processing": "Resample decoded RGB; no tint or color-space transform",
        }
    vectors = np.asarray(source, dtype=np.float32) / 127.5 - 1.0
    vectors = normalize_vectors(vectors, np)
    channels = []
    for channel in range(3):
        # Float-mode planes retain signed direction components during filtering.
        plane = Image.fromarray(vectors[:, :, channel])
        channels.append(np.asarray(plane.resize(size, Image.Resampling.LANCZOS),
                                   dtype=np.float64))
    reference = normalize_vectors(np.stack(channels, axis=-1), np)
    encoded_rgb = np.rint(np.clip(reference * 0.5 + 0.5, 0.0, 1.0) * 255).astype(np.uint8)
    reference_bytes = reference.astype("<f8", copy=False).tobytes(order="C")
    return Image.fromarray(encoded_rgb), reference, {
        **processing, "normal_renormalized": True,
        "normal_method": "Decode RGB to signed vectors, normalize, Lanczos each float component, renormalize, round to RGB8",
        "reference": "Unquantized normalized resized directions, before RGB8/JPEG encoding",
        "reference_dtype": "little-endian float64, row-major H x W x RGB",
        "reference_sha256": digest(reference_bytes, "sha256"),
        "reference_max_unit_length_error": float(np.max(np.abs(np.linalg.norm(reference, axis=-1) - 1.0))),
    }


def angular_error(source, candidate, np, resized_reference=None):
    """Compare all decoded RGB normals, normalized as runtime direction vectors.

    RGB is decoded to [-1, 1] without sRGB conversion. Work in short row blocks
    to avoid keeping two full float64 RGB images in memory. This only measures
    additional encoding error. Resized output is compared with the unquantized
    normalized resized reference, not the original scan or original 2048 grid.
    """
    width, height = candidate.size
    errors = np.empty(width * height, dtype=np.float64)
    offset = 0
    for y in range(0, height, 64):
        box = (0, y, width, min(y + 64, height))
        a = (np.asarray(source.crop(box), dtype=np.float64) / 127.5 - 1.0
             if resized_reference is None else resized_reference[y:box[3]])
        b = np.asarray(candidate.crop(box), dtype=np.float64) / 127.5 - 1.0
        a = normalize_vectors(a, np)
        b = normalize_vectors(b, np)
        cosine = np.clip(np.sum(a * b, axis=-1), -1.0, 1.0)
        block = np.degrees(np.arccos(cosine)).ravel()
        errors[offset:offset + block.size] = block
        offset += block.size
    return {
        "reference": ("decoded original JPEG, not an uncompressed scan" if resized_reference is None else
                      "normalized resized float-direction reference, before RGB8/JPEG encoding; not original-scan equivalence"),
        "method": ("normalize(RGB / 127.5 - 1); acos(clamped dot), every pixel" if resized_reference is None else
                   "Normalize decoded candidate RGB / 127.5 - 1; acos(clamped dot) versus normalized resized reference, every output pixel"),
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
        "interpretation": "Encoding fidelity only; visual quality still needs in-game review."
                          + (" This excludes resizing loss relative to the source scan." if resized_reference is not None else ""),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", choices=tuple(SUPPORTED_ASSETS), default="rock_face")
    parser.add_argument("--output-size", type=int, choices=(1536, 2048), default=2048)
    parser.add_argument("--source-dir", type=Path)
    args = parser.parse_args()
    try:
        import numpy as np
        from PIL import Image, __version__ as pillow_version, features
    except ImportError as exc:
        parser.error(f"Existing Pillow and NumPy are required; nothing was installed: {exc}")

    asset_info = SUPPORTED_ASSETS[args.asset]
    size = (args.output_size, args.output_size)
    source_dir = (args.source_dir or asset_info["source_dir"]).resolve()
    output_dir = source_dir / "prepared"
    if source_dir == ROOT / "assets" or ROOT / "assets" in source_dir.parents:
        parser.error("The source directory must be outside production assets.")
    manifest_path = source_dir / "source-files.json"
    info_path = source_dir / "source-info.json"
    manifest = json.loads(manifest_path.read_text())
    info = json.loads(info_path.read_text())
    if info.get("name") != asset_info["name"]:
        raise ValueError(f"Source metadata does not identify {asset_info['name']}.")

    # Validate both source members before producing either candidate.
    sources = []
    for role, suffix, output_name, quality in MAPS:
        filename = f"{args.asset}_{suffix}_2k.jpg"
        path = source_dir / filename
        entry = manifest[role]["2k"]["jpg"]
        expected_url = ("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/"
                        f"{args.asset}/{filename}")
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
        prepared, reference, processing = prepare_image(image, role, size, Image, np)
        prepared.save(candidate_path, format="JPEG", **encoding, exif=b"", icc_profile=None)
        decoded = read_rgb(candidate_path, Image, size)
        result = {
            "role": role,
            "source": {**original, "url": entry["url"], "verified_api_md5": True},
            "candidate": {**record(candidate_path), "dimensions": list(decoded.size),
                          "mode": decoded.mode, "encoding": encoding},
            "color_interpretation": "sRGB color" if role == "Diffuse" else "linear normal data",
            "pixel_coordinates_unchanged": size == SOURCE_SIZE,
            "normalized_uv_alignment_unchanged": True,
            "normal_convention": "OpenGL +Y; no channel flips" if role == "nor_gl" else None,
            "resized": size != SOURCE_SIZE,
            "processing": processing,
            "metadata_policy": "No EXIF or ICC copied; decoded RGB values are not color transformed.",
        }
        if role == "nor_gl":
            result["angular_error"] = angular_error(image, decoded, np, reference)
        if record(path) != original:
            raise ValueError(f"Original changed during preparation: {path.name}")
        results.append(result)

    total = sum(item["candidate"]["bytes"] for item in results)
    source_total = sum(item["source"]["bytes"] for item in results)
    receipt = {
        "schema": 2,
        "status": "prepared candidate; not installed or visually accepted",
        "tool": record(Path(__file__)),
        "environment": {"python": platform.python_version(), "pillow": pillow_version,
                        "libjpeg": features.version("jpg"), "numpy": np.__version__},
        "recipe": {"asset": args.asset, "source_size": list(SOURCE_SIZE),
                   "output_size": list(size), "default_v47_recipe_preserved": args.asset == "rock_face" and size == SOURCE_SIZE},
        "provenance": {
            "asset": asset_info["name"], "publisher": "Poly Haven",
            "asset_url": f"https://polyhaven.com/a/{args.asset}",
            "files_api_url": f"https://api.polyhaven.com/files/{args.asset}",
            "info_api_url": f"https://api.polyhaven.com/info/{args.asset}",
            "license": "CC0-1.0",
            "license_url": "https://polyhaven.com/license",
            "legal_text_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "authors": info["authors"],
            "source_dimensions_mm": info.get("dimensions"),
            "source_width_m": round(info["dimensions"][0] / 1000, 6),
            "metadata_files": [record(manifest_path), record(info_path)],
        },
        "invariants": {"same_aligned_2048_square_grid": size == SOURCE_SIZE,
                       "same_aligned_output_grid": True, "output_dimensions": list(size), "normal_flip": False,
                       "semantic_edits": False, "production_assets_written": False,
                       "fixed_encoding_runs_per_image": 1},
        "assets": results,
        "compressed_bytes": {"original_pair": source_total, "candidate_pair": total,
                             "v01846_production_pair_budget": PAIR_BUDGET_BYTES,
                             "within_budget": total <= PAIR_BUDGET_BYTES,
                             "reduction_from_source_fraction": 1.0 - total / source_total},
        "gpu_memory": {
            "dimensions_and_texture_count": ("unchanged (two 2048 x 2048 textures)" if size == SOURCE_SIZE else
                                             f"reduced (two {size[0]} x {size[1]} textures)"),
            "within_current_2048_dimensions": max(size) <= 2048,
            "pair_rgba8_base_level_bytes": size[0] * size[1] * 4 * 2,
            "pair_rgba8_full_mip_chain_bytes": sum((size[0] >> i) ** 2 * 4 * 2
                                                  for i in range(size[0].bit_length())),
            "note": "Accounting only, not measured GPU allocation or timing; mobile downscale stays runtime-owned. Both 1536 and 2048 candidates still downscale to 1024 in the existing non-full path.",
        },
    }
    receipt_path = output_dir / "receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"receipt": str(receipt_path), "compressed_bytes": receipt["compressed_bytes"],
                      "normal_angular_error": results[1]["angular_error"]}, indent=2))


if __name__ == "__main__":
    main()
