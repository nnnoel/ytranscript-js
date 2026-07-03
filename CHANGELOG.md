# Changelog

## 0.1.2

- SDK moved to its own public repository: [nnnoel/ytranscript-js](https://github.com/nnnoel/ytranscript-js)
- Added `bugs` and updated `repository` metadata so npm links resolve publicly
- Added `typecheck` script; `prepublishOnly` now typechecks before building
- Docs: full API reference, error-code table, runtime support notes

## 0.1.1

- Honest-marketing pass on the package description (risk-transfer framing instead of absolute claims)

## 0.1.0

- Initial release: `YTranscript` client with `transcript()`, typed `Transcript`/`TranscriptSegment` results, `YTranscriptError` with stable error codes, `lastQuota` usage info
- Zero runtime dependencies, CJS + ESM + TypeScript declarations
