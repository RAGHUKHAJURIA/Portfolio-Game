"""Compatibility entry point; the maintained rig builder is /rig_and_walk.py."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().parents[1] / 'rig_and_walk.py'), run_name='__main__')
