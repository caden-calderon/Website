#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import numpy as np
import scipy.io


DEFAULT_FPS = 30.0
DEFAULT_MAX_POINTS_PER_FRAME = 12_000
DEFAULT_BOUNDING_BOX_PADDING_PX = 35
DEFAULT_DEPTH_MARGIN_METERS = 0.35


@dataclass(frozen=True)
class UtdClipSpec:
	dataset: str
	clip_id: str
	label: str
	archive_path: Path
	depth_member: str
	skeleton_member: str
	source_description: str


@dataclass(frozen=True)
class KinectIntrinsics:
	fx: float
	fy: float
	cx: float
	cy: float
	u_rmse: float
	v_rmse: float


DEFAULT_CLIP_SPECS = (
	UtdClipSpec(
		dataset='utd-kinect2',
		clip_id='utd-kinect2-high-wave',
		label='UTD Kinect2 High Wave',
		archive_path=Path('Kinect2Dataset.zip'),
		depth_member='Data/a1_s1_t1_depth_K2.mat',
		skeleton_member='Data/a1_s1_t1_skel_K2.mat',
		source_description='Right hand high wave, subject 1, trial 1.',
	),
	UtdClipSpec(
		dataset='utd-kinect2',
		clip_id='utd-kinect2-hand-clap',
		label='UTD Kinect2 Hand Clap',
		archive_path=Path('Kinect2Dataset.zip'),
		depth_member='Data/a10_s1_t1_depth_K2.mat',
		skeleton_member='Data/a10_s1_t1_skel_K2.mat',
		source_description='Hand clap, subject 1, trial 1.',
	),
	UtdClipSpec(
		dataset='utd-multiview',
		clip_id='utd-multiview-front-throw',
		label='UTD Multiview Front Throw',
		archive_path=Path('MultiViewDataset.zip'),
		depth_member='Data/sub1/front/throw/a_s_t1_depth_K2.mat',
		skeleton_member='Data/sub1/front/throw/a_s_t1_skel_K2.mat',
		source_description='Front-view throw, subject 1, trial 1.',
	),
)


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description='Convert selected UTD Kinect v2 depth+skeleton clips into point-sequence manifests plus frame PLY files.',
	)
	parser.add_argument(
		'--output-root',
		type=Path,
		default=Path('tmp/point-sequences'),
		help='Directory where converted clip folders and the catalog report will be written.',
	)
	parser.add_argument(
		'--max-points-per-frame',
		type=int,
		default=DEFAULT_MAX_POINTS_PER_FRAME,
		help='Optional deterministic cap applied after body filtering. Use 0 to keep all points.',
	)
	parser.add_argument(
		'--bounding-box-padding-px',
		type=int,
		default=DEFAULT_BOUNDING_BOX_PADDING_PX,
		help='Pixel padding added around the skeleton screen-space bounds for depth filtering.',
	)
	parser.add_argument(
		'--depth-margin-meters',
		type=float,
		default=DEFAULT_DEPTH_MARGIN_METERS,
		help='Meters added in front of and behind the skeleton depth range for body filtering.',
	)
	parser.add_argument(
		'--clip-id',
		action='append',
		default=[],
		help='Repeatable clip-id filter. Defaults to all curated UTD clips.',
	)
	parser.add_argument(
		'--overwrite',
		action='store_true',
		help='Allow replacing existing clip directories with the same IDs.',
	)
	return parser.parse_args()


def main() -> None:
	args = parse_args()
	output_root = args.output_root.resolve()
	output_root.mkdir(parents=True, exist_ok=True)

	selected_specs = resolve_clip_specs(args.clip_id)
	generated_assets: list[dict[str, object]] = []

	for clip_spec in selected_specs:
		archive_path = clip_spec.archive_path.resolve()
		if not archive_path.exists():
			raise FileNotFoundError(f'Archive not found for clip "{clip_spec.clip_id}": {archive_path}')

		with zipfile.ZipFile(archive_path) as archive:
			depth_frames = load_mat_array(archive, clip_spec.depth_member, 'depth_K2').astype(np.uint16, copy=False)
			skeleton = load_mat_array(archive, clip_spec.skeleton_member, 'S_K2')[0, 0]
			world = np.asarray(skeleton['world'], dtype=np.float64)
			screen = np.asarray(skeleton['screen'], dtype=np.float64)

		if depth_frames.ndim != 3:
			raise ValueError(
				f'Clip "{clip_spec.clip_id}" depth data must be rank-3; received shape {depth_frames.shape}.'
			)
		if world.shape[:2] != (25, 3):
			raise ValueError(
				f'Clip "{clip_spec.clip_id}" skeleton world data must be 25x3xF; received shape {world.shape}.'
			)
		if screen.shape[:2] != (25, 2):
			raise ValueError(
				f'Clip "{clip_spec.clip_id}" skeleton screen data must be 25x2xF; received shape {screen.shape}.'
			)
		if depth_frames.shape[2] != world.shape[2] or depth_frames.shape[2] != screen.shape[2]:
			raise ValueError(
				f'Clip "{clip_spec.clip_id}" disagrees on frame count between depth and skeleton data.'
			)

		output_dir = output_root / clip_spec.clip_id
		manifest = write_clip_sequence(
			output_dir=output_dir,
			clip_spec=clip_spec,
			depth_frames=depth_frames,
			skeleton_world=world,
			skeleton_screen=screen,
			max_points_per_frame=args.max_points_per_frame,
			bounding_box_padding_px=args.bounding_box_padding_px,
			depth_margin_meters=args.depth_margin_meters,
			overwrite=args.overwrite,
		)
		generated_assets.append(
			{
				'id': clip_spec.clip_id,
				'label': clip_spec.label,
				'manifestUrl': f'/api/point-sequences/{clip_spec.clip_id}/manifest.json',
				'frameCount': manifest['frameCount'],
				'dataset': clip_spec.dataset,
				'archiveFile': clip_spec.archive_path.name,
			}
		)

	report = {
		'source': {
			'dataset': 'UTD Kinect V2 depth+skeleton archives',
			'archives': sorted({spec.archive_path.name for spec in selected_specs}),
		},
		'maxPointsPerFrame': None if args.max_points_per_frame <= 0 else args.max_points_per_frame,
		'boundingBoxPaddingPx': args.bounding_box_padding_px,
		'depthMarginMeters': args.depth_margin_meters,
		'generatedAssets': generated_assets,
	}
	(output_root / 'utd-catalog.json').write_text(f'{json.dumps(report, indent=2)}\n', encoding='utf-8')


def resolve_clip_specs(selected_clip_ids: list[str]) -> list[UtdClipSpec]:
	if not selected_clip_ids:
		return list(DEFAULT_CLIP_SPECS)

	specs_by_id = {spec.clip_id: spec for spec in DEFAULT_CLIP_SPECS}
	missing = [clip_id for clip_id in selected_clip_ids if clip_id not in specs_by_id]
	if missing:
		raise ValueError(f'Unknown --clip-id values: {missing}')
	return [specs_by_id[clip_id] for clip_id in selected_clip_ids]


def load_mat_array(archive: zipfile.ZipFile, member_name: str, key: str) -> np.ndarray:
	try:
		raw_bytes = archive.read(member_name)
	except KeyError as exc:
		raise FileNotFoundError(f'Archive member not found: {member_name}') from exc
	mat = scipy.io.loadmat(BytesIO(raw_bytes))
	if key not in mat:
		raise ValueError(f'Archive member "{member_name}" is missing expected MATLAB key "{key}".')
	return np.asarray(mat[key])


def write_clip_sequence(
	output_dir: Path,
	clip_spec: UtdClipSpec,
	depth_frames: np.ndarray,
	skeleton_world: np.ndarray,
	skeleton_screen: np.ndarray,
	max_points_per_frame: int,
	bounding_box_padding_px: int,
	depth_margin_meters: float,
	overwrite: bool,
) -> dict[str, object]:
	if output_dir.exists():
		if not overwrite:
			raise FileExistsError(
				f'Output directory already exists: {output_dir}. Re-run with --overwrite to replace it.'
			)
		shutil.rmtree(output_dir)
	output_dir.mkdir(parents=True, exist_ok=True)

	intrinsics = fit_kinect_intrinsics(skeleton_world, skeleton_screen)
	frame_files: list[str] = []
	frame_timestamps_ms: list[float] = []
	point_counts: list[int] = []
	frame_payload_bytes: list[int] = []

	for frame_index in range(depth_frames.shape[2]):
		points = extract_body_points(
			depth_frame_mm=depth_frames[:, :, frame_index],
			skeleton_world_frame=skeleton_world[:, :, frame_index],
			skeleton_screen_frame=skeleton_screen[:, :, frame_index],
			intrinsics=intrinsics,
			bounding_box_padding_px=bounding_box_padding_px,
			depth_margin_meters=depth_margin_meters,
			max_points_per_frame=max_points_per_frame,
		)
		colors = build_depth_colors(points)
		frame_filename = f'frame-{frame_index:04d}.ply'
		frame_bytes = encode_ascii_ply(points, colors)
		(output_dir / frame_filename).write_bytes(frame_bytes)
		frame_files.append(frame_filename)
		frame_timestamps_ms.append(round(frame_index * (1000.0 / DEFAULT_FPS), 3))
		point_counts.append(int(points.shape[0]))
		frame_payload_bytes.append(len(frame_bytes))

	manifest = {
		'version': 1,
		'fps': DEFAULT_FPS,
		'frameCount': depth_frames.shape[2],
		'frameTimestampsMs': frame_timestamps_ms,
		'frameFiles': frame_files,
		'clips': [
			{
				'id': 'full_clip',
				'startFrame': 0,
				'endFrame': depth_frames.shape[2] - 1,
				'mode': 'loop',
			}
		],
		'coordinateSystem': {
			'upAxis': 'y',
			'forwardAxis': 'z',
			'handedness': 'right',
			'description': 'UTD Kinect v2 depth camera space in meters, reconstructed offline from depth plus skeleton projection data.',
		},
		'units': 'meters',
		'processing': {
			'dataset': clip_spec.dataset,
			'sourceDescription': clip_spec.source_description,
			'generator': 'scripts/convert-utd-to-point-sequences.py',
			'bodyFilter': {
				'strategy': 'skeleton-screen-bounds-plus-depth-range',
				'boundingBoxPaddingPx': bounding_box_padding_px,
				'depthMarginMeters': depth_margin_meters,
				'dropZeroDepth': True,
			},
			'depthUnits': 'millimeters-to-meters',
			'bodyPointCountRange': [int(min(point_counts)), int(max(point_counts))],
			'averageBodyPoints': round(float(sum(point_counts) / len(point_counts)), 2),
			'maxPointsPerFrame': None if max_points_per_frame <= 0 else max_points_per_frame,
			'intrinsicsFit': {
				'fx': round(intrinsics.fx, 6),
				'fy': round(intrinsics.fy, 6),
				'cx': round(intrinsics.cx, 6),
				'cy': round(intrinsics.cy, 6),
				'uRmsePixels': round(intrinsics.u_rmse, 6),
				'vRmsePixels': round(intrinsics.v_rmse, 6),
			},
			'stressTest': {
				'loadingStrategy': 'eager-full-sequence',
				'framePayloadBytes': int(sum(frame_payload_bytes)),
				'framePayloadByteRange': [int(min(frame_payload_bytes)), int(max(frame_payload_bytes))],
			},
		},
		'capture': {
			'sensor': 'kinect-v2',
			'calibration': {
				'source': 'offline-fit-from-skeleton-world-and-screen-coordinates',
			},
			'metadata': {
				'archiveFile': clip_spec.archive_path.name,
				'depthMember': clip_spec.depth_member,
				'skeletonMember': clip_spec.skeleton_member,
			},
		},
	}
	(output_dir / 'manifest.json').write_text(f'{json.dumps(manifest, indent=2)}\n', encoding='utf-8')
	return manifest


def fit_kinect_intrinsics(skeleton_world: np.ndarray, skeleton_screen: np.ndarray) -> KinectIntrinsics:
	x = skeleton_world[:, 0, :].reshape(-1)
	y = skeleton_world[:, 1, :].reshape(-1)
	z = skeleton_world[:, 2, :].reshape(-1)
	u = skeleton_screen[:, 0, :].reshape(-1)
	v = skeleton_screen[:, 1, :].reshape(-1)
	valid_mask = (
		np.isfinite(x)
		& np.isfinite(y)
		& np.isfinite(z)
		& np.isfinite(u)
		& np.isfinite(v)
		& (z > 0)
		& (u > 0)
		& (v > 0)
	)
	if np.count_nonzero(valid_mask) < 8:
		raise ValueError('Not enough valid skeleton correspondences to fit depth intrinsics.')

	fx, cx = np.linalg.lstsq(
		np.column_stack([x[valid_mask] / z[valid_mask], np.ones(np.count_nonzero(valid_mask))]),
		u[valid_mask],
		rcond=None,
	)[0]
	fy, cy = np.linalg.lstsq(
		np.column_stack([-y[valid_mask] / z[valid_mask], np.ones(np.count_nonzero(valid_mask))]),
		v[valid_mask],
		rcond=None,
	)[0]
	u_rmse = float(
		np.sqrt(np.mean((fx * (x[valid_mask] / z[valid_mask]) + cx - u[valid_mask]) ** 2))
	)
	v_rmse = float(
		np.sqrt(np.mean((fy * (-y[valid_mask] / z[valid_mask]) + cy - v[valid_mask]) ** 2))
	)
	return KinectIntrinsics(
		fx=float(fx),
		fy=float(fy),
		cx=float(cx),
		cy=float(cy),
		u_rmse=u_rmse,
		v_rmse=v_rmse,
	)


def extract_body_points(
	depth_frame_mm: np.ndarray,
	skeleton_world_frame: np.ndarray,
	skeleton_screen_frame: np.ndarray,
	intrinsics: KinectIntrinsics,
	bounding_box_padding_px: int,
	depth_margin_meters: float,
	max_points_per_frame: int,
) -> np.ndarray:
	depth_frame_m = depth_frame_mm.astype(np.float32) / 1000.0
	joint_u = skeleton_screen_frame[:, 0]
	joint_v = skeleton_screen_frame[:, 1]
	joint_z = skeleton_world_frame[:, 2]
	valid_joint_mask = (
		np.isfinite(joint_u)
		& np.isfinite(joint_v)
		& np.isfinite(joint_z)
		& (joint_u > 0)
		& (joint_v > 0)
		& (joint_z > 0)
	)
	if not np.any(valid_joint_mask):
		raise ValueError('Encountered a frame without any valid skeleton joints.')

	min_u = max(0, int(np.floor(np.min(joint_u[valid_joint_mask]) - bounding_box_padding_px)))
	max_u = min(depth_frame_m.shape[1] - 1, int(np.ceil(np.max(joint_u[valid_joint_mask]) + bounding_box_padding_px)))
	min_v = max(0, int(np.floor(np.min(joint_v[valid_joint_mask]) - bounding_box_padding_px)))
	max_v = min(depth_frame_m.shape[0] - 1, int(np.ceil(np.max(joint_v[valid_joint_mask]) + bounding_box_padding_px)))
	min_z = max(0.1, float(np.min(joint_z[valid_joint_mask]) - depth_margin_meters))
	max_z = float(np.max(joint_z[valid_joint_mask]) + depth_margin_meters)

	cropped_depth = depth_frame_m[min_v : max_v + 1, min_u : max_u + 1]
	valid_depth_mask = (
		(cropped_depth > 0)
		& np.isfinite(cropped_depth)
		& (cropped_depth >= min_z)
		& (cropped_depth <= max_z)
	)
	if not np.any(valid_depth_mask):
		raise ValueError('Encountered a selected frame with zero valid body points after skeleton-based depth filtering.')

	v_coords, u_coords = np.nonzero(valid_depth_mask)
	u_coords = u_coords.astype(np.float32) + min_u
	v_coords = v_coords.astype(np.float32) + min_v
	z_coords = cropped_depth[valid_depth_mask]

	x_coords = ((u_coords - intrinsics.cx) / intrinsics.fx) * z_coords
	y_coords = -((v_coords - intrinsics.cy) / intrinsics.fy) * z_coords
	points = np.column_stack([x_coords, y_coords, z_coords]).astype(np.float32, copy=False)

	if max_points_per_frame > 0 and points.shape[0] > max_points_per_frame:
		points = points[evenly_spaced_indices(points.shape[0], max_points_per_frame)]
	return points


def build_depth_colors(points: np.ndarray) -> np.ndarray:
	if points.shape[0] == 0:
		return np.zeros((0, 3), dtype=np.uint8)
	z_values = points[:, 2]
	z_min = float(np.min(z_values))
	z_max = float(np.max(z_values))
	depth_range = max(z_max - z_min, 1e-6)
	normalized = np.clip((z_values - z_min) / depth_range, 0.0, 1.0)
	near = np.array([236.0, 244.0, 255.0], dtype=np.float32)
	far = np.array([84.0, 123.0, 168.0], dtype=np.float32)
	colors = near[None, :] * (1.0 - normalized[:, None]) + far[None, :] * normalized[:, None]
	return np.round(colors).astype(np.uint8)


def evenly_spaced_indices(source_count: int, target_count: int) -> np.ndarray:
	if target_count >= source_count:
		return np.arange(source_count, dtype=np.int64)
	indices = np.floor(np.arange(target_count, dtype=np.float64) * source_count / target_count).astype(np.int64)
	indices = np.maximum.accumulate(indices)
	indices[-1] = min(indices[-1], source_count - 1)
	return indices


def encode_ascii_ply(points: np.ndarray, colors: np.ndarray) -> bytes:
	header_lines = [
		'ply',
		'format ascii 1.0',
		f'element vertex {points.shape[0]}',
		'property float x',
		'property float y',
		'property float z',
		'property uchar red',
		'property uchar green',
		'property uchar blue',
		'end_header',
	]
	body_lines = [
		f'{point[0]:.6f} {point[1]:.6f} {point[2]:.6f} {int(color[0])} {int(color[1])} {int(color[2])}'
		for point, color in zip(points, colors, strict=True)
	]
	return ('\n'.join([*header_lines, *body_lines, ''])).encode('utf-8')


if __name__ == '__main__':
	main()
