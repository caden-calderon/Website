#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
libfreenect2_root="${LIBFREENECT2_ROOT:-/home/caden/libfreenect2}"
if [[ -n "${LIBFREENECT2_BUILD_DIR:-}" ]]; then
  build_dir="${LIBFREENECT2_BUILD_DIR}"
elif [[ -d "${libfreenect2_root}/build-turbojpeg" ]]; then
  build_dir="${libfreenect2_root}/build-turbojpeg"
else
  build_dir="${libfreenect2_root}/build"
fi
output_dir="${repo_root}/tmp/bin"
output="${output_dir}/kinect_capture_helper"

if [[ ! -d "${libfreenect2_root}" ]]; then
  echo "libfreenect2 root not found: ${libfreenect2_root}" >&2
  echo "Set LIBFREENECT2_ROOT or build libfreenect2 at /home/caden/libfreenect2." >&2
  exit 1
fi

if [[ ! -f "${build_dir}/lib/libfreenect2.so" && ! -f "${build_dir}/lib/libfreenect2.so.0.2.0" ]]; then
  echo "libfreenect2 shared library not found under ${build_dir}/lib." >&2
  echo "Build libfreenect2 first: cd ${build_dir} && cmake --build . -j" >&2
  exit 1
fi

mkdir -p "${output_dir}"

c++ -std=c++17 -O2 -Wall -Wextra \
  -I"${libfreenect2_root}/include" \
  -I"${build_dir}" \
  "${repo_root}/cpp/kinect_capture/kinect_capture_helper.cpp" \
  -L"${build_dir}/lib" \
  -Wl,-rpath,"${build_dir}/lib" \
  -lfreenect2 \
  -pthread \
  -o "${output}"

echo "${output}"
