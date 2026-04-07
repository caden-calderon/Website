#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
	cat <<'EOF'
Usage:
  bash scripts/runpod/run-vda-metric-large.sh /workspace/videos/input.mp4 /workspace/outputs/output-dir [target_fps]
EOF
	exit 1
fi

INPUT_VIDEO="$1"
OUTPUT_DIR="$2"
TARGET_FPS="${3:-24}"

ROOT_DIR="${ROOT_DIR:-/workspace}"
REPO_DIR="${REPO_DIR:-$ROOT_DIR/tools/Video-Depth-Anything}"
VENV_DIR="${VENV_DIR:-$REPO_DIR/.venv}"

if [[ ! -f "$INPUT_VIDEO" ]]; then
	echo "Input video not found: $INPUT_VIDEO" >&2
	exit 1
fi

mkdir -p "$OUTPUT_DIR"
source "$VENV_DIR/bin/activate"

cd "$REPO_DIR"
python3 run.py \
	--input_video "$INPUT_VIDEO" \
	--output_dir "$OUTPUT_DIR" \
	--encoder vitl \
	--metric \
	--target_fps "$TARGET_FPS" \
	--save_npz

echo
echo "Output files:"
find "$OUTPUT_DIR" -maxdepth 2 -type f | sort
