# RespeedMusic — Implementation Plan

## Overview

An Angular SPA that loads an audio file and plays it back at variable speed without changing pitch.
The core time-stretching is handled by `@soundtouchjs/audio-worklet`, which implements the WSOLA
algorithm on a dedicated AudioWorklet thread.

---

## Library Choice

| Option | Verdict |
|--------|---------|
| `@soundtouchjs/audio-worklet` | **Chosen.** AudioWorklet-based SoundTouch — time-stretch without pitch shift, runs off the main thread |
| `soundtouch-js` (legacy) | Uses deprecated ScriptProcessorNode — avoid |
| Tone.js `Player` | Changes pitch when rate changes — not suitable |
| Native Web Audio `playbackRate` | Also shifts pitch — not suitable |
| wavesurfer.js | Wraps SoundTouch anyway and adds unnecessary complexity |

---

## Supported Audio Formats

The Web Audio API's `decodeAudioData` handles whatever the browser supports natively:

| Format | Notes |
|--------|-------|
| MP3    | Universal support |
| WAV    | Universal support |
| OGG/Vorbis | Chrome/Firefox; not Safari |
| AAC / M4A  | Chrome/Safari; Firefox varies |
| FLAC   | Modern Chrome/Firefox/Safari |
| WebM/Opus  | Chrome/Firefox |

All formats are accepted at upload; decode errors are caught and shown to the user.

---

## Project Structure

```
respeed-music/          ← Angular project root (all deps installed locally)
  node_modules/
  package.json
  angular.json
  src/
    app/
      components/
        file-upload/    ← drag-and-drop + click to upload
        player/         ← main playback UI host
        speed-control/  ← slider 25%–200%
        seek-bar/       ← position display + click-to-seek
        loop-region/    ← (stretch) A/B loop point selector
      services/
        audio.service.ts  ← all Web Audio API + SoundTouch logic
      app.component.ts
      app.component.html
      app.component.scss
    assets/
      soundtouch-processor.js  ← worklet processor (copied from node_modules/dist)
```

---

## Implementation Steps

### Step 1 — Bootstrap the Angular project locally

Angular CLI is installed as a local dev dependency only — no global install required.

```bash
# From the project root (/d/Projects/RespeedMusic in git-bash)
npm init -y

# Install Angular CLI locally
npm install --save-dev @angular/cli

# Scaffold the Angular app into the current directory using the local CLI
npx ng new respeed-music --directory . --standalone --routing false --style scss --skip-git
```

> All subsequent `ng` commands are run via `npx ng` to use the local CLI.

---

### Step 2 — Install dependencies

```bash
# Runtime: SoundTouch AudioWorklet + Angular Material
npm install @soundtouchjs/audio-worklet
npm install @angular/material @angular/cdk

# No additional dev dependencies needed beyond what ng new installs
```

Configure `angular.json` to copy the SoundTouch worklet script into `assets/` at build time:

```json
"assets": [
  {
    "glob": "**/*",
    "input": "public"
  },
  {
    "glob": "soundtouch-processor.js",
    "input": "node_modules/@soundtouchjs/audio-worklet",
    "output": "assets"
  }
]
```

---

### Step 3 — `AudioService`

The central service that owns all audio state. Components call into it and observe its signals/Observables.

**Responsibilities:**
- Decode an uploaded `File` into an `AudioBuffer` via `AudioContext.decodeAudioData`
- Build the AudioWorklet processing graph:
  `AudioBufferSource → SoundTouchWorkletNode → GainNode → Destination`
- Expose methods: `load(file)`, `play()`, `pause()`, `stop()`, `seek(seconds)`, `setSpeed(ratio)`
- Emit current playback position on a `setInterval` ticker for the seek bar
- Track loop state: A/B points and an active toggle

**Key implementation note:** AudioWorklets load from a separate script URL. The worklet is registered
once via `audioContext.audioWorklet.addModule('assets/soundtouch-processor.js')` before the graph
is first built.

---

### Step 4 — `FileUploadComponent`

- Drag-and-drop zone with an `<input type="file" accept="audio/*">` fallback
- On file selection, calls `AudioService.load(file)`
- Displays the file name and total duration once decoded
- Shows an error message if the format cannot be decoded

---

### Step 5 — `PlayerComponent`

The main playback UI — composes the sub-components:

- **Play / Pause / Stop** buttons
- **`SeekBarComponent`** — a range input that reflects current position and allows click-to-seek;
  updates every ~250 ms from the service's position Observable
- **`SpeedControlComponent`** — a slider from 25% to 200% (step 5%), default 100%;
  shows a numeric readout; calls `AudioService.setSpeed()` on change
- **Time display** — `current / total` in `mm:ss` format

---

### Step 6 — `LoopRegionComponent` *(stretch goal)*

- A thin timeline bar overlaid with two draggable handles: **A** (loop start) and **B** (loop end)
- A toggle button to arm/disarm the loop
- When armed, `AudioService` monitors playback position and re-queues from A when B is reached
- Loop points persist when speed or seek position changes

---

### Step 7 — Styling and polish

- SCSS theming — dark or light player skin (decide at build time)
- Optional waveform visualisation using the native `AnalyserNode` + a Canvas element —
  no extra library needed
- Responsive layout so it works at narrow viewport widths

---

## Key Technical Notes

### AudioWorklet script context
Worklet processors run in an isolated scope and must be loaded from a URL, not bundled inline.
The `angular.json` asset copy rule (Step 2) ensures `assets/soundtouch-worklet.js` is available
at runtime.

### Speed ratio
SoundTouch accepts a tempo multiplier where `1.0` = normal speed. The UI slider maps percentages
to this ratio: 50% → `0.5`, 100% → `1.0`, 200% → `2.0`.

### Seek + restart
The Web Audio API does not support scrubbing a live `AudioBufferSourceNode`. Seeking requires
stopping the current node, creating a new one, and starting it at the desired offset — this is
handled transparently inside `AudioService`.
