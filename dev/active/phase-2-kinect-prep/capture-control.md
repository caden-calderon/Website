# Phase 2 Capture Control

## Purpose

Define the operator workflow required to make Kinect capture usable in practice.

The current repo has an export contract. That is not enough for production capture. The operator needs live feedback and fast iteration:

- see a live preview while positioning the Kinect
- start/stop recording intentionally
- review takes immediately
- trim or reject bad takes quickly
- mark sync/alignment reference events
- do post-alignment work without rebuilding a second runtime

## Current Gap

What exists now:

- native helper-backed live Kinect preview when the helper can see the USB device
- real Kinect record/stop control through the capture-control CLI
- immutable raw takes under `tmp/kinect-capture/raw-takes/`
- edited take metadata under `tmp/kinect-capture/edited-takes/`
- browser take list/review tooling at `/capture-control`
- keep/discard/rename and trim metadata without mutating raw takes
- browser playback once a clip has been exported
- live preview in `/capture-control` works, but the browser/JSON path is visibly laggy compared with `Protonect`

What does not exist yet:

- a fully local/native operator app that matches `Protonect`-style preview smoothness
- local review/rename/keep-discard/trim/export without depending on the browser preview transport
- sync marker tooling
- optional external-camera association/alignment controls

## Required Operator Workflow

1. Open a capture control surface.
2. See live Kinect preview before recording.
3. Position the performer and Kinect against that preview.
4. Arm recording.
5. Start / stop a take explicitly.
6. Review the take immediately.
7. Keep / discard / rename the take.
8. Trim in/out if the take has extra dead time.
9. Export the selected raw/edited take into the existing RGBD sequence path.
10. Review the exported Kinect-only RGBD result in the existing browser playback path.
11. Only if Kinect RGB proves insufficient, add sync/alignment metadata for an external camera pass.

## Minimum Viable Feature Set

### 1. Live Preview

Must have:

- registered Kinect preview visible before recording
- at least depth preview and, if available, registered color preview
- frame/timestamp/status visibility
- dropped-frame / backend-health indicator

Nice later:

- overlay guides for centering and framing
- long-lived streaming preview process instead of one helper capture per preview request

### 2. Recording Controls

Must have:

- arm/record/stop
- explicit take id per recording
- capture timestamps per frame
- recording status and elapsed time

Nice later:

- hotkeys
- pre-roll / post-roll

### 3. Take Review

Must have:

- list recorded takes
- select a take
- play / pause / stop
- step or scrub through frames
- inspect frame/time index

Nice later:

- thumbnail strip
- loop selected range

### 4. Trim / Edit

Must have:

- set in point
- set out point
- export trimmed take without mutating raw source
- preserve original raw take

Nice later:

- split take
- duplicate trimmed selection as a new take

### 5. Sync / Alignment Prep

Must have:

- keep the edited-take data model ready for sync markers and external camera association
- only fill these fields if the optional hybrid branch becomes necessary

Nice later:

- calibration shot tagging
- alignment residual visualization

## Recommended Shape

Do not force the operator workflow into the Svelte browser demo.

Decision update:

- `/capture-control` proved the data model and command/API shape, but it is not the right final operator surface
- smooth preview and record control should be local/native, close to `Protonect` behavior
- the browser can remain useful for exported RGBD look-dev/playback, but it should not carry the live Kinect stream

The narrowest practical shape is:

1. Python capture service / CLI
- owns Kinect backend access
- owns live frame acquisition
- owns recording raw takes to disk

2. Local operator UI
- desktop-local first, not website-first
- can be implemented in Python/Qt, Dear ImGui, OpenCV HighGUI, SDL, a Tauri shell, or another lightweight local stack
- talks directly to the capture helper/service or embeds the capture loop
- focuses on smooth preview, record/stop, take review, rename, keep/discard, trim, and export actions
- owns only capture-control UX; it must preserve the existing raw-take and edited-take file contracts

3. Existing browser RGBD demo
- remains the playback/look-dev/export review surface
- should not become the low-level Kinect device-control runtime

## Data Model

Use three layers and keep them separate:

### Raw take

- immutable raw recording
- per-frame Kinect outputs and timestamps
- optional raw registered color, depth, and debug artifacts

### Edited take

- references a raw take
- stores trim in/out
- stores sync marker(s)
- stores external camera association
- stores notes / labels

### Exported bundle

- generated from an edited take
- becomes the existing capture bundle / RGBD manifest path

This prevents destructive editing and keeps trimming/review lightweight.

## First Narrow Implementation Target

This is now landed at scaffold level:

1. live preview window
2. record / stop
3. saved raw takes with timestamps
4. immediate take replay
5. take keep/discard
6. trim metadata without mutating raw frames

Verified live smoke:

- `record-start --provider live` / `record-stop` captured a stopped Kinect-only take with `70` RGBD frames
- raw output stayed in the capture-bundle format expected by `process.py export-rgbd`
- no-device/sandboxed runs still use mock fallback data
- idle live preview now uses a persistent helper-backed preview worker that keeps the Kinect open and writes `preview/latest.json`, instead of opening/closing the device on every browser poll
- preview frames are downsampled for the operator UI; raw recorded takes stay full registered Kinect depth-grid resolution

That is the minimum needed to stop blind positioning and start iterating intentionally.

## Second Target

Next target:

1. build a fully local operator app around the existing helper/data model
2. use direct local preview rather than base64 JSON through SvelteKit
3. record one intentional human take through the local app
4. keep/discard/rename and trim it locally
5. export the reviewed raw take through `process.py export-rgbd`
6. inspect the exported RGBD sequence in the existing browser playback route
7. only then decide whether sync/external-camera metadata needs to become active

The browser `/capture-control` route can remain as a scaffold/reference, but the next serious operator work should be local-first.

## Explicit Non-Goals

- do not build full NLE/video-editor tooling
- do not move asset routing into the engine
- do not add live hybrid alignment in the browser
- do not block preview/record controls on finished hand tracking

## Decision

The next useful work is not more browser preview tuning.

The next useful work is:

- a local operator app with smooth live preview
- intentional record/stop control
- immediate take review
- lightweight rename/keep-discard/trim metadata
- export of edited takes into the existing RGBD playback path

The hybrid path stays parked until Kinect-only capture has produced one reviewed/exported take and Kinect RGB has been proven insufficient.
