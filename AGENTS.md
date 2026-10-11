This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Kurot integration

The Demo consumes npm `@kurot/skia` exactly at 0.1.5, with Core 2.5.3 and UI 3.5.0.
The dependency, lockfile and installation use the verified registry release;
generated assets include the original Spine 4.2 binary skeleton, atlas and PNG.
The SDK Spine dependency is registry 0.2.1. The default scene shows 20 Spineboy
players with staggered phases and opt-in 60 Hz shared pose caching. It can switch
to the original live SDK, synchronize phases, pause, and return to the UI scene.
Version 0.1.5 publication, registry download/integrity and all 130 compiled files
were verified against the prepared library build on 2026-10-11. It adds opt-in
NativePictureCache commands, runtime directory organization and grouped exports.
Use public package entries; Picture ownership/lifecycle and measurement limits
are documented in the installed docs/native-runtime.md. Notification callbacks
retain 0.1.4's native scene behavior; factory/viewport changes still recreate it.
The Demo retains one shared Core across Skia, UI and Spine. Frozen-lock installation,
generation, type checking, lint and iOS/Android production JS exports pass on
the 0.1.5 registry installation. Existing Metro peer metadata still reports
0.87.1 installed versus community CLI 0.86.3; only Skia changed in the lockfile.
The existing minimum-release-age policy has an exact @kurot/skia@0.1.5 exception
for this explicitly requested fresh release; keep other package policies intact.
For 0.1.3, the iPhone 17 Pro / iOS 26.5 Release simulator test entry passed adapter, resource,
text, KUI, all 48 GPU nine-slice cases, crop-cache lifecycle, and the registry
Spine cache checks (20 distinct phases, four GPU pose comparisons, clocks and
disposal). The ordinary Release Demo also passed manual mode/phase/pause controls,
UI click counts and enable state, and round-trip scene navigation. This establishes
simulator integration, not physical-device FPS.
This release uses native drawImageNine and cached atlas crops. Source frames and
nine-slice boundaries must be integer physical pixels; logical half-pixel grids
remain valid at 2× density. Keep the GPU and crop-cache native regressions.
Runtime and Metro imports use the installed package; resource/KUI generation uses
its `kurot-project` command. `pnpm dev` starts resource watch and the Expo development
client without a neighboring library checkout. Do not synchronize source-library
output into this registry installation. Local library development requires an
explicit switch to a `file:` dependency and the library's development workflow.
Keep Core/UI SDK sources unchanged; platform adaptation belongs in the Skia library.
