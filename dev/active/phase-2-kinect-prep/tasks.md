# Phase 2 Kinect Prep Tasks

## Foundation

- [ ] Harden `GLPointRenderer` for capacity-aware attribute reuse and active-range bounds
- [ ] Add tests covering variable active counts with fixed-capacity buffers
- [ ] Confirm `SampleSet.count` semantics in engine docs/comments

## PLY Ingest

- [ ] Implement `PlyAdapter`
- [ ] Support binary little-endian first, ASCII second
- [ ] Reject unsupported formats clearly (`binary_big_endian`, list properties in vertex payload, compressed variants)
- [ ] Normalize color based on property type, not just property name
- [ ] Add parser tests for malformed headers, property reordering, CRLF headers, and missing color data

## Animation Runtime

- [ ] Implement animation types and tick result semantics
- [ ] Implement `FrameSequence`
- [ ] Add clip tests for loop / once / ping-pong endpoint behavior
- [ ] Ensure frame data only copies when the visible frame index changes
- [ ] Implement `FrameSequenceLoader` with injected frame-loading callbacks
- [ ] Define and document the sequence manifest format

## Synthetic Assets

- [ ] Generate a synthetic test sequence plus manifest
- [ ] Verify browser playback against the shared-buffer runtime

## Kinect Scaffold

- [ ] Create `capture.py`
- [ ] Run a one-frame registration/export spike as soon as hardware arrives
- [ ] Create `process.py` with registration-backed XYZRGB export
- [ ] Create `hands.py`
- [ ] Write README/setup notes for Arch Linux and libfreenect2

## Integration

- [ ] Wire the sequence runtime into the scene/app layer
- [ ] Define hand-landmark alignment into point-cloud space
- [ ] Coordinate playback/runtime work with CharacterDirector behavior and interaction contracts
- [ ] Package the Phase 1 demo cleanly as a first-class project inside the website
