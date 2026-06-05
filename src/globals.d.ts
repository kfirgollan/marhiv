// Build-time constants injected by Vite's `define` (see vite.config.ts). They let
// a loaded extension announce its exact version and build, to confirm a reload
// actually picked up new code.
declare const __MARHIV_VERSION__: string
declare const __MARHIV_BUILD__: string
// True only for an explicit release build (`npm run build:release`). Forces
// info-level logging regardless of how the extension is loaded.
declare const __MARHIV_RELEASE__: boolean
