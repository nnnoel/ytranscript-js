# ytranscript-api

[![npm version](https://img.shields.io/npm/v/ytranscript-api.svg)](https://www.npmjs.com/package/ytranscript-api)
[![CI](https://github.com/nnnoel/ytranscript-js/actions/workflows/ci.yml/badge.svg)](https://github.com/nnnoel/ytranscript-js/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Official JavaScript/TypeScript client for the [yTranscript API](https://ytranscript.com/developers) — reliable YouTube transcript extraction without proxy management or player-response scraping.

- **Your servers never touch YouTube** — bot detection becomes our problem, not yours. Multi-strategy extraction (edge → direct → residential → Whisper) maximizes success, and failed requests are never charged.
- **Captionless videos work** — automatic Whisper speech-to-text fallback, one endpoint for every video.
- **Simple and typed** — one method, structured segments, zero runtime dependencies, CJS + ESM + types.

Works in Node.js ≥ 18, Bun, Deno, and edge runtimes (anything with `fetch`).

## Install

```bash
npm install ytranscript-api
```

## Quickstart

```ts
import { YTranscript } from "ytranscript-api";

const yt = new YTranscript("yk_live_...");   // get a key at ytranscript.com/developers

const t = await yt.transcript("dQw4w9WgXcQ");  // video ID or any YouTube URL
console.log(t.lang);          // "en"
console.log(t.segments[0]);   // { text: "We're no strangers to love", offset: 18800, duration: 3600 }
console.log(t.text);          // full transcript as one string
console.log(t.whisper);       // true if Whisper produced it (captionless video)

console.log(yt.lastQuota);    // { limit: 10000, used: 42, rateLimitRemaining: 59 }
```

## API

### `new YTranscript(apiKey, options?)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://ytranscript.com/api/v1` | Override the API base URL (rarely needed) |
| `timeoutMs` | `number` | `120000` | Request timeout — Whisper fallbacks on long videos take time |

### `yt.transcript(videoIdOrUrl, options?)`

Accepts an 11-character video ID or any YouTube URL (`youtube.com/watch`, `youtu.be/…`, shorts, embeds).

| Option | Type | Description |
| --- | --- | --- |
| `lang` | `string` | Preferred language code (e.g. `"en"`, `"es"`). Defaults to the video's source language. |

Returns a `Transcript`:

```ts
interface Transcript {
  videoId: string;
  lang: string;             // language of the returned transcript
  whisper: boolean;         // produced by Whisper speech-to-text
  cached: boolean;          // served from cache (always 1 unit)
  unitsCharged: number;     // captions: 1, Whisper: 15
  segments: { text: string; offset: number; duration: number }[];  // ms offsets
  text: string;             // convenience: all segment text joined
}
```

### `yt.lastQuota`

Quota headers from the most recent successful request: `{ limit, used, rateLimitRemaining }`.

## Error handling

Every failure throws a typed `YTranscriptError`:

```ts
import { YTranscript, YTranscriptError } from "ytranscript-api";

try {
  await yt.transcript(videoId);
} catch (err) {
  if (err instanceof YTranscriptError) {
    switch (err.code) {
      case "no_transcript":   // 404 — video has no obtainable transcript
      case "quota_exceeded":  // 402 — monthly units exhausted
      case "rate_limited":    // 429 — back off and retry
      case "unauthorized":    // 401 — bad or revoked key
      case "fetch_failed":    // 500 — extraction failed (you are NOT charged)
      case "network_error":   // request never reached the API
    }
    console.error(err.status, err.message);
  }
}
```

## Units & pricing

Caption transcripts cost **1 unit**; Whisper transcriptions (captionless videos) cost **15 units**. Failed requests cost nothing. Plans start at $29/mo for 10,000 units — get an API key at **[ytranscript.com/developers](https://ytranscript.com/developers)**.

## Why not scrape it yourself?

You can — until you deploy. YouTube aggressively bot-detects transcript extraction from datacenter IPs (AWS, GCP, Vercel, Railway…), so DIY libraries tend to work locally and fail in production. This API exists so that arms race is our full-time job instead of your on-call incident. Extraction success rates are high but not absolute, which is exactly why failed requests are never charged.

## License

[MIT](./LICENSE)
