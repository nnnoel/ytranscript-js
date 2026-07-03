// Run with: YTRANSCRIPT_API_KEY=yk_live_... node examples/basic.mjs [videoIdOrUrl]
import { YTranscript, YTranscriptError } from "ytranscript-api";

const apiKey = process.env.YTRANSCRIPT_API_KEY;
if (!apiKey) {
  console.error("Set YTRANSCRIPT_API_KEY (get a key at https://ytranscript.com/developers)");
  process.exit(1);
}

const video = process.argv[2] ?? "dQw4w9WgXcQ";
const yt = new YTranscript(apiKey);

try {
  const t = await yt.transcript(video);
  console.log(`Language: ${t.lang}  (whisper: ${t.whisper}, cached: ${t.cached}, units: ${t.unitsCharged})`);
  console.log(`Segments: ${t.segments.length}`);
  console.log(`First segment:`, t.segments[0]);
  console.log(`Quota: ${yt.lastQuota.used}/${yt.lastQuota.limit} units used this month`);
} catch (err) {
  if (err instanceof YTranscriptError) {
    console.error(`[${err.code}] HTTP ${err.status}: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
