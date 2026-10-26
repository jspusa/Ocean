#!/usr/bin/env python3
"""Frozen image regression for the transparent crown's photographed blur.

Inputs are actual barreleye-render-browser.cjs PNGs. The normative focused
reference is pinned historical evidence, never a candidate image. A continuous
unit-area disk filters the isolated baseline crown in display-code space; this
is a local shape/signal oracle, not a physical radiometry or whole-image oracle.
No browser, GPU, renderer source substitution or image rewriting occurs here.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT/'tests/parity/fixtures/transparent-photo-v01827.json'
FIXTURE_SHA256 = 'efa317ad2371dddca8222188c80109b45358be5705b2ba3036287cf0f646c17e'
FOCUSED = 'photo-f16-subject'
DEFOCUSED = 'photo-f2-far'
BASELINES = {
    'desktop': {
        'directory': 'qa/parity/v01828-shell-dof/native-desktop',
        'hashes': {
            'report.json': '6d593a565a34f43514a581ce744b0ee3a1063436d73cc61668a56bf9fde661d4',
            'report-photo-f16-subject-on.png': '8670256e77926a9a90f3f11d6076629c6f327427dd31867d96a9fbbd5fa4b288',
            'report-photo-f16-subject-off.png': 'c97c4311e6745d22b8fba6ca679a1b2658f5901db26177efb797b30f5ff1eab9',
            'report-photo-f2-far-on.png': '3c6785fa1fb10954bd3985fef1a38792bcf8ef0ffc7fdca1faad1301649fd7e3',
            'report-photo-f2-far-off.png': 'c4f20ba9d125d2395cf8cde48e130cbde50c79507753304810072271f77821c0',
        },
    },
    'touch': {
        'directory': 'qa/parity/v01828-shell-dof/native-touch-baseline',
        'hashes': {
            'report.json': 'b0a5b29b28790110d64b5a546df9e119a6107b66519b5312d50714b4ca5c1e01',
            'report-photo-f16-subject-on.png': '15a026f4e50f959e5b55ddcd3e01a59f986e3b74501ce763185451c8cb8c91bf',
            'report-photo-f16-subject-off.png': '0d910a9dbb17dc23f7114c4719a2ca22dd9a263288cd85c3472d350b7044111c',
            'report-photo-f2-far-on.png': 'ccea252d397035821600993b79728a741868ea3fe4d80b8269d6147f3e5e5e14',
            'report-photo-f2-far-off.png': 'a78872b1b3231daddd2d2d399b59c2a909a416f4fe9eb7f0e4b1355045da6983',
        },
    },
}

# Frozen before candidate image capture. The initial RED's ROI, smoothing,
# ghost count, prominence and median signal bounds are deliberately unchanged.
# Added shape gates allow 15% RMS-width error and at most 12.5% redistributed
# normalized profile mass (L1/2), including AA and display-code quantization.
THRESHOLDS = {
    'profileCount': 10, 'arcFractions': [.36, .54], 'tangentWidthPixels': 5,
    'normalStartRadiusMultiple': -1, 'normalEndRadiusMultiple': 3,
    'normalPaddingPixels': 3, 'smoothing': [.25, .5, .25],
    'secondaryExcursionAboveReferenceDN': 1.,
    'normalizedSecondaryExcursionAboveReference': .08,
    'maxGhostProfiles': 1, 'referenceMaxNormalizedSecondaryExcursion': .02,
    'medianDisplaySignalRatioExclusive': [.65, 1.35],
    'eachProfileDisplaySignalFloorExclusive': .65,
    'rmsWidthRatioInclusive': [.85, 1.15],
    'normalizedProfileL1Maximum': .25,
    'dimmedNegativeControlMultiplier': .25,
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def canonical_sha(value):
    return sha(json.dumps(value, sort_keys=True, separators=(',', ':')).encode())


def rgba(directory, scene, mode, size, evidence):
    path = directory / ('report-' + scene + '-' + mode + '.png')
    data = path.read_bytes()
    with Image.open(path) as image:
        assert image.size == size, 'Framebuffer dimensions changed: ' + str(path)
        image = image.convert('RGBA')
        pixels = image.tobytes()
        evidence.append({'path': str(path), 'pngSHA256': sha(data), 'rgbaSHA256': sha(pixels)})
        return image, pixels


def continuous_disk(sharp, radius):
    # Independent cell-area integration, not the production sample pattern.
    sub = (np.arange(64) + .5) / 64 - .5
    weights = []
    for dy in range(-math.ceil(radius), math.ceil(radius) + 1):
        for dx in range(-math.ceil(radius), math.ceil(radius) + 1):
            weight = float(np.mean((dx + sub[None, :])**2 + (dy + sub[:, None])**2 <= radius**2))
            if weight:
                weights.append((dx, dy, weight))
    result = np.zeros_like(sharp)
    total = sum(weight for _, _, weight in weights)
    for dx, dy, weight in weights:
        result += np.roll(np.roll(sharp, dy, axis=0), dx, axis=1) * (weight / total)
    # Measured pixels are farther than the kernel radius from crop boundaries,
    # so np.roll's wrapping cannot enter any measured profile.
    return result


def profile_metrics(values):
    smooth = np.convolve(values, THRESHOLDS['smoothing'], mode='valid')
    peak = float(smooth.max())
    total_variation = float(np.abs(np.diff(smooth)).sum())
    excursion = float(max(0., (total_variation - (2*peak-smooth[0]-smooth[-1])) * .5))
    positive = np.maximum(smooth, 0.)
    signal = float(positive.sum())
    density = positive / max(signal, 1e-12)
    positions = np.arange(len(density))
    centroid = float(np.dot(density, positions))
    width = math.sqrt(float(np.dot(density, (positions-centroid)**2)))
    return {'peakDN': peak, 'secondaryExcursionDN': excursion,
            'normalizedSecondaryExcursion': excursion/max(peak, 1.),
            'rmsWidthPixels': width, 'centroidPixels': centroid,
            'profileDN': [round(float(v), 5) for v in smooth]}, density


def evaluate(actual, reference, xs, lo, hi, crop):
    rows = []
    tangent_left = THRESHOLDS['tangentWidthPixels']//2
    tangent_right = THRESHOLDS['tangentWidthPixels']-tangent_left
    for x in xs:
        x0, x1 = x-tangent_left-crop[0], x+tangent_right-crop[0]
        y0, y1 = lo-crop[1], hi-crop[1]
        actual_band = actual[y0:y1, x0:x1]
        reference_band = reference[y0:y1, x0:x1]
        observed, density = profile_metrics(actual_band.mean(axis=1))
        expected, expected_density = profile_metrics(reference_band.mean(axis=1))
        assert expected['peakDN'] > 1. and reference_band.sum() > 0., 'Invisible reference profile'
        ghost = (observed['secondaryExcursionDN'] > expected['secondaryExcursionDN'] + THRESHOLDS['secondaryExcursionAboveReferenceDN']
                 and observed['normalizedSecondaryExcursion'] > expected['normalizedSecondaryExcursion'] + THRESHOLDS['normalizedSecondaryExcursionAboveReference'])
        signal_ratio = float(actual_band.sum()/reference_band.sum())
        width_ratio = observed['rmsWidthPixels']/max(expected['rmsWidthPixels'], 1e-12)
        shape_l1 = float(np.abs(density-expected_density).sum())
        rows.append({'x': x, 'actual': observed, 'continuousDiskReference': expected,
                     'ghost': ghost, 'relativeDisplayCodeSignal': signal_ratio,
                     'rmsWidthRatio': width_ratio, 'normalizedProfileL1': shape_l1})
    ghosts = sum(row['ghost'] for row in rows)
    signal = float(np.median([row['relativeDisplayCodeSignal'] for row in rows]))
    signal_min, signal_max = THRESHOLDS['medianDisplaySignalRatioExclusive']
    width_min, width_max = THRESHOLDS['rmsWidthRatioInclusive']
    assertions = {
        'continuousReferenceHasNoSeparatedRims': all(row['continuousDiskReference']['normalizedSecondaryExcursion'] < THRESHOLDS['referenceMaxNormalizedSecondaryExcursion'] for row in rows),
        'noRepeatedDiscreteRimCopies': ghosts <= THRESHOLDS['maxGhostProfiles'],
        'retainedMedianDisplayCodeSignal': signal_min < signal < signal_max,
        'eachProfileRetainsVisibleSignal': all(row['relativeDisplayCodeSignal'] > THRESHOLDS['eachProfileDisplaySignalFloorExclusive'] for row in rows),
        'continuousReferenceWidth': all(width_min <= row['rmsWidthRatio'] <= width_max for row in rows),
        'continuousReferenceProfileShape': all(row['normalizedProfileL1'] <= THRESHOLDS['normalizedProfileL1Maximum'] for row in rows),
    }
    return {'rows': rows, 'ghostProfiles': ghosts, 'profileCount': len(rows),
            'medianRelativeDisplayCodeSignal': signal, 'assertions': assertions,
            'passed': all(assertions.values())}


def baseline_layout(baseline):
    stripped = lambda scene: {k: v for k, v in scene['conditions'].items() if k not in ['photoFocus', 'photoAperture']}
    assert stripped(baseline[FOCUSED]) == stripped(baseline[DEFOCUSED]), 'Baseline changes more than photographic focus/aperture'
    cfg = baseline[DEFOCUSED]['conditions']
    assert baseline[FOCUSED]['conditions']['photoAperture'] == 16 and cfg['photoAperture'] == 2
    width, height = cfg['resolution']
    distance = math.dist(cfg['camera'], cfg['original']['p'])
    radius = min(8., abs(distance-cfg['photoFocus'])/max(distance, .5)*18/cfg['photoAperture'])
    assert radius >= 7.9, 'Expected the declared maximum blur fixture'
    box = baseline[FOCUSED]['capBox']
    cap_width = box['max'][0]-box['min'][0]
    top = height-box['max'][1]
    arc_start, arc_end = THRESHOLDS['arcFractions']
    xs = [round(box['min'][0]+cap_width*f) for f in np.linspace(arc_start, arc_end, THRESHOLDS['profileCount'])]
    lo = math.floor(top+radius*THRESHOLDS['normalStartRadiusMultiple']-THRESHOLDS['normalPaddingPixels'])
    hi = math.ceil(top+radius*THRESHOLDS['normalEndRadiusMultiple']+THRESHOLDS['normalPaddingPixels'])
    margin = math.ceil(radius)+2
    tangent_left = THRESHOLDS['tangentWidthPixels']//2
    tangent_right = THRESHOLDS['tangentWidthPixels']-tangent_left
    crop = (min(xs)-tangent_left-margin, lo-margin, max(xs)+tangent_right+margin, hi+margin)
    assert 0 <= crop[0] < crop[2] <= width and 0 <= crop[1] < crop[3] <= height, 'ROI leaves framebuffer'
    return {'size': [width, height], 'radiusPixels': radius, 'crop': list(crop),
            'normalRangeY': [lo, hi], 'profileX': xs}


def write_baseline(output_path, raw_root):
    """Rebuild only from SHA-pinned historical files, never candidate inputs."""
    profiles = {}
    for profile, pin in BASELINES.items():
        directory = raw_root/pin['directory']
        for filename, expected in pin['hashes'].items():
            assert sha((directory/filename).read_bytes()) == expected, 'Pinned reference changed: ' + filename
        report = json.loads((directory/'report.json').read_text())
        assert report['profile'] == profile and report['status'].startswith('passed-controlled')
        scenes = {scene['id']: {key: scene[key] for key in ['conditions', 'capBox']}
                  for scene in report['scenes'] if scene['id'] in [FOCUSED, DEFOCUSED]}
        layout = baseline_layout(scenes)
        frames, layers = {}, {}
        for scene in [FOCUSED, DEFOCUSED]:
            images = []
            for mode in ['on', 'off']:
                evidence = []
                image, _ = rgba(directory, scene, mode, tuple(layout['size']), evidence)
                filename = 'report-' + scene + '-' + mode + '.png'
                frames[filename] = {key: evidence[0][key] for key in ['pngSHA256', 'rgbaSHA256']}
                images.append(np.asarray(image.convert('RGB').crop(layout['crop']), dtype=float))
            # Differences and their RGB sum are exact integers. Dividing this
            # sum by three reconstructs the original float64 mean bit for bit.
            layers[scene] = (images[0]-images[1]).sum(axis=2).astype(int).tolist()
        compact_scenes = {}
        for scene, value in scenes.items():
            conditions = value['conditions']
            compact_scenes[scene] = {
                'layoutConditions': {**{key: conditions[key] for key in ['camera', 'photoFocus', 'photoAperture', 'resolution']},
                                     'original': {'p': conditions['original']['p']}},
                'capBox': value['capBox'],
            }
        profiles[profile] = {'originalDirectory': pin['directory'], 'originalHashes': pin['hashes'],
                             'status': report['status'], 'expectedVersion': report.get('expectedVersion'),
                             'sourceHashes': report.get('sourceHashes'), 'scenes': compact_scenes,
                             'conditionsSHA256': {scene: canonical_sha(scenes[scene]['conditions']) for scene in scenes},
                             'layout': layout, 'frames': frames, 'differenceRGBSum': layers}
    output = {'schema': 'transparent-photo-baseline-v1', 'encoding': 'Exact signed integer sum of on-minus-off RGB display codes, one value per crop pixel; divide by 3 for the original float64 channel mean.',
              'profiles': profiles}
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2)+'\n')
    print(json.dumps({'fixture': str(output_path), 'bytes': output_path.stat().st_size,
                      'sha256': sha(output_path.read_bytes())}))


def analyze_layers(sharp, actual, layout):
    radius, crop, xs = layout['radiusPixels'], layout['crop'], layout['profileX']
    lo, hi = layout['normalRangeY']
    tangent_left = THRESHOLDS['tangentWidthPixels']//2
    tangent_right = THRESHOLDS['tangentWidthPixels']-tangent_left
    reference = continuous_disk(sharp, radius)
    result = evaluate(actual, reference, xs, lo, hi, crop)
    positive = evaluate(reference, reference, xs, lo, hi, crop)
    sharp_negative = evaluate(sharp, reference, xs, lo, hi, crop)
    dim_negative = evaluate(reference*THRESHOLDS['dimmedNegativeControlMultiplier'], reference, xs, lo, hi, crop)
    localized_dim = reference.copy()
    localized_dim[:, xs[0]-tangent_left-crop[0]:xs[0]+tangent_right-crop[0]] *= THRESHOLDS['dimmedNegativeControlMultiplier']
    local_negative = evaluate(localized_dim, reference, xs, lo, hi, crop)
    assert positive['passed'], 'Independent continuous reference must pass'
    assert not sharp_negative['passed'] and (not sharp_negative['assertions']['continuousReferenceWidth'] or not sharp_negative['assertions']['continuousReferenceProfileShape']), 'Unblurred crown negative control escaped the shape gate'
    assert not dim_negative['passed'] and not dim_negative['assertions']['eachProfileRetainsVisibleSignal'], 'Dimmed crown negative control escaped the signal gate'
    assert not local_negative['passed'] and local_negative['assertions']['retainedMedianDisplayCodeSignal'] and not local_negative['assertions']['eachProfileRetainsVisibleSignal'], 'A locally hidden arc escaped the per-profile signal gate'
    return {'negativeControls': {'sharpUnblurred': sharp_negative, 'dimmedContinuous': dim_negative, 'oneDimmedArc': local_negative},
            'continuousReferencePositiveControl': positive, **result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', type=Path, help='Candidate controlled capture directory')
    parser.add_argument('--fixture', type=Path, default=FIXTURE, help='Relocation of the pinned tracked fixture')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write-baseline', type=Path, help='Generate a fixture only from the SHA-pinned historical raw inputs')
    mode.add_argument('--check-baseline', choices=BASELINES, help='Replay the historical RED using only tracked data; expected exit code is 1')
    parser.add_argument('--raw-baseline-root', type=Path, default=ROOT, help='Repository-shaped raw input root, used only with --write-baseline')
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    if args.write_baseline:
        assert args.directory is None, 'Baseline generation cannot accept a candidate directory'
        write_baseline(args.write_baseline, args.raw_baseline_root)
        return 0
    fixture_bytes = args.fixture.read_bytes()
    assert sha(fixture_bytes) == FIXTURE_SHA256, 'Pinned tracked baseline fixture changed'
    fixture = json.loads(fixture_bytes)
    assert fixture['schema'] == 'transparent-photo-baseline-v1'
    if args.check_baseline:
        assert args.directory is None, 'Choose candidate validation or historical RED replay'
        profile = args.check_baseline
        report = fixture['profiles'][profile]
    else:
        assert args.directory is not None, 'Provide a candidate directory or --check-baseline'
        report = json.loads((args.directory/'report.json').read_text())
        profile = report['profile']
    assert profile in BASELINES
    pin, record = BASELINES[profile], fixture['profiles'][profile]
    assert record['originalHashes'] == pin['hashes'], 'Raw provenance pins changed'
    assert report['status'].startswith('passed-controlled') and record['status'].startswith('passed-controlled')
    baseline = record['scenes']
    layout_source = {scene: {'conditions': value['layoutConditions'], 'capBox': value['capBox']}
                     for scene, value in baseline.items()}
    layout = baseline_layout(layout_source)
    assert layout == record['layout'], 'Recorded ROI differs from the frozen definition'
    width, height = layout['size']
    crop, radius = layout['crop'], layout['radiusPixels']
    lo, hi = layout['normalRangeY']
    sharp = np.asarray(record['differenceRGBSum'][FOCUSED], dtype=float)/3
    evidence = []
    if args.check_baseline:
        actual = np.asarray(record['differenceRGBSum'][DEFOCUSED], dtype=float)/3
    else:
        candidate = {scene['id']: scene for scene in report['scenes']}
        # Hash every original condition field, including all actor poses, FOV,
        # viewport, DPR, exposure, clarity, lamp, sun, residency and bubbles.
        # The generator checks the full pinned inputs before retaining their
        # canonical hashes; layoutConditions is only the small ROI input subset.
        for scene in [FOCUSED, DEFOCUSED]:
            assert canonical_sha(candidate[scene]['conditions']) == record['conditionsSHA256'][scene], 'Fixture changed: ' + scene
            assert candidate[scene]['capBox'] == baseline[scene]['capBox'], 'Projected cap changed: ' + scene
        blurred_images = []
        for scene in [FOCUSED, DEFOCUSED]:
            for mode in ['on', 'off']:
                image, pixels = rgba(args.directory, scene, mode, (width, height), evidence)
                filename = 'report-' + scene + '-' + mode + '.png'
                if scene == FOCUSED or mode == 'off':
                    assert sha(pixels) == record['frames'][filename]['rgbaSHA256'], 'Unchanged full framebuffer differs: ' + scene + '/' + mode
                if scene == DEFOCUSED:
                    blurred_images.append(np.asarray(image.convert('RGB').crop(crop), dtype=float))
        actual = (blurred_images[0]-blurred_images[1]).mean(axis=2)
    assert sharp.shape == actual.shape == (crop[3]-crop[1], crop[2]-crop[0])
    result = analyze_layers(sharp, actual, layout)
    output = {'method': __doc__, 'profile': profile, 'reportedVersion': report.get('expectedVersion'),
              'baselineFixture': str(args.fixture), 'baselineFixtureSHA256': FIXTURE_SHA256,
              'baselineDirectory': record['originalDirectory'], 'pinnedBaselineHashes': pin['hashes'],
              'thresholds': THRESHOLDS, 'radiusPixels': radius, 'crop': crop, 'normalRangeY': [lo, hi],
              'fixtureSHA256': record['conditionsSHA256'][DEFOCUSED], 'sourceHashes': report.get('sourceHashes'), 'files': evidence,
              'baselineFocusedRGBAByteExact': True, 'baselineOffRGBAByteExact': True,
              'baselineRGBAComparison': 'SHA256 of complete decoded RGBA bytes; historical replay relies on the pinned fixture provenance',
              **result,
              'limits': 'Local clear-water silhouette regression only. Display-code signal is not radiometric energy. No foreground, LOD, hardware-phone, performance or whole-image realism claim.'}
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(output, indent=2)+'\n')
    print(json.dumps({k: output[k] for k in ['profile', 'reportedVersion', 'ghostProfiles', 'profileCount', 'medianRelativeDisplayCodeSignal', 'assertions', 'passed']}))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
