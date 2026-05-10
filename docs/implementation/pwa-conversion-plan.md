# PWA Conversion Plan — respeed-music

## Current state

The app has no PWA infrastructure. Core audio functionality works in iOS Safari 14.5+, but:

- No offline support (network required on every visit)
- No web app manifest — iOS doesn't know it's installable
- If added to Home Screen manually, opens in Safari browser chrome (address bar visible) rather than standalone full-screen, because the `apple-mobile-web-app-capable` meta tag is absent
- No splash screen or custom Home Screen icon

---

## Sub-path hosting

The plan is written to support deployment at a sub-path (e.g. `https://www.example.com/respeed-music`) as well as at a root domain. Several steps require specific care to make this work — each is called out inline below. The short version:

| Thing that breaks at a sub-path | Fix |
|---|---|
| All Angular asset/route URLs (the `<base href>` tag) | Set `baseHref` in `angular.json` production config |
| Manifest `start_url` and `scope` default to `"/"` | Use `"./"` (relative) instead |
| Absolute icon paths in manifest / `index.html` | Use relative paths throughout (no leading `/`) |

The service worker registration (`provideServiceWorker('ngsw-worker.js', ...)`) already uses a relative path and requires no change — once `baseHref` is correct it registers at the right scope automatically.

---

## Implementation steps

### 1. Set `baseHref` in `angular.json`

Before running the schematic, add `baseHref` to the production build configuration in `angular.json` so the correct `<base href>` is baked into every production build. All Angular asset URLs, routes, and the service worker registration derive from this value.

```json
"configurations": {
  "production": {
    "baseHref": "/respeed-music/",
    ...
  }
}
```

If the deployment path is not yet known, this can also be supplied at build time: `ng build --base-href /respeed-music/`. Either way it must be set — the default `"/"` will cause every URL to resolve incorrectly at a sub-path.

### 2. Add `@angular/pwa` via schematic

```bash
ng add @angular/pwa
```

This generates:
- `ngsw-config.json` — service worker cache configuration
- `src/manifest.webmanifest` — web app manifest
- Wires `ServiceWorkerModule` into `app.config.ts`
- Adds `<link rel="manifest">` and `<meta name="theme-color">` to `index.html`
- Adds placeholder icons at 192×192 and 512×512

**Sub-path fix — manifest `start_url` and `scope`:** The schematic hard-codes `"start_url": "/"` and `"scope": "/"`. Change both to `"./"` immediately after running it. Relative values work at any deployment path without modification:

```json
{
  "start_url": "./",
  "scope": "./"
}
```

### 3. Generate app icons

Render `public/favicon.svg` to the icon sizes required by both the manifest and iOS, and regenerate `public/favicon.ico`.

A script at `scripts/generate-icons.mjs` should be kept in the repo so that all outputs can be regenerated whenever the source SVG changes. Use `sharp` to batch-render everything from the SVG in one pass.

Run with:

```bash
npm install --save-dev sharp   # only needed once
node scripts/generate-icons.mjs
```

**Outputs — PWA icons** (written to `public/icons/`):

| File | Used by |
|---|---|
| `icon-72x72.png` | Manifest (legacy) |
| `icon-96x96.png` | Manifest |
| `icon-128x128.png` | Manifest |
| `icon-144x144.png` | Manifest / iOS |
| `icon-152x152.png` | iOS (iPad) |
| `icon-167x167.png` | iOS (iPad Pro) |
| `icon-180x180.png` | iOS (iPhone) — `apple-touch-icon` |
| `icon-192x192.png` | Manifest / Android |
| `icon-384x384.png` | Manifest |
| `icon-512x512.png` | Manifest / splash |

**Outputs — browser favicon** (written to `public/`):

| File | Used by |
|---|---|
| `favicon.ico` | All browsers (16×16, 32×32, 48×48 multi-size) |

The `.ico` generation reuses the same script so there is a single source of truth: edit `public/favicon.svg`, run `node scripts/generate-icons.mjs`, and all icon artefacts are refreshed.

### 4. Update `index.html` with Apple-specific meta tags

iOS ignores the standard web app manifest for several properties and requires its own meta tags:

```html
<!-- Standalone mode on iOS -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Respeed" />

<!-- Home Screen icon (iOS ignores manifest icons) -->
<link rel="apple-touch-icon" sizes="180x180" href="icons/icon-180x180.png" />
<link rel="apple-touch-icon" sizes="167x167" href="icons/icon-167x167.png" />
<link rel="apple-touch-icon" sizes="152x152" href="icons/icon-152x152.png" />

<!-- Theme colour -->
<meta name="theme-color" content="#121212" />
```

**Sub-path note:** icon `href` values above intentionally have no leading `/`. With `<base href="/respeed-music/">` in place, the browser resolves `icons/icon-180x180.png` to `/respeed-music/icons/icon-180x180.png` automatically. Do not add a leading slash — that would break sub-path deployments.

### 5. Configure `ngsw-config.json`

Tune the generated service worker config for this app's assets and the audio worklet:

- Cache all app shell assets (`index.html`, JS/CSS bundles, icons)
- Cache `soundtouch-processor.js` (the AudioWorklet)
- Use a `freshness` strategy for the app shell so updates are picked up on next visit

### 6. Add iOS "Add to Home Screen" hint component

iOS Safari does not fire `beforeinstallprompt`. The only way to guide users is a custom in-app banner.

**Logic:**
1. Detect iOS Safari: `navigator.userAgent` matches iPhone/iPad + Safari, *not* Chrome/Firefox/other
2. Check not already standalone: `window.navigator.standalone === false`
3. Check not previously dismissed: no `pwa-hint-dismissed` key in `localStorage`
4. Show a bottom sheet / tooltip with the instruction and a share-button icon
5. On dismiss, write `pwa-hint-dismissed=true` to `localStorage`

**Component:** `src/app/components/ios-install-hint/ios-install-hint.component.ts`  
**Rendered in:** `src/app/app.html` (top level, so it overlays everything)

---

## Files changed / created

| File | Change |
|---|---|
| `src/manifest.webmanifest` | New — web app manifest |
| `ngsw-config.json` | New — service worker cache config |
| `src/app/app.config.ts` | Add `provideServiceWorker()` |
| `src/index.html` | Add manifest link, theme-color, Apple meta tags, apple-touch-icon links |
| `src/app/components/ios-install-hint/` | New component |
| `src/app/app.html` | Render `<app-ios-install-hint>` |
| `scripts/generate-icons.mjs` | New — kept in repo; regenerates all icons + favicon.ico from favicon.svg |
| `public/icons/icon-*.png` | New — all required icon sizes |
| `public/favicon.ico` | Regenerated by script (16×32×48 px) |
| `angular.json` | Add `baseHref` to production config; `serviceWorker: true` + `ngswConfigPath` added by schematic |

---

## Notes

- The service worker only activates in a production build (`ng build`). `ng serve` bypasses it intentionally.
- iOS 16.4+ added partial support for the Web App Manifest install flow, but the custom hint banner is still necessary for iOS 16.3 and below, which represents a significant share of active devices.
- Audio playback on iOS always requires a user gesture — this is already satisfied by the file-upload interaction, so no changes are needed there.
