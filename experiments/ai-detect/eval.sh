#!/usr/bin/env bash
# Run the AI-image detector evaluation (Git Bash / macOS / Linux).
#   ./eval.sh                                   # all models
#   ./eval.sh Smogy/SMOGY-Ai-images-detector    # one or more specific models
#   ./eval.sh --fetch                           # rebuild the test set first, then evaluate
set -euo pipefail
cd "$(dirname "$0")"

# PYTHON overrides the venv. Under WSL the Linux venv lives in ~/venvs/ai-detect (see README.md)
python=${PYTHON:-.venv/Scripts/python}
[ -x "$python" ] || python=.venv/bin/python
[ -x "$python" ] || python=~/venvs/ai-detect/bin/python
[ -x "$python" ] || { echo "No venv found. Set it up first (see README.md)." >&2; exit 1; }

if [ "${1:-}" = "--fetch" ] || [ ! -f manifest.csv ]; then
  [ "${1:-}" = "--fetch" ] && shift
  echo "Building test set..."
  "$python" -u fetch_data.py
fi

# Every image in the manifest must exist, or the run fails partway through
missing=$(tail -n +2 manifest.csv | cut -d, -f1 | while read -r f; do [ -f "data/$f" ] || echo "$f"; done | wc -l)
if [ "$missing" -gt 0 ]; then
  echo "$missing images listed in manifest.csv are missing from data/. Run ./eval.sh --fetch" >&2
  exit 1
fi

# Start from a clean results file so old runs don't mix in
rm -f results.json
"$python" -u run_eval.py "$@"
