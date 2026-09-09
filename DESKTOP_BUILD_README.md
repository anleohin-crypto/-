# Leasing Team Manager — Windows Desktop Build

This branch/package wraps the existing Hebrew RTL React application in Electron and builds a Windows x64 NSIS installer.

## Runtime privacy
- The packaged application runs locally.
- Electron blocks HTTP/HTTPS/WS/WSS requests in packaged mode.
- Google Fonts were removed from `index.html`.
- `@google/genai` was removed from runtime dependencies.
- Existing application data remains in local browser storage inside Electron's per-user application profile.

## Build
On Windows with Node.js installed:

```powershell
npm install
npm run dist:win
```

Output:
`release/Leasing-Team-Manager-Setup-1.0.0-x64.exe`

## GitHub Actions
`.github/workflows/windows-build.yml` builds the same installer on a GitHub-hosted Windows runner and uploads it as an Actions artifact.

## Corporate deployment note
The installer is unsigned unless a code-signing certificate is configured. Windows SmartScreen, WDAC, AppLocker, Defender, or corporate endpoint controls may block unsigned executables even though the app itself does not require a development toolchain at runtime.
