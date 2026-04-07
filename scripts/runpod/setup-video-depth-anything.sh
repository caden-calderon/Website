#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/workspace}"
TOOLS_DIR="${TOOLS_DIR:-$ROOT_DIR/tools}"
REPO_DIR="${REPO_DIR:-$TOOLS_DIR/Video-Depth-Anything}"
VENV_DIR="${VENV_DIR:-$REPO_DIR/.venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "==> Preparing directories"
mkdir -p "$ROOT_DIR/videos" "$ROOT_DIR/outputs" "$TOOLS_DIR"

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ffmpeg git tmux

if [[ ! -d "$REPO_DIR/.git" ]]; then
	echo "==> Cloning Video-Depth-Anything"
	git clone https://github.com/DepthAnything/Video-Depth-Anything.git "$REPO_DIR"
else
	echo "==> Updating existing Video-Depth-Anything checkout"
	git -C "$REPO_DIR" pull --ff-only
fi

echo "==> Creating virtual environment"
"$PYTHON_BIN" -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

echo "==> Installing Python dependencies"
pip install -U pip setuptools wheel
pip install -r "$REPO_DIR/requirements.txt"
pip install --upgrade imageio imageio-ffmpeg
pip install "numpy<2"
pip install open3d
pip install "numpy<2"

echo "==> Downloading standard checkpoints"
(cd "$REPO_DIR" && bash get_weights.sh)

METRIC_LARGE_PATH="$REPO_DIR/checkpoints/metric_video_depth_anything_vitl.pth"
if [[ ! -f "$METRIC_LARGE_PATH" ]]; then
	echo "==> Downloading metric large checkpoint"
	wget -O "$METRIC_LARGE_PATH" \
		https://huggingface.co/depth-anything/Metric-Video-Depth-Anything-Large/resolve/main/metric_video_depth_anything_vitl.pth
else
	echo "==> Metric large checkpoint already present"
fi

echo "==> Patching imageio writer to force FFMPEG backend"
export REPO_DIR
"$PYTHON_BIN" - <<'PY'
import os
from pathlib import Path

path = Path(os.environ["REPO_DIR"]) / "utils" / "dc_utils.py"
text = path.read_text(encoding="utf-8")
old = "writer = imageio.get_writer(output_video_path, fps=fps, macro_block_size=1, codec='libx264', ffmpeg_params=['-crf', '18'])"
new = "writer = imageio.get_writer(output_video_path, format='FFMPEG', fps=fps, macro_block_size=1, codec='libx264', ffmpeg_params=['-crf', '18'])"
if old in text and new not in text:
    path.write_text(text.replace(old, new), encoding="utf-8")
    print(f'patched {path}')
else:
    print(f'writer patch already present or source line changed: {path}')
PY

echo "==> Environment summary"
nvidia-smi || true
python3 --version
git -C "$REPO_DIR" rev-parse --short HEAD
python3 - <<'PY'
import numpy
import imageio
import imageio_ffmpeg
print("numpy", numpy.__version__)
print("imageio", imageio.__version__)
print("imageio_ffmpeg", imageio_ffmpeg.__version__)
PY

echo "Setup complete."
