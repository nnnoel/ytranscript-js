/**
 * ytranscript-api — official JavaScript/TypeScript client for the yTranscript API.
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
  /** Quota units this request consumed (captions: 1, Whisper: 15) */
  unitsCharged: number;
  segments: TranscriptSegment[];
  /** Convenience: all segment text joined with spaces */
  text: string;
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
  | "fetch_failed"
  | "network_error";

export class YTranscriptError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, status: number, message: string) {
    super(message);
    this.name = "YTranscriptError";
    this.code = code;
    this.status = status;
  }
}

export interface ClientOptions {
  /** Override the API base URL (rarely needed) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default 120s — Whisper fallbacks take time) */
  timeoutMs?: number;
}

export interface TranscriptOptions {
  /** Preferred language code (e.g. "en", "es"). Defaults to the video's source language. */
  lang?: string;
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
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  /**
   * Fetch the transcript for a video. Accepts a video ID or any YouTube URL.
   */
  async transcript(videoIdOrUrl: string, options: TranscriptOptions = {}): Promise<Transcript> {
    const params = new URLSearchParams();
    if (/^[\w-]{11}$/.test(videoIdOrUrl)) {
      params.set("videoId", videoIdOrUrl);
    } else {
      params.set("url", videoIdOrUrl);
    }
    if (options.lang) params.set("lang", options.lang);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/transcript?${params}`, {
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
      throw new YTranscriptError(code, response.status, message);
    }

    const segments: TranscriptSegment[] = body.segments ?? [];
    return {
      videoId: body.video_id,
      lang: body.lang,
      whisper: Boolean(body.whisper),
      cached: Boolean(body.cached),
      unitsCharged: Number(body.units_charged ?? 1),
      segments,
      text: segments.map((s) => s.text).join(" "),
    };
  }
}

export default YTranscript;
