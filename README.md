# ytranscript-api

[![npm version](https://img.shields.io/npm/v/ytranscript-api.svg)](https://www.npmjs.com/package/ytranscript-api)
[![CI](https://github.com/nnnoel/ytranscript-js/actions/workflows/ci.yml/badge.svg)](https://github.com/nnnoel/ytranscript-js/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Official JavaScript/TypeScript client for the [yTranscript API](https://ytranscript.com/developers?utm_source=sdk-readme) — reliable YouTube transcripts and video metadata without proxy management or player-response scraping.

- **Your servers never touch YouTube** — bot detection becomes our problem, not yours. Multi-strategy extraction (edge → direct → residential → Whisper) maximizes success, and failed requests are never charged.
- **Captionless videos work** — automatic Whisper speech-to-text fallback, one endpoint for every video.
- **Video metadata too** — title, description, duration, views, likes, chapters, tags and channel, on its own or alongside a transcript at no extra cost.
- **Simple and typed** — two methods, structured results, zero runtime dependencies, CJS + ESM + types.

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

const v = await yt.video("dQw4w9WgXcQ");       // metadata only
const list = await yt.videos({ channel: "@lexfridman", publishedAfter: "2026-11-01" });  // a channel's videos
console.log(v.title, v.durationSeconds, v.viewCount, v.chapters);

// Transcript and metadata in one request, for the price of the transcript
const both = await yt.transcript("dQw4w9WgXcQ", { metadata: true });
console.log(both.metadata?.title);
```

## API

### `new YTranscript(apiKey, options?)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://ytranscript.com/api/v1` | Override the API base URL (rarely needed) |
| `timeoutMs` | `number` | `300000` | Request timeout. Whisper transcription of a long video can take several minutes, and a request that times out on your side may still be charged, so don't set this much lower |

### `yt.transcript(videoIdOrUrl, options?)`

Accepts an 11-character video ID or any YouTube URL (`youtube.com/watch`, `youtu.be/…`, shorts, embeds).

| Option | Type | Description |
| --- | --- | --- |
| `lang` | `string` | Preferred language code (e.g. `"en"`, `"es"`). Defaults to the video's source language. |
| `metadata` | `boolean` | Also return the video's metadata as `metadata` (see `yt.video`), at no extra cost. It is `null` if the metadata can't be read; the transcript is still returned. |
| `maxUnits` | `number` | The most this request may cost. If the video has no captions and Whisper transcription would cost more, the call throws `max_units_exceeded` before transcribing and nothing is charged. Use `1` for captions only. |

Returns a `Transcript`:

```ts
interface Transcript {
  videoId: string;
  lang: string;             // language of the returned transcript
  whisper: boolean;         // produced by Whisper speech-to-text
  cached: boolean;          // served from cache (always 1 unit)
  unitsCharged: number;     // captions: 1, Whisper: 1 per minute of audio (minimum 5)
  audioSeconds?: number;    // audio length, on live Whisper transcriptions
  notice?: string;          // only when not in the requested lang: why, and that these are the default captions
  segments: { text: string; offset: number; duration: number }[];  // ms offsets
  text: string;             // convenience: all segment text joined
  metadata?: VideoMetadata | null;  // only with { metadata: true }
}
```

### `yt.video(videoIdOrUrl)`

Returns a video's metadata. Costs 1 unit.

```ts
interface Video {
  videoId: string;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  publishedAt: string | null;       // ISO 8601
  channel: { id, name, handle, url, subscriberCount };  // each string | null (count: number | null)
  tags: string[] | null;
  category: string | null;
  chapters: { title: string; startSeconds: number }[];
  thumbnails: { url: string; width: number; height: number }[];
  isLive: boolean;
  cached: boolean;
  unitsCharged: number;             // 1
}
```

`durationSeconds`, `tags` and `category` can be `null`, and `publishedAt` can be a date without a time, when YouTube limits what it shows our servers. `subscriberCount` is rounded the way YouTube displays it.

### `yt.videos(options)`

One page of a channel's videos (newest first) or a playlist's (in its own order). Costs 1 unit per started 100 videos returned (at least 1); a follow-up page with no videos is free.

```ts
const list = await yt.videos({ channel: "@lexfridman", publishedAfter: "2026-11-01" });
for (const v of list.videos) console.log(v.videoId, v.publishedAt, v.title);

// Every regular video of a channel, page by page
for await (const v of yt.allVideos({ channel: "@lexfridman", content: "videos" })) {
  const t = await yt.transcript(v.videoId);
}
```

| Option | Type | Description |
|---|---|---|
| `channel` | `string` | An @handle, a channel URL or a channel ID (`UC...`). Lists the channel's uploads. |
| `playlist` | `string` | A playlist ID or a URL with `list=`, instead of `channel`. Mixes, Watch Later and private playlists are not supported. |
| `content` | `"all" \| "videos"` | Channels only. `"all"` (default) includes Shorts and live streams; `"videos"` is regular videos only. |
| `publishedAfter` | `string` | `YYYY-MM-DD` (UTC). Only videos published on or after it: a channel's list ends at the first older video; a playlist is read through and older videos are left out. |
| `limit` | `number` | 1 to 500, default 100. |
| `cursor` | `string` | `nextCursor` from the previous page. It carries the channel or playlist, `content` and `publishedAfter`. |

Returns a `VideoList`:

```ts
interface VideoList {
  type: "channel" | "playlist";
  channelId: string | null;
  playlistId: string;               // for a channel, its uploads playlist
  title: string | null;
  videos: {
    videoId: string;
    title: string | null;
    publishedAt: string | null;     // exact ISO time, or an estimated YYYY-MM-DD (see publishedAtExact)
    publishedAtExact: boolean;      // true for the newest 15 videos
    publishedText: string | null;   // YouTube's wording, e.g. "3 weeks ago"
    durationSeconds: number | null;
    viewCount: number | null;
  }[];
  nextCursor: string | null;        // null when there are no more
  unitsCharged: number;
}
```

Older videos' dates are estimated from YouTube's "3 weeks ago" text: `publishedAt` is then the latest the video can have been published, so `publishedAfter` can include a few videos from just before the date.

`yt.allVideos(options)` takes the same options without `cursor` and yields every video, fetching the next page only as you iterate.

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
      case "not_found":       // 404 — yt.video(): private, removed or nonexistent video; yt.videos(): no such channel or playlist
      case "bad_request":     // 400 — a bad argument, or yt.videos() with an expired cursor (start again without it)
      case "max_units_exceeded":  // 422 — Whisper would cost more than maxUnits; see err.estimatedUnits
      case "temporarily_unavailable":  // 503 — YouTube is blocking us; retry after err.retryAfterSeconds
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

`err.retryAfterSeconds` is set on `rate_limited` and `temporarily_unavailable`. A `temporarily_unavailable` error does not mean the video is missing: the same request usually works a few minutes later.

## Units & pricing

Caption transcripts cost **1 unit**. Whisper transcriptions (captionless videos) cost **1 unit per minute of audio**, with a minimum of 5; pass `maxUnits` to cap what a request may cost. Video metadata costs **1 unit**, or nothing extra with `{ metadata: true }` on a transcript. Listing a channel or playlist costs **1 unit per 100 videos**. Failed requests cost nothing. The free plan includes 50 units a month with no card; paid plans start at $9/month for 1,000 units. Get an API key at **[ytranscript.com/developers](https://ytranscript.com/developers?utm_source=sdk-readme)**.

## Why not scrape it yourself?

You can — until you deploy. YouTube aggressively bot-detects transcript extraction from datacenter IPs (AWS, GCP, Vercel, Railway…), so DIY libraries tend to work locally and fail in production. This API exists so that arms race is our full-time job instead of your on-call incident. Extraction success rates are high but not absolute, which is exactly why failed requests are never charged.

## License

[MIT](./LICENSE)
