# Changelog

## Unreleased

- Links to the developer page in the missing-key error, the example and the README carry a source tag.
- README pricing updated: free plan, paid plans from $9/month.

## 0.1.3

- Fix `exports` map for CommonJS TypeScript consumers: `require` now resolves the CJS declaration file (`index.d.cts`). Previously, TypeScript projects using `"moduleResolution": "nodenext"` from CJS got error TS1479. Plain JavaScript consumers were unaffected.

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
