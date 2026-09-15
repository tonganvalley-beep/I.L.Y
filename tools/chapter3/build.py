"""Build only chapter 3 from this directory's canonical transcript."""
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))

from chapters.build import build_chapter


if __name__ == '__main__':
    build_chapter('chapter3')
