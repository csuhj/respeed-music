# Testable Architecture Refactor

## Goal

Restructure the application so that every component and service can be unit-tested in isolation,
without requiring mocks of the Web Audio API or full service wiring. The chosen approach is:

- **Service split** — separate state signals from browser API code
- **Smart containers / dumb components** — components receive typed ViewModels as `@Input()` and
  emit typed events via `@Output()`; only containers (App, Player) know about services
- **ViewModels** — typed interfaces that define exactly what each component needs

This requires no new libraries. It works with Angular's existing signals and dependency injection.

---

## New File Structure

```
src/app/
  models/
    view-models.ts              ← ViewModel interfaces (one per dumb component)
  services/
    audio-state.service.ts      ← signals only, no browser API (new)
    audio-engine.service.ts     ← Web Audio API + SoundTouch logic (renamed from audio.service.ts)
    audio.service.ts            ← DELETED once migration is complete
  components/
    file-upload/                ← becomes dumb (FileUploadVm input + fileSelected output)
    player/                     ← stays smart container (injects both services)
    seek-bar/                   ← becomes dumb (SeekBarVm input + seek output)
    speed-control/              ← becomes dumb (SpeedControlVm input + speedChange output)
    loop-region/                ← becomes dumb (LoopRegionVm input + 3 outputs)
    waveform/                   ← becomes dumb (WaveformVm input + seek output)
    ios-install-hint/           ← no change needed (already service-free)
```

---

## Phase 1 — Split AudioService into Two Services ✓ COMPLETED

### 1a. `AudioStateService` (`services/audio-state.service.ts`)

Pure signals. No Web Audio API. Fully testable by instantiating directly.

```typescript
@Injectable({ providedIn: 'root' })
export class AudioStateService {
  readonly fileName    = signal('');
  readonly duration    = signal(0);
  readonly position    = signal(0);
  readonly isLoaded    = signal(false);
  readonly isPlaying   = signal(false);
  readonly speed       = signal(1.0);
  readonly error       = signal<string | null>(null);
  readonly audioBuffer = signal<AudioBuffer | null>(null);
  readonly loopEnabled = signal(false);
  readonly loopStart   = signal(0);
  readonly loopEnd     = signal(0);
}
```

All signal writes move out of `AudioService` into `AudioEngineService`, which injects
`AudioStateService` and calls `.set()` on its signals.

### 1b. `AudioEngineService` (`services/audio-engine.service.ts`)

All existing `AudioService` logic, updated to read/write state via `AudioStateService`.

```typescript
@Injectable({ providedIn: 'root' })
export class AudioEngineService {
  private readonly state = inject(AudioStateService);

  // All private Web Audio fields remain here:
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private stNode: SoundTouchNode | null = null;
  private gainNode: GainNode | null = null;
  private startContextTime = 0;
  private seekOffset = 0;
  private workletRegistered = false;
  private positionTimer: ReturnType<typeof setInterval> | null = null;
  private loopRestarting = false;

  // Public API — same method signatures as the current AudioService:
  async load(file: File): Promise<void> { ... }
  async play(): Promise<void>           { ... }
  pause(): void                         { ... }
  stop(): void                          { ... }
  seek(seconds: number): void           { ... }
  setSpeed(ratio: number): void         { ... }
  setLoopStart(seconds: number): void   { ... }
  setLoopEnd(seconds: number): void     { ... }
}
```

Anywhere the current code does `this.isPlaying.set(true)` it becomes
`this.state.isPlaying.set(true)`, and so on for all signals.

**Testing `AudioEngineService`:** inject a real `AudioStateService` (no mock needed for that),
mock the `AudioContext` (already stubbed in `test.setup.ts` for the AudioWorklet). Assert that
after calling `engine.play()`, `state.isPlaying()` is `true`, etc.

---

## Phase 2 — Define ViewModels ✓ COMPLETED

Create `src/app/models/view-models.ts`. One interface per dumb component; each contains only
what that component actually renders or uses in calculations.

```typescript
export interface FileUploadVm {
  isLoaded: boolean;
  fileName: string;
  duration: number;
  error: string | null;
}

export interface PlayerControlsVm {
  isPlaying: boolean;
  fileName: string;
  disabled: boolean;
}

export interface SeekBarVm {
  position: number;
  duration: number;
  disabled: boolean;
}

export interface SpeedControlVm {
  speed: number;     // ratio: 0.5 = 50 %, 1.0 = 100 %
  disabled: boolean;
}

export interface LoopRegionVm {
  loopEnabled: boolean;
  loopStart: number;   // seconds
  loopEnd: number;     // seconds
  duration: number;    // seconds
}

export interface WaveformVm {
  audioBuffer: AudioBuffer | null;
  position: number;
  duration: number;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
}
```

---

## Phase 3 — Refactor Dumb Components ✓ COMPLETED

Each component loses its `inject(AudioService)` call. It gains:
- A single `vm = input.required<XxxVm>()` for data
- One or more `@Output() EventEmitter<T>` for user actions

Pure UI state (e.g. drag-in-progress, dragValue) stays in the component — it is not
application state and does not belong in any service.

### `SeekBarComponent`

```
@Input  vm: SeekBarVm        — position, duration, disabled
@Output seek: number         — committed seek target in seconds
```

Internal drag tracking (`isDragging`, `dragValue`) remains as component-local fields.
`displayValue` and `progressPct` are computed from `vm()` plus the local drag state.
`onCommit()` emits to `seek` instead of calling `audio.seek()`.

### `SpeedControlComponent`

```
@Input  vm: SpeedControlVm   — speed ratio, disabled
@Output speedChange: number  — new speed ratio
```

Preset buttons and slider both emit to `speedChange`.
`speedPercent` computed from `vm().speed * 100`.

### `LoopRegionComponent`

```
@Input  vm: LoopRegionVm     — loopEnabled, loopStart, loopEnd, duration
@Output loopToggle           — user toggled the loop on/off button
@Output loopStartChange: number
@Output loopEndChange: number
```

All drag geometry calculations (`startPct`, `endPct`, `fillLeft`, `fillWidth`, `pointerToTime`)
stay in the component — they depend only on `vm()` fields. The `MIN_LOOP_SPAN` constant and
enforcement logic remain here; outputs emit the clamped values.

### `WaveformComponent`

```
@Input  vm: WaveformVm       — audioBuffer, position, duration, loop state
@Output seek: number         — user clicked waveform to seek
```

Canvas drawing, ResizeObserver, and effect() all remain — they depend only on `vm()`.

### `FileUploadComponent`

```
@Input  vm: FileUploadVm     — isLoaded, fileName, duration, error
@Output fileSelected: File   — user chose a file (drag or click)
```

Drag-over local state (`isDragOver`) stays in the component.
`onDrop()` and `onFileSelected()` emit to `fileSelected` instead of calling `audio.load()`.

---

## Phase 4 — Smart Containers ✓ COMPLETED

### `PlayerComponent`

Injects both services. Builds `computed()` ViewModels for every child. Handles all outputs
by calling `AudioEngineService` or writing directly to `AudioStateService`.

```typescript
export class PlayerComponent {
  private readonly state  = inject(AudioStateService);
  private readonly engine = inject(AudioEngineService);

  readonly controlsVm = computed<PlayerControlsVm>(() => ({
    isPlaying: this.state.isPlaying(),
    fileName:  this.state.fileName(),
    disabled:  !this.state.isLoaded(),
  }));

  readonly seekBarVm = computed<SeekBarVm>(() => ({
    position: this.state.position(),
    duration: this.state.duration(),
    disabled: !this.state.isLoaded(),
  }));

  readonly speedVm = computed<SpeedControlVm>(() => ({
    speed:    this.state.speed(),
    disabled: !this.state.isLoaded(),
  }));

  readonly loopVm = computed<LoopRegionVm>(() => ({
    loopEnabled: this.state.loopEnabled(),
    loopStart:   this.state.loopStart(),
    loopEnd:     this.state.loopEnd(),
    duration:    this.state.duration(),
  }));

  readonly waveformVm = computed<WaveformVm>(() => ({
    audioBuffer: this.state.audioBuffer(),
    position:    this.state.position(),
    duration:    this.state.duration(),
    loopStart:   this.state.loopStart(),
    loopEnd:     this.state.loopEnd(),
    loopEnabled: this.state.loopEnabled(),
  }));

  togglePlay(): void {
    this.state.isPlaying() ? this.engine.pause() : this.engine.play();
  }

  onSeek(s: number):           void { this.engine.seek(s); }
  onSpeedChange(r: number):    void { this.engine.setSpeed(r); }
  onLoopToggle():              void { this.state.loopEnabled.update(v => !v); }
  onLoopStartChange(s: number): void { this.engine.setLoopStart(s); }
  onLoopEndChange(s: number):  void { this.engine.setLoopEnd(s); }
}
```

Template — binds computed signals to child inputs, routes outputs to handler methods:

```html
<app-waveform
  [vm]="waveformVm()"
  (seek)="onSeek($event)" />

<app-seek-bar
  [vm]="seekBarVm()"
  (seek)="onSeek($event)" />

<button [disabled]="controlsVm().disabled" (click)="togglePlay()">
  {{ controlsVm().isPlaying ? '⏸' : '▶' }}
</button>

<app-speed-control
  [vm]="speedVm()"
  (speedChange)="onSpeedChange($event)" />

<app-loop-region
  [vm]="loopVm()"
  (loopToggle)="onLoopToggle()"
  (loopStartChange)="onLoopStartChange($event)"
  (loopEndChange)="onLoopEndChange($event)" />
```

### `App` (root component)

Injects both services. Builds `FileUploadVm`. Handles `fileSelected` output.

```typescript
export class App {
  private readonly state  = inject(AudioStateService);
  private readonly engine = inject(AudioEngineService);

  readonly fileUploadVm = computed<FileUploadVm>(() => ({
    isLoaded: this.state.isLoaded(),
    fileName: this.state.fileName(),
    duration: this.state.duration(),
    error:    this.state.error(),
  }));

  onFileSelected(file: File): void {
    this.engine.load(file);
  }
}
```

---

## Phase 5 — Unit Tests ✓ COMPLETED

### `AudioStateService`

No mocking at all — instantiate directly and assert signals:

```typescript
it('defaults to not loaded', () => {
  const state = new AudioStateService();
  expect(state.isLoaded()).toBe(false);
});

it('loopEnabled can be toggled', () => {
  const state = new AudioStateService();
  state.loopEnabled.set(true);
  expect(state.loopEnabled()).toBe(true);
});
```

### `AudioEngineService`

Inject a real `AudioStateService`. Mock `AudioContext` (already handled by `test.setup.ts`):

```typescript
it('sets isPlaying after play()', async () => {
  const state = new AudioStateService();
  const engine = new AudioEngineService(state); // constructor injection in test
  // seed a buffer so play() proceeds
  state.audioBuffer.set(mockAudioBuffer);
  await engine.play();
  expect(state.isPlaying()).toBe(true);
});
```

### Dumb components

No service providers needed — just pass a ViewModel literal:

```typescript
// SeekBarComponent
it('emits seek value on commit', () => {
  fixture.componentRef.setInput('vm', { position: 10, duration: 120, disabled: false });
  let emitted: number | undefined;
  fixture.componentInstance.seek.subscribe(v => emitted = v);
  // simulate slider change + blur/change event
  expect(emitted).toBe(45);
});

it('shows drag value while dragging, not position', () => {
  fixture.componentRef.setInput('vm', { position: 10, duration: 120, disabled: false });
  // simulate input event (sets isDragging, dragValue)
  expect(fixture.componentInstance.displayValue).toBe(/* drag value */);
});
```

### Smart containers (`PlayerComponent`, `App`)

Provide stub implementations of both services — simple objects with signal properties:

```typescript
const stateStub = {
  isPlaying: signal(false),
  fileName:  signal('test.mp3'),
  isLoaded:  signal(true),
  position:  signal(0),
  duration:  signal(120),
  speed:     signal(1.0),
  // ...
};

const engineStub = {
  play:         jasmine.createSpy(),
  pause:        jasmine.createSpy(),
  seek:         jasmine.createSpy(),
  setSpeed:     jasmine.createSpy(),
  setLoopStart: jasmine.createSpy(),
  setLoopEnd:   jasmine.createSpy(),
};

TestBed.configureTestingModule({
  providers: [
    { provide: AudioStateService,  useValue: stateStub },
    { provide: AudioEngineService, useValue: engineStub },
  ],
});
```

---

## Implementation Order

1. **Create `AudioStateService`** — copy signals out of `AudioService`, no other changes
2. **Create `AudioEngineService`** — copy all logic from `AudioService`, update all signal
   reads/writes to go through the injected `AudioStateService`
3. **Verify the app still works** — update any existing injection sites to use the new services;
   delete `AudioService`
4. **Create `view-models.ts`**
5. **Refactor one dumb component end-to-end** (recommend `SeekBarComponent` — simplest) and
   write its tests before moving to the next
6. **Refactor remaining dumb components** in order: `SpeedControlComponent`,
   `LoopRegionComponent`, `WaveformComponent`, `FileUploadComponent`
7. **Refactor smart containers**: `PlayerComponent`, then `App`
8. **Write tests** for `AudioStateService`, `AudioEngineService`, and all containers

---

## What Does Not Change

- `IosInstallHintComponent` — already has no service dependency; no changes needed
- `formatDuration` utility — stays in `utils/format-duration.ts`, imported directly by components
- All templates (aside from binding syntax updates in Player and App)
- All SCSS files
- The `test.setup.ts` AudioWorklet stub — still needed for `AudioEngineService` tests
- `angular.json`, `tsconfig` files, asset copy rules
