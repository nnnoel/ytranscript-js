/**
 * ytranscript-api — official JavaScript/TypeScript client for the yTranscript API
 * (YouTube transcripts and video metadata).
 *
 * Docs & API keys: https://ytranscript.com/developers
 */

const DEFAULT_BASE_URL = "https://ytranscript.com/api/v1";

export interface TranscriptSegment {
  /** Segment text */
  text: string;
  /** Start offset in milliseconds */
  offset: number;
  /** Duration in milliseconds */
  duration: number;
}

export interface Transcript {
  videoId: string;
  /** BCP-47-ish language code of the returned transcript */
  lang: string;
  /** True when the transcript was produced by Whisper speech-to-text (captionless video) */
  whisper: boolean;
  /** True when served from cache */
  cached: boolean;
  /**
   * Quota units this request consumed. Captions and cached transcripts: 1. Whisper: 1 per
   * minute of audio, minimum 5.
   */
  unitsCharged: number;
  /** Length of the transcribed audio in seconds. Present on live Whisper transcriptions. */
  audioSeconds?: number;
  /**
   * Present only when the transcript isn't in the `lang` you asked for: the video has no captions
   * in it and AI transcription couldn't run, so these are the video's default captions. Says why.
   */
  notice?: string;
  segments: TranscriptSegment[];
  /** Convenience: all segment text joined with spaces */
  text: string;
  /**
   * Present only when requested with `{ metadata: true }`. `null` if the metadata could not be
   * read (the transcript is still returned).
   */
  metadata?: VideoMetadata | null;
}

export interface VideoChapter {
  title: string;
  startSeconds: number;
}

export interface VideoThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  description: string | null;
  /** `null` when YouTube limits what it shows the API's servers */
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  /** ISO 8601. Usually with a time; a date only (YYYY-MM-DD) when YouTube limits the page */
  publishedAt: string | null;
  channel: {
    id: string | null;
    name: string | null;
    /** e.g. "@RickAstleyYT" */
    handle: string | null;
    url: string | null;
    /** Rounded the way YouTube displays it (4.56M -> 4560000) */
    subscriberCount: number | null;
  };
  /** `null` when YouTube limits the page; `[]` when the video has no tags */
  tags: string[] | null;
  category: string | null;
  chapters: VideoChapter[];
  thumbnails: VideoThumbnail[];
  isLive: boolean;
}

export interface Video extends VideoMetadata {
  /** True when served from cache */
  cached: boolean;
  /** Quota units this request consumed (1) */
  unitsCharged: number;
}

/** One video in a channel or playlist listing. */
export interface ListedVideo {
  videoId: string;
  title: string | null;
  /**
   * Exact publish time (ISO 8601) when `publishedAtExact`, as it is for the newest 15 videos.
   * Otherwise a date (YYYY-MM-DD) estimated from `publishedText`: the latest the video can have
   * been published. `null` when YouTube shows no date.
   */
  publishedAt: string | null;
  publishedAtExact: boolean;
  /** YouTube's own wording, such as "3 weeks ago" */
  publishedText: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
}

/** One page of a channel's videos (newest first) or a playlist's (in its own order). */
export interface VideoList {
  type: "channel" | "playlist";
  /** The channel ID (UC...) when listing a channel, otherwise null */
  channelId: string | null;
  /** The playlist that was listed; for a channel, its uploads playlist */
  playlistId: string;
  title: string | null;
  videos: ListedVideo[];
  /** Pass as `cursor` to get the next videos; null when there are no more */
  nextCursor: string | null;
  /** 1 per started 100 videos returned, at least 1 */
  unitsCharged: number;
}

export interface VideosOptions {
  /** An @handle, a channel URL or a channel ID (UC...). Lists the channel's uploads. */
  channel?: string;
  /** A playlist ID or a URL with list= (instead of `channel`) */
  playlist?: string;
  /** Channels only: "all" (default, includes Shorts and live streams) or "videos" (regular videos only) */
  content?: "all" | "videos";
  /**
   * A date, YYYY-MM-DD (UTC): only videos published on or after it. A channel's list ends at the
   * first older video; a playlist is read through. Older videos have estimated dates, so a few
   * from just before the date can be included: check `publishedAtExact`.
   */
  publishedAfter?: string;
  /** How many videos to return, 1 to 500. Default 100. */
  limit?: number;
  /** `nextCursor` from the previous page. It carries the channel or playlist, content and date. */
  cursor?: string;
}

export interface QuotaInfo {
  limit: number;
  used: number;
  rateLimitRemaining: number;
}

export type ErrorCode =
  | "unauthorized"
  | "quota_exceeded"
  | "rate_limited"
  | "bad_request"
  | "no_transcript"
  | "not_found"
  | "max_units_exceeded"
  | "temporarily_unavailable"
  | "fetch_failed"
  | "network_error";

export class YTranscriptError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /**
   * How long to wait before retrying, when the API says so (`rate_limited` and
   * `temporarily_unavailable`).
   */
  readonly retryAfterSeconds?: number;
  /**
   * On `max_units_exceeded`: what the Whisper transcription would have cost, or `null` if the
   * video's length couldn't be read. Nothing was charged.
   */
  readonly estimatedUnits?: number | null;

  constructor(code: ErrorCode, status: number, message: string, retryAfterSeconds?: number, estimatedUnits?: number | null) {
    super(message);
    this.name = "YTranscriptError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.estimatedUnits = estimatedUnits;
  }
}

export interface ClientOptions {
  /** Override the API base URL (rarely needed) */
  baseUrl?: string;
  /**
   * Request timeout in milliseconds. Default 300s: transcribing a captionless video with Whisper
   * can take several minutes, and a request that times out here may still be charged.
   */
  timeoutMs?: number;
}

export interface TranscriptOptions {
  /** Preferred language code (e.g. "en", "es"). Defaults to the video's source language. */
  lang?: string;
  /** Also return the video's metadata (title, views, chapters, ...) at no extra cost. */
  metadata?: boolean;
  /**
   * The most this request may cost. If the video has no captions and Whisper transcription
   * would cost more, the call throws `max_units_exceeded` (with `estimatedUnits`) before any
   * transcription starts, and nothing is charged. Use 1 for captions only.
   */
  maxUnits?: number;
}

export class YTranscript {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  /** Quota headers from the most recent successful request */
  lastQuota: QuotaInfo | null = null;

  constructor(apiKey: string, options: ClientOptions = {}) {
    if (!apiKey || !apiKey.startsWith("yk_")) {
      throw new YTranscriptError(
        "unauthorized",
        0,
        "An API key (yk_live_...) is required. Get one at https://ytranscript.com/developers?utm_source=js-sdk"
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 300_000;
  }

  /**
   * Fetch the transcript for a video. Accepts a video ID or any YouTube URL.
   */
  async transcript(videoIdOrUrl: string, options: TranscriptOptions = {}): Promise<Transcript> {
    const params = videoParams(videoIdOrUrl);
    if (options.lang) params.set("lang", options.lang);
    if (options.metadata) params.set("metadata", "true");
    if (options.maxUnits !== undefined) params.set("max_units", String(options.maxUnits));

    const body = await this.request("transcript", params);
    const segments: TranscriptSegment[] = body.segments ?? [];
    return {
      videoId: body.video_id,
      lang: body.lang,
      whisper: Boolean(body.whisper),
      cached: Boolean(body.cached),
      unitsCharged: Number(body.units_charged ?? 1),
      ...(typeof body.audio_seconds === "number" ? { audioSeconds: body.audio_seconds } : {}),
      ...(typeof body.notice === "string" ? { notice: body.notice } : {}),
      segments,
      text: segments.map((s) => s.text).join(" "),
      ...(options.metadata ? { metadata: body.metadata ? toVideoMetadata(body.metadata) : null } : {}),
    };
  }

  /**
   * Fetch a video's metadata: title, description, duration, views, likes, publish date,
   * channel, tags, category, chapters and thumbnails. Accepts a video ID or any YouTube URL.
   * Costs 1 unit. To get it together with a transcript at no extra cost, use
   * `transcript(id, { metadata: true })`.
   */
  async video(videoIdOrUrl: string): Promise<Video> {
    const body = await this.request("video", videoParams(videoIdOrUrl));
    return {
      ...toVideoMetadata(body),
      cached: Boolean(body.cached),
      unitsCharged: Number(body.units_charged ?? 1),
    };
  }

  /**
   * One page of a channel's videos (newest first) or a playlist's (in its own order), with title,
   * publish date, length and views. Costs 1 unit per started 100 videos returned (at least 1); a
   * follow-up page with no videos is free. For the next page,
   * call again with `{ cursor: list.nextCursor }`, or use `allVideos()`.
   */
  async videos(options: VideosOptions): Promise<VideoList> {
    const params = new URLSearchParams();
    if (options.cursor) {
      params.set("cursor", options.cursor);
    } else {
      if (options.channel) params.set("channel", options.channel);
      if (options.playlist) params.set("playlist", options.playlist);
      if (options.content) params.set("content", options.content);
      if (options.publishedAfter) params.set("published_after", options.publishedAfter);
    }
    if (options.limit !== undefined) params.set("limit", String(options.limit));

    const body = await this.request("videos", params);
    return {
      type: body.type,
      channelId: body.channel_id ?? null,
      playlistId: body.playlist_id,
      title: body.title ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      videos: (body.videos ?? []).map((v: any) => ({
        videoId: v.video_id,
        title: v.title ?? null,
        publishedAt: v.published_at ?? null,
        publishedAtExact: Boolean(v.published_at_exact),
        publishedText: v.published_text ?? null,
        durationSeconds: v.duration_seconds ?? null,
        viewCount: v.view_count ?? null,
      })),
      nextCursor: body.next_cursor ?? null,
      unitsCharged: Number(body.units_charged ?? 1),
    };
  }

  /**
   * Every video of a channel or playlist, fetched page by page as you iterate
   * (each page is a `videos()` call, 1 unit per started 100 videos). Stop iterating to stop
   * fetching; `publishedAfter` ends the list at that date.
   */
  async *allVideos(options: Omit<VideosOptions, "cursor">): AsyncGenerator<ListedVideo> {
    let cursor: string | undefined;
    do {
      const page = await this.videos(cursor ? { cursor, limit: options.limit } : options);
      for (const v of page.videos) yield v;
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async request(path: string, params: URLSearchParams): Promise<any> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${path}?${params}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new YTranscriptError(
        "network_error",
        0,
        `Request failed: ${err instanceof Error ? err.message : "unknown network error"}`
      );
    }

    const limit = Number(response.headers.get("x-quota-limit"));
    const used = Number(response.headers.get("x-quota-used"));
    const rateRemaining = Number(response.headers.get("x-ratelimit-remaining"));
    if (Number.isFinite(limit) && Number.isFinite(used)) {
      this.lastQuota = {
        limit,
        used,
        rateLimitRemaining: Number.isFinite(rateRemaining) ? rateRemaining : 0,
      };
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const code = (body?.error?.code as ErrorCode) ?? "fetch_failed";
      const message = body?.error?.message ?? `Request failed with status ${response.status}`;
      const retryAfter = Number(body?.error?.retry_after_seconds ?? response.headers.get("retry-after"));
      const estimated = body?.error?.estimated_units;
      throw new YTranscriptError(
        code,
        response.status,
        message,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
        code === "max_units_exceeded" ? (typeof estimated === "number" ? estimated : null) : undefined,
      );
    }
    return body ?? {};
  }
}

function videoParams(videoIdOrUrl: string): URLSearchParams {
  const params = new URLSearchParams();
  if (/^[\w-]{11}$/.test(videoIdOrUrl)) {
    params.set("videoId", videoIdOrUrl);
  } else {
    params.set("url", videoIdOrUrl);
  }
  return params;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toVideoMetadata(m: any): VideoMetadata {
  return {
    videoId: m.video_id,
    title: m.title,
    description: m.description ?? null,
    durationSeconds: m.duration_seconds ?? null,
    viewCount: m.view_count ?? null,
    likeCount: m.like_count ?? null,
    publishedAt: m.published_at ?? null,
    channel: {
      id: m.channel?.id ?? null,
      name: m.channel?.name ?? null,
      handle: m.channel?.handle ?? null,
      url: m.channel?.url ?? null,
      subscriberCount: m.channel?.subscriber_count ?? null,
    },
    tags: m.tags ?? null,
    category: m.category ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chapters: (m.chapters ?? []).map((c: any) => ({ title: c.title, startSeconds: c.start_seconds })),
    thumbnails: m.thumbnails ?? [],
    isLive: Boolean(m.is_live),
  };
}

export default YTranscript;
