# Migrating Component Tests to Angular Testing Library

## Goal

Replace the current `TestBed` + `ComponentFixture` pattern with [`@testing-library/angular`](https://testing-library.com/docs/angular-testing-library/intro), which encourages testing components the way a user actually interacts with them — via visible text, roles, and events — rather than reaching into implementation details.

---

## Scope

### Convert — component spec files

| File | Complexity | Notes |
|---|---|---|
| `src/app/components/speed-control/speed-control.component.spec.ts` | Low | Signal input, slider events, output |
| `src/app/components/seek-bar/seek-bar.component.spec.ts` | Low | Signal input, slider events, output |
| `src/app/components/file-upload/file-upload.component.spec.ts` | Medium | Signal input, DOM state, drop event |
| `src/app/components/waveform/waveform.component.spec.ts` | Medium | Canvas/ResizeObserver stubs, click output |
| `src/app/components/loop-region/loop-region.component.spec.ts` | Medium | Pointer drag events, output |
| `src/app/components/ios-install-hint/ios-install-hint.component.spec.ts` | Medium | UA mocking, fixture created per-test |
| `src/app/components/player/player.component.spec.ts` | High | Service providers, private VM access to remove |
| `src/app/app.spec.ts` | High | Service providers, `whenStable`, DOM queries |

### Leave unchanged — not component tests

- `src/app/services/audio-state.service.spec.ts` — pure service, no DOM
- `src/app/services/audio-engine.service.spec.ts` — service with `vi.mock`, no DOM
- `src/app/utils/format-duration.spec.ts` — pure function

---

## Step 1 — Install dependencies ✅

```bash
npm install --save-dev @testing-library/angular @testing-library/user-event
```

> **Do not install `@testing-library/jest-dom`.** Its `vitest.js` conditional export is picked up by Vite's dependency pre-bundler during Angular's `@angular/build` test run, causing "Vitest failed to find the runner" for every test file. Use plain assertions instead (see DOM query table below).

No changes needed to `src/test.setup.ts` or `tsconfig.spec.json`.

> **If "Vitest failed to find the runner" reappears after a package change**, run `rm -rf .angular/cache` to clear the Angular build cache, then re-run tests. A stale pre-bundled entry for the offending module can survive package uninstalls.

---

## Step 2 — Core pattern mapping

### Setup (beforeEach)

**Before**
```typescript
let fixture: ComponentFixture<SeekBarComponent>;
let component: SeekBarComponent;

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [SeekBarComponent],
  }).compileComponents();
  fixture = TestBed.createComponent(SeekBarComponent);
  component = fixture.componentInstance;
  fixture.componentRef.setInput('vm', DEFAULT_VM);
  fixture.detectChanges();
});
```

**After**
```typescript
async function setup(vmOverrides?: Partial<SeekBarVm>) {
  return render(SeekBarComponent, {
    inputs: { vm: { ...DEFAULT_VM, ...vmOverrides } },
  });
}
```

### DOM queries

| Before | After |
|---|---|
| `fixture.nativeElement.querySelector('.prompt')` | `screen.queryByText('...')` or `screen.queryByRole('...')` |
| `el.textContent?.trim()` | `screen.getByText('...')` (asserts presence) |
| `fixture.nativeElement.querySelector('input')` | `screen.getByRole('slider')` |
| `.classList.contains('active')` | `expect(el.classList.contains('active')).toBe(true)` |
| `el.disabled` | `expect((el as HTMLInputElement).disabled).toBe(true)` |
| `.querySelector('.hint-backdrop')` | `screen.queryByRole('...') ?? document.querySelector('.hint-backdrop')` |

Prefer semantic queries in this order: `getByRole` → `getByLabelText` → `getByText` → `getByTestId`. Fall back to `document.querySelector` only for structural elements with no semantic role (e.g., `.hint-backdrop`, `.waveform-wrap`).

### Signal inputs — mid-test changes

`fixture.componentRef.setInput()` is replaced by `rerender()`:

```typescript
const { rerender } = await setup();
await rerender({ inputs: { vm: { ...DEFAULT_VM, disabled: true } } });
```

### User events

| Before | After |
|---|---|
| `slider.value = '75'; slider.dispatchEvent(new Event('input'))` | `await userEvent.clear(slider); await userEvent.type(slider, '75')` |
| `element.click()` | `await userEvent.click(element)` |
| `element.dispatchEvent(new Event('change'))` | `fireEvent.change(element)` |

For low-level synthetic events (pointer events, custom events not modelled by `userEvent`), continue to use `fireEvent` from `@testing-library/dom`.

### Outputs

ATL does not have a built-in output spy. Use `on` bindings or subscribe via the component instance after render:

```typescript
// Option A — on binding (declarative)
const seekSpy = vi.fn();
await render(SeekBarComponent, {
  inputs: { vm: DEFAULT_VM },
  on: { seek: seekSpy },
});
fireEvent.change(screen.getByRole('slider'));
expect(seekSpy).toHaveBeenCalledWith(60);

// Option B — subscribe after render (when Option A is awkward)
const { fixture } = await render(SeekBarComponent, { inputs: { vm: DEFAULT_VM } });
const emitted: number[] = [];
fixture.componentInstance.seek.subscribe(v => emitted.push(v));
```

### Service providers

```typescript
await render(PlayerComponent, {
  providers: [
    { provide: AudioStateService,  useValue: stateStub },
    { provide: AudioEngineService, useValue: engineStub },
  ],
});
```

---

## Step 3 — File-by-file migration notes

### `speed-control.component.spec.ts`

Straightforward conversion. The `speedPercent` property is a simple getter — test it indirectly by checking the label rendered in the template (e.g., `screen.getByText('100%')`) rather than asserting on `component.speedPercent` directly. The active preset button check (`classList.contains('active')`) becomes `expect(btn).toHaveClass('active')`.

### `seek-bar.component.spec.ts`

The `displayValue` and `progressPct` getters are currently tested directly on the component instance. For ATL, test them via visible output in the template instead (the current-time element and the slider's visual state). Mid-test input changes use `rerender()`. The `isDragging` internal state is not tested directly — the drag/commit sequence tests serve as the observable behaviour instead.

### `file-upload.component.spec.ts`

DOM state tests (`querySelector('.prompt')`, `.loaded-info`, etc.) convert cleanly with `screen.queryByText` / `screen.queryByRole`. The `onDrop` test calls the method directly (no change needed since jsdom can't synthesise a real `DragEvent` with files); wrap in `act` if detectChanges is needed. File input test uses `fireEvent.change` after setting `input.files`.

### `waveform.component.spec.ts`

Keep the `vi.stubGlobal('ResizeObserver', ...)` and `vi.spyOn(HTMLCanvasElement.prototype, 'getContext', ...)` calls — they must run before `render()`. Because the waveform canvas has no semantic role, continue using `document.querySelector('.empty-state')` etc. for structural assertions. The `positionPct` getter (currently tested directly) should instead be verified through the playhead element's inline `left` style if rendered.

### `loop-region.component.spec.ts`

The pointer drag test relies on `getBoundingClientRect` mocking and `setPointerCapture` stubs — these stay as-is using `vi.spyOn` and `vi.fn()`. Dispatch `PointerEvent` via `fireEvent.pointerDown/Move/Up` or `element.dispatchEvent`. The `startPct` / `endPct` / `fillWidth` getters are currently tested directly; convert these to template assertions (e.g., check the `.track-fill` element's `width` style).

### `ios-install-hint.component.spec.ts`

This file creates the fixture inside individual tests (not `beforeEach`) to vary the UA before `ngOnInit` runs. The ATL equivalent is calling `render()` inside each test. The pattern maps cleanly: each test calls `render(IosInstallHintComponent)` after the UA spy is set up. DOM queries replace `querySelector('.hint-backdrop')` etc. The `visible()` signal is no longer asserted directly — test it by checking whether the modal element is in the document.

### `player.component.spec.ts`

The most significant refactor. Tests currently assert on private computed ViewModels (`component['seekBarVm']()`). These must be replaced with DOM-level assertions — render the component and check that the child component elements receive the correct values (e.g., the seek bar slider's `value` attribute or disabled state). The `togglePlay`, `stop`, and event handler tests that call methods directly and assert on stubs remain valid — access the component instance via `fixture.componentInstance` from the `render()` result.

### `app.spec.ts`

`fixture.whenStable()` becomes `await fixture.whenStable()` (no change in async handling needed with ATL — the render is already async). Private `fileUploadVm` accessor tests should be rewritten as DOM assertions on what the file-upload component visually shows. `querySelector('app-player')` continues to work via `document.querySelector` or `screen.queryByRole` if the player has a semantic landmark.

---

## Step 4 — Things to avoid

- **Do not test private signals or computed properties directly** (`component['seekBarVm']()`). These are implementation details. If the value matters, it is visible in the DOM.
- **Do not use `fixture.nativeElement` after migration** — this couples tests to DOM structure rather than user-observable behaviour.
- **Do not use `getByTestId` as a first resort** — prefer roles and labels. Add `data-testid` only where no accessible query applies.
- **Do not call `fixture.detectChanges()` manually** — ATL's `render` auto-detects changes; use `rerender()` for input updates.

---

## Suggested migration order

Work file-by-file rather than in one batch so tests remain green throughout. Suggested sequence:

1. Install packages and wire up `test.setup.ts` — verify all existing tests still pass. ✅
2. `speed-control.component.spec.ts` — simplest, establishes the pattern. ✅
3. `seek-bar.component.spec.ts` — similar structure. ✅
4. `file-upload.component.spec.ts` — adds `rerender()` for input changes. ✅
5. `loop-region.component.spec.ts` — introduces pointer events and style assertions. ✅
6. `waveform.component.spec.ts` — adds global stubs before `render()`. ✅
7. `ios-install-hint.component.spec.ts` — per-test `render()` calls. ✅
8. `player.component.spec.ts` — service stubs + removing private VM assertions. ✅
9. `app.spec.ts` — largest component, do last. ✅
