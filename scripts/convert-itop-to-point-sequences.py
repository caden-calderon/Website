#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import json
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import h5py
import numpy as np

DEFAULT_CLIP_SPECS = (
	("itop-side-test-short", 24),
	("itop-side-test-medium", 48),
	("itop-side-test-long", 96),
)

SEGMENTATION_PALETTE: tuple[tuple[int, int, int], ...] = (
	(240, 240, 240),
	(255, 99, 132),
	(255, 159, 64),
	(255, 205, 86),
	(75, 192, 192),
	(54, 162, 235),
	(153, 102, 255),
	(201, 203, 207),
	(244, 143, 177),
	(129, 199, 132),
	(255, 171, 145),
	(128, 222, 234),
	(174, 213, 129),
	(255, 241, 118),
	(188, 170, 164),
)


@dataclass(frozen=True)
class ClipSpec:
	clip_id: str
	frame_count: int


@dataclass(frozen=True)
class FrameRecord:
	dataset_index: int
	frame_id: str
	person_id: str
	frame_number: int
	is_valid: bool
	body_label_count: int


@dataclass(frozen=True)
class CandidateRun:
	person_id: str
	frames: tuple[FrameRecord, ...]

	@property
	def length(self) -> int:
		return len(self.frames)

	@property
	def average_body_label_count(self) -> float:
		return float(sum(frame.body_label_count for frame in self.frames) / len(self.frames))


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description=(
			"Convert bounded ITOP side-view test clips into point-sequence manifests plus frame PLY files."
		),
	)
	parser.add_argument("--point-cloud", required=True, type=Path, help="Path to ITOP_side_test_point_cloud.h5 or .h5.gz")
	parser.add_argument("--labels", required=True, type=Path, help="Path to ITOP_side_test_labels.h5 or .h5.gz")
	parser.add_argument(
		"--output-root",
		type=Path,
		default=Path("tmp/point-sequences"),
		help="Directory where converted clip folders and the catalog report will be written.",
	)
	parser.add_argument(
		"--clip",
		action="append",
		default=[],
		metavar="CLIP_ID:FRAME_COUNT",
		help="Repeatable clip specification. Defaults to short/medium/long ITOP stress clips.",
	)
	parser.add_argument(
		"--min-body-points",
		type=int,
		default=1024,
		help="Minimum segmented body pixels required for a frame to participate in a candidate run.",
	)
	parser.add_argument(
		"--max-points-per-frame",
		type=int,
		default=0,
		help="Optional deterministic cap applied after segmentation filtering. Use 0 to keep all body points.",
	)
	parser.add_argument(
		"--overwrite",
		action="store_true",
		help="Allow replacing existing clip directories with the same IDs.",
	)
	return parser.parse_args()


def main() -> None:
	args = parse_args()
	clip_specs = parse_clip_specs(args.clip)
	output_root = args.output_root.resolve()
	output_root.mkdir(parents=True, exist_ok=True)

	point_cloud_path, point_cloud_cleanup = materialize_hdf5_input(args.point_cloud.resolve())
	labels_path, labels_cleanup = materialize_hdf5_input(args.labels.resolve())

	try:
		with h5py.File(point_cloud_path, "r") as point_cloud_h5, h5py.File(labels_path, "r") as labels_h5:
			validate_itop_files(point_cloud_h5, labels_h5)
			frame_records = load_frame_records(labels_h5, args.min_body_points)
			candidate_runs = build_candidate_runs(frame_records, args.min_body_points)

			if not candidate_runs:
				raise ValueError(
					f"No valid ITOP runs matched min_body_points={args.min_body_points}. "
					"Lower the threshold or inspect the input files."
				)

			generated_assets: list[dict[str, object]] = []
			missing_specs: list[dict[str, object]] = []

			for clip_spec in clip_specs:
				run = select_run_for_clip(candidate_runs, clip_spec.frame_count)
				if run is None:
					missing_specs.append(
						{
							"id": clip_spec.clip_id,
							"frameCount": clip_spec.frame_count,
							"reason": "No contiguous valid run of sufficient length was found.",
						}
					)
					continue

				selected_frames = select_window(run, clip_spec.frame_count)
				output_dir = output_root / clip_spec.clip_id
				write_clip_sequence(
					output_dir=output_dir,
					clip_spec=clip_spec,
					selected_frames=selected_frames,
					point_cloud_h5=point_cloud_h5,
					labels_h5=labels_h5,
					point_cloud_input=args.point_cloud.name,
					labels_input=args.labels.name,
					max_points_per_frame=args.max_points_per_frame,
					overwrite=args.overwrite,
				)
				generated_assets.append(
					{
						"id": clip_spec.clip_id,
						"label": humanize_clip_id(clip_spec.clip_id),
						"manifestUrl": f"/api/point-sequences/{clip_spec.clip_id}/manifest.json",
						"frameCount": clip_spec.frame_count,
						"sourcePersonId": selected_frames[0].person_id,
						"sourceFrameRange": [selected_frames[0].frame_id, selected_frames[-1].frame_id],
					}
				)

			report = {
				"source": {
					"dataset": "ITOP",
					"view": "side",
					"split": "test",
					"pointCloudFile": args.point_cloud.name,
					"labelsFile": args.labels.name,
				},
				"minBodyPoints": args.min_body_points,
				"maxPointsPerFrame": None if args.max_points_per_frame <= 0 else args.max_points_per_frame,
				"candidateRuns": [
					{
						"personId": run.person_id,
						"length": run.length,
						"averageBodyLabelCount": round(run.average_body_label_count, 2),
						"startFrameId": run.frames[0].frame_id,
						"endFrameId": run.frames[-1].frame_id,
					}
					for run in sorted(
						candidate_runs,
						key=lambda run: (-run.length, -run.average_body_label_count, run.frames[0].frame_number, run.person_id),
					)
				],
				"generatedAssets": generated_assets,
				"missingAssets": missing_specs,
			}
			(output_root / "catalog.json").write_text(f"{json.dumps(report, indent=2)}\n", encoding="utf-8")
	finally:
		if point_cloud_cleanup is not None:
			point_cloud_cleanup.cleanup()
		if labels_cleanup is not None:
			labels_cleanup.cleanup()


def parse_clip_specs(raw_specs: Iterable[str]) -> list[ClipSpec]:
	if not raw_specs:
		return [ClipSpec(clip_id=clip_id, frame_count=frame_count) for clip_id, frame_count in DEFAULT_CLIP_SPECS]

	clip_specs: list[ClipSpec] = []
	seen_ids: set[str] = set()
	for raw_spec in raw_specs:
		if ":" not in raw_spec:
			raise ValueError(f'Invalid --clip value "{raw_spec}". Expected CLIP_ID:FRAME_COUNT.')
		clip_id, raw_frame_count = raw_spec.split(":", 1)
		clip_id = clip_id.strip()
		if not clip_id:
			raise ValueError(f'Invalid --clip value "{raw_spec}". Clip id must be non-empty.')
		if clip_id in seen_ids:
			raise ValueError(f'Duplicate --clip id "{clip_id}".')
		frame_count = int(raw_frame_count)
		if frame_count <= 0:
			raise ValueError(f'Invalid --clip value "{raw_spec}". Frame count must be > 0.')
		clip_specs.append(ClipSpec(clip_id=clip_id, frame_count=frame_count))
		seen_ids.add(clip_id)
	return clip_specs


def materialize_hdf5_input(path: Path) -> tuple[Path, tempfile.TemporaryDirectory[str] | None]:
	if not path.exists():
		raise FileNotFoundError(f"Input file not found: {path}")

	if path.suffix != ".gz":
		return path, None

	temp_dir = tempfile.TemporaryDirectory(prefix="itop-h5-")
	output_name = path.stem
	output_path = Path(temp_dir.name) / output_name
	with gzip.open(path, "rb") as source, output_path.open("wb") as target:
		shutil.copyfileobj(source, target)
	return output_path, temp_dir


def validate_itop_files(point_cloud_h5: h5py.File, labels_h5: h5py.File) -> None:
	required_point_cloud_keys = {"id", "data"}
	required_label_keys = {"id", "is_valid", "segmentation", "visible_joints", "image_coordinates", "real_world_coordinates"}

	if not required_point_cloud_keys.issubset(point_cloud_h5.keys()):
		raise ValueError(f"Point-cloud file is missing required datasets: {sorted(required_point_cloud_keys - set(point_cloud_h5.keys()))}")
	if not required_label_keys.issubset(labels_h5.keys()):
		raise ValueError(f"Labels file is missing required datasets: {sorted(required_label_keys - set(labels_h5.keys()))}")

	if point_cloud_h5["data"].shape[0] != labels_h5["segmentation"].shape[0]:
		raise ValueError("Point-cloud and labels files disagree on frame count.")

	point_cloud_ids = point_cloud_h5["id"]
	label_ids = labels_h5["id"]
	if point_cloud_ids.shape[0] != label_ids.shape[0]:
		raise ValueError("Point-cloud and labels files disagree on id count.")

	for index in range(point_cloud_ids.shape[0]):
		point_cloud_id = decode_frame_id(point_cloud_ids[index])
		label_id = decode_frame_id(label_ids[index])
		if point_cloud_id != label_id:
			raise ValueError(
				f'Point-cloud frame id "{point_cloud_id}" does not match labels frame id "{label_id}" at index {index}.'
			)


def load_frame_records(labels_h5: h5py.File, min_body_points: int) -> list[FrameRecord]:
	frame_records: list[FrameRecord] = []
	for dataset_index in range(labels_h5["id"].shape[0]):
		frame_id = decode_frame_id(labels_h5["id"][dataset_index])
		person_id, frame_number = parse_frame_id(frame_id)
		segmentation = np.asarray(labels_h5["segmentation"][dataset_index])
		body_label_count = int(np.count_nonzero(segmentation >= 0))
		frame_records.append(
			FrameRecord(
				dataset_index=dataset_index,
				frame_id=frame_id,
				person_id=person_id,
				frame_number=frame_number,
				is_valid=bool(int(labels_h5["is_valid"][dataset_index])),
				body_label_count=body_label_count if body_label_count >= min_body_points else body_label_count,
			)
		)
	return frame_records


def build_candidate_runs(frame_records: list[FrameRecord], min_body_points: int) -> list[CandidateRun]:
	runs: list[CandidateRun] = []
	records_by_person: dict[str, list[FrameRecord]] = {}
	for frame in frame_records:
		records_by_person.setdefault(frame.person_id, []).append(frame)

	for person_id, records in records_by_person.items():
		records.sort(key=lambda frame: frame.frame_number)
		current_run: list[FrameRecord] = []
		previous_frame_number: int | None = None

		for frame in records:
			frame_is_eligible = frame.is_valid and frame.body_label_count >= min_body_points
			is_contiguous = previous_frame_number is not None and frame.frame_number == previous_frame_number + 1

			if frame_is_eligible and (not current_run or is_contiguous):
				current_run.append(frame)
			elif frame_is_eligible:
				if current_run:
					runs.append(CandidateRun(person_id=person_id, frames=tuple(current_run)))
				current_run = [frame]
			else:
				if current_run:
					runs.append(CandidateRun(person_id=person_id, frames=tuple(current_run)))
				current_run = []

			previous_frame_number = frame.frame_number

		if current_run:
			runs.append(CandidateRun(person_id=person_id, frames=tuple(current_run)))

	return runs


def select_run_for_clip(candidate_runs: list[CandidateRun], frame_count: int) -> CandidateRun | None:
	eligible_runs = [run for run in candidate_runs if run.length >= frame_count]
	if not eligible_runs:
		return None

	return sorted(
		eligible_runs,
		key=lambda run: (-run.length, -run.average_body_label_count, run.frames[0].frame_number, run.person_id),
	)[0]


def select_window(run: CandidateRun, frame_count: int) -> list[FrameRecord]:
	if frame_count > run.length:
		raise ValueError(f"Cannot extract {frame_count} frames from run of length {run.length}.")

	start_offset = (run.length - frame_count) // 2
	return list(run.frames[start_offset : start_offset + frame_count])


def write_clip_sequence(
	output_dir: Path,
	clip_spec: ClipSpec,
	selected_frames: list[FrameRecord],
	point_cloud_h5: h5py.File,
	labels_h5: h5py.File,
	point_cloud_input: str,
	labels_input: str,
	max_points_per_frame: int,
	overwrite: bool,
) -> None:
	if output_dir.exists():
		if not overwrite:
			raise FileExistsError(
				f"Output directory already exists: {output_dir}. Re-run with --overwrite to replace it."
			)
		shutil.rmtree(output_dir)
	output_dir.mkdir(parents=True, exist_ok=True)

	frame_files: list[str] = []
	frame_timestamps_ms: list[float] = []
	body_point_counts: list[int] = []
	frame_payload_bytes: list[int] = []
	source_frame_ids: list[str] = []

	for frame_offset, frame in enumerate(selected_frames):
		points, colors = extract_body_points_and_colors(
			point_cloud=np.asarray(point_cloud_h5["data"][frame.dataset_index], dtype=np.float32),
			segmentation=np.asarray(labels_h5["segmentation"][frame.dataset_index]),
			max_points_per_frame=max_points_per_frame,
		)
		frame_filename = f"frame-{frame_offset:04d}.ply"
		frame_bytes = encode_ascii_ply(points, colors)
		(output_dir / frame_filename).write_bytes(frame_bytes)

		frame_files.append(frame_filename)
		frame_timestamps_ms.append(float(frame_offset * (1000.0 / 15.0)))
		body_point_counts.append(int(points.shape[0]))
		frame_payload_bytes.append(len(frame_bytes))
		source_frame_ids.append(frame.frame_id)

	manifest = {
		"version": 1,
		"fps": 15,
		"frameCount": len(selected_frames),
		"frameTimestampsMs": frame_timestamps_ms,
		"frameFiles": frame_files,
		"clips": [
			{
				"id": "full_clip",
				"startFrame": 0,
				"endFrame": len(selected_frames) - 1,
				"mode": "loop",
			}
		],
		"coordinateSystem": {
			"upAxis": "y",
			"forwardAxis": "z",
			"handedness": "right",
			"description": "ITOP side-view real-world coordinates in meters, filtered to segmented body points.",
		},
		"units": "meters",
		"processing": {
			"dataset": "ITOP",
			"view": "side",
			"split": "test",
			"sourceFrameIds": source_frame_ids,
			"bodyPointCountRange": [int(min(body_point_counts)), int(max(body_point_counts))],
			"averageBodyPoints": round(float(sum(body_point_counts) / len(body_point_counts)), 2),
			"maxPointsPerFrame": None if max_points_per_frame <= 0 else max_points_per_frame,
			"segmentationFilter": {
				"backgroundLabel": -1,
				"requireValidLabels": True,
				"dropNonPositiveDepth": True,
			},
			"stressTest": {
				"loadingStrategy": "eager-full-sequence",
				"framePayloadBytes": int(sum(frame_payload_bytes)),
				"framePayloadByteRange": [int(min(frame_payload_bytes)), int(max(frame_payload_bytes))],
			},
		},
		"capture": {
			"sensor": "itop",
			"metadata": {
				"pointCloudFile": point_cloud_input,
				"labelsFile": labels_input,
				"sourcePersonId": selected_frames[0].person_id,
				"sourceFrameRange": [selected_frames[0].frame_id, selected_frames[-1].frame_id],
			},
		},
	}
	(output_dir / "manifest.json").write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")


def extract_body_points_and_colors(
	point_cloud: np.ndarray,
	segmentation: np.ndarray,
	max_points_per_frame: int,
) -> tuple[np.ndarray, np.ndarray]:
	flattened_points = point_cloud.reshape(-1, 3)
	flattened_labels = segmentation.reshape(-1)
	valid_mask = (
		(flattened_labels >= 0)
		& np.isfinite(flattened_points[:, 0])
		& np.isfinite(flattened_points[:, 1])
		& np.isfinite(flattened_points[:, 2])
		& (flattened_points[:, 2] > 0)
	)

	body_points = flattened_points[valid_mask]
	body_labels = flattened_labels[valid_mask].astype(np.int32)
	if body_points.shape[0] == 0:
		raise ValueError("Encountered a selected frame with zero valid body points after filtering.")

	if max_points_per_frame > 0 and body_points.shape[0] > max_points_per_frame:
		indices = evenly_spaced_indices(body_points.shape[0], max_points_per_frame)
		body_points = body_points[indices]
		body_labels = body_labels[indices]

	colors = np.asarray([SEGMENTATION_PALETTE[label % len(SEGMENTATION_PALETTE)] for label in body_labels], dtype=np.uint8)
	return body_points.astype(np.float32, copy=False), colors


def evenly_spaced_indices(source_count: int, target_count: int) -> np.ndarray:
	if target_count >= source_count:
		return np.arange(source_count, dtype=np.int64)

	indices = np.floor(np.arange(target_count, dtype=np.float64) * source_count / target_count).astype(np.int64)
	indices = np.maximum.accumulate(indices)
	indices[-1] = min(indices[-1], source_count - 1)
	return indices


def encode_ascii_ply(points: np.ndarray, colors: np.ndarray) -> bytes:
	header_lines = [
		"ply",
		"format ascii 1.0",
		f"element vertex {points.shape[0]}",
		"property float x",
		"property float y",
		"property float z",
		"property uchar red",
		"property uchar green",
		"property uchar blue",
		"end_header",
	]
	body_lines = [
		f"{point[0]:.6f} {point[1]:.6f} {point[2]:.6f} {int(color[0])} {int(color[1])} {int(color[2])}"
		for point, color in zip(points, colors, strict=True)
	]
	return ("\n".join([*header_lines, *body_lines, ""])).encode("utf-8")


def parse_frame_id(frame_id: str) -> tuple[str, int]:
	if "_" not in frame_id:
		raise ValueError(f'Invalid ITOP frame id "{frame_id}". Expected XX_YYYYY.')
	person_id, raw_frame_number = frame_id.split("_", 1)
	return person_id, int(raw_frame_number)


def decode_frame_id(raw_value: object) -> str:
	if isinstance(raw_value, bytes):
		return raw_value.decode("utf-8", errors="ignore").rstrip("\x00")
	if isinstance(raw_value, str):
		return raw_value.rstrip("\x00")

	array_value = np.asarray(raw_value)
	if array_value.dtype.kind in {"S", "U"}:
		return str(array_value.tolist()).rstrip("\x00")
	if array_value.dtype.kind in {"u", "i"}:
		byte_values = bytes(int(value) for value in array_value.reshape(-1).tolist() if int(value) != 0)
		return byte_values.decode("utf-8", errors="ignore")
	return str(raw_value).rstrip("\x00")


def humanize_clip_id(clip_id: str) -> str:
	return clip_id.replace("-", " ").title()


if __name__ == "__main__":
	main()
