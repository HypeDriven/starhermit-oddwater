"""Verify rendered light transmission on the fixed 1440x900 tissue review scene.
Run with Pillow installed: python tests/scattering-images.py <capture directory>.
"""
from pathlib import Path
import json
import sys
from PIL import Image, ImageChops, ImageStat

root = Path(sys.argv[1])
regions = {
    'cherry': (95, 380, 400, 580),
    'amano': (405, 380, 760, 580),
    'nerite-body': (770, 515, 1065, 565),
    'ramshorn-body': (1075, 515, 1370, 565),
    'nerite-shell': (770, 380, 940, 510),
    'ramshorn-shell': (1080, 380, 1240, 510),
}
report = {}
for lighting in ('front', 'back'):
    active = Image.open(root / f'tissue-{lighting}.png').convert('RGB')
    baseline = Image.open(root / f'tissue-{lighting}-baseline.png').convert('RGB')
    diff = ImageChops.difference(active, baseline)
    report[lighting] = {}
    for name, box in regions.items():
        crop = diff.crop(box)
        report[lighting][name] = {
            'mean_rgb_change': sum(ImageStat.Stat(crop).mean) / 3,
            'pixels_changed': sum(max(px) > 5 for px in getattr(crop, 'get_flattened_data', crop.getdata)()),
        }
for name in ('cherry', 'amano', 'nerite-body', 'ramshorn-body'):
    assert report['back'][name]['pixels_changed'] > 100, name
    assert report['back'][name]['mean_rgb_change'] > report['front'][name]['mean_rgb_change'], name
for species in ('nerite', 'ramshorn'):
    assert report['back'][species+'-shell']['mean_rgb_change'] < report['back'][species+'-body']['mean_rgb_change'], species
(root / 'comparison.json').write_text(json.dumps(report, indent=2) + '\n')
print('PASS: all four residents transmit backlight; mineral shells scatter less than flesh')
