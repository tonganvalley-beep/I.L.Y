"""Rebuild every story chapter through its chapter-local build entry point."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDERS = [
    ROOT / 'tools' / 'chapter1' / 'build.py',
    ROOT / 'tools' / 'chapter2' / 'build.py',
    ROOT / 'tools' / 'chapter3' / 'build.py',
    ROOT / 'tools' / 'final' / 'build.py',
]

for builder in BUILDERS:
    subprocess.run([sys.executable, '-B', str(builder)], check=True)

from chapters.build import build_shared_assets

build_shared_assets()
