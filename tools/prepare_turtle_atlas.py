"""Prepare the reviewed, original v50 color atlas without repainting its pixels.

Requires Pillow. Source is the retained built-in imagegen output; conversion is
whole-image RGB, uniform Lanczos resize, and JPEG 4:4:4 encoding only.
"""
from pathlib import Path
import argparse
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_HASH = '6e7d655ce1767532a3345b755db71b74efd88092683d399d5e68c66629b1cbe7'
RECTS = {
    'carapace': [0, 0, 512, 588], 'plastron': [512, 0, 512, 588],
    'head': [0, 588, 512, 436], 'front': [512, 588, 512, 171],
    'rear': [512, 759, 512, 126], 'tail': [512, 885, 512, 139],
}


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'docs/assets/v01850/turtle-atlas-muted-original.png')
    parser.add_argument('--output', type=Path, default=ROOT/'assets/turtle_atlas_v50.jpg')
    parser.add_argument('--receipt', type=Path, default=ROOT/'qa/parity/v01850-turtle-atlas/preparation-final.json')
    args = parser.parse_args()
    if digest(args.source) != SOURCE_HASH:
        raise ValueError('Source differs from the reviewed imagegen output')
    with Image.open(args.source) as source:
        source_size = source.size
        if source_size != (1254, 1254):
            raise ValueError('Source dimensions changed; chart boundaries need review')
        image = source.convert('RGB').resize((1024, 1024), Image.Resampling.LANCZOS)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output, 'JPEG', quality=90, subsampling=0, optimize=True)
    # Measure the actual encoded result, not its pre-compression source.
    with Image.open(args.output) as encoded:
        means = {}
        for name, (x, y, w, h) in RECTS.items():
            crop = encoded.crop((x+16, y+16, x+w-16, y+h-16))
            pixels = crop.tobytes()
            means[name] = [sum(pixels[k::3])/(len(pixels)/3)/255 for k in range(3)]
    receipt = {'sourceSHA256': SOURCE_HASH, 'sourceSize': source_size,
               'outputSHA256': digest(args.output), 'outputBytes': args.output.stat().st_size,
               'outputSize': [1024, 1024], 'format': 'RGB JPEG 90 4:4:4 optimize',
               'operations': ['whole-image RGB conversion', 'uniform Lanczos resize', 'JPEG encoding'],
               'rects': RECTS, 'insetPixels': 16, 'meanRGB': means,
               'scope': 'Technical preparation, not visual/biological/PBR validation'}
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, indent=2)+'\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
