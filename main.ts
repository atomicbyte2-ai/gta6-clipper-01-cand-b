// gta6-clipper-01-cand-b: reproduces the candidate-B clip for make.fun.
// The clip itself (clip.mp4) was cut in this recorded session from the
// Rockstar official GTA VI Launch Trailer (see cutlist.json). This script
// only validates the cutlist + VIDEO.json, verifies clip.mp4 (sha256 and
// mvhd duration), and copies it to the output dir with a manifest.
// Node 22, stdlib only, no network at runtime.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const cutlistPath = join(here, "cutlist.json");
const videoJsonPath = join(here, "VIDEO.json");
const clipPath = join(here, "clip.mp4");

function fail(message) {
  throw new Error(message);
}

function readJson(path, label) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    fail(`cannot read ${label} at ${path}: file missing or unreadable`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`${label} at ${path} is not valid JSON: ${err.message}`);
  }
}

// --- cutlist.json -----------------------------------------------------------
const cutlist = readJson(cutlistPath, "cutlist.json");
if (typeof cutlist !== "object" || cutlist === null || Array.isArray(cutlist)) {
  fail("cutlist.json must be a JSON object");
}
if (cutlist.competition !== "gta6-clipper-01") {
  fail(`cutlist.json competition must be "gta6-clipper-01", got ${JSON.stringify(cutlist.competition)}`);
}
const source = cutlist.source;
if (!source || typeof source.url !== "string" || !source.url.startsWith("https://www.rockstargames.com/VI/")) {
  fail("cutlist.json source.url must be the Rockstar GTA VI media page URL");
}
if (source.file !== "GTAVI_Launch_Trailer.mp4") {
  fail(`cutlist.json source.file must be "GTAVI_Launch_Trailer.mp4", got ${JSON.stringify(source.file)}`);
}
if (source.kind !== "rockstar-official-trailer") {
  fail(`cutlist.json source.kind must be "rockstar-official-trailer", got ${JSON.stringify(source.kind)}`);
}
const moment = cutlist.chosen_moment;
if (!moment || typeof moment !== "object") {
  fail("cutlist.json chosen_moment is missing");
}
if (typeof moment.in_seconds !== "number" || typeof moment.out_seconds !== "number") {
  fail("cutlist.json chosen_moment in_seconds/out_seconds are not set yet (moment not chosen)");
}
if (!(moment.out_seconds > moment.in_seconds)) {
  fail(`cutlist.json chosen_moment out_seconds (${moment.out_seconds}) must be > in_seconds (${moment.in_seconds})`);
}
const hookDuration = moment.out_seconds - moment.in_seconds;
if (hookDuration > 60) {
  fail(`hook moment duration ${hookDuration}s exceeds the 60s Short limit`);
}
if (typeof moment.description !== "string" || moment.description.trim() === "") {
  fail("cutlist.json chosen_moment.description must name the stunt moment");
}
// --- segments: the full clip is a montage built around the hook moment -----
const segments = cutlist.segments;
if (!Array.isArray(segments) || segments.length === 0) {
  fail("cutlist.json segments is missing (the clip is a montage of trailer beats)");
}
if (segments[0].in_seconds !== moment.in_seconds || segments[0].out_seconds !== moment.out_seconds) {
  fail("cutlist.json segments[0] must be the chosen_moment hook (same in/out seconds)");
}
let clipDuration = 0;
for (const seg of segments) {
  if (typeof seg.in_seconds !== "number" || typeof seg.out_seconds !== "number" || !(seg.out_seconds > seg.in_seconds)) {
    fail(`cutlist.json segment ${JSON.stringify(seg)} has invalid in/out seconds`);
  }
  if (seg.in_seconds < 0 || seg.out_seconds > source.duration_seconds) {
    fail(`cutlist.json segment ${seg.in_seconds}-${seg.out_seconds}s is outside the source duration ${source.duration_seconds}s`);
  }
  const speed = typeof seg.speed === "number" ? seg.speed : 1;
  if (!(speed > 0)) fail(`cutlist.json segment speed must be > 0, got ${speed}`);
  clipDuration += (seg.out_seconds - seg.in_seconds) / speed;
}
if (clipDuration > 60) {
  fail(`clip duration ${clipDuration}s exceeds the 60s Short limit`);
}
const edit = cutlist.edit;
if (!edit || typeof edit.pitch_overlay !== "object" || typeof edit.pitch_overlay.text !== "string" || !edit.pitch_overlay.text.includes("make.fun")) {
  fail("cutlist.json edit.pitch_overlay.text must contain the make.fun pitch");
}
if (edit.pitch_overlay.end_card_play_code !== "makefun-crystal-cotton-tarragon") {
  fail('cutlist.json edit.pitch_overlay.end_card_play_code must be "makefun-crystal-cotton-tarragon"');
}
if (typeof cutlist.ffmpeg_command !== "string" || !cutlist.ffmpeg_command.includes("ffmpeg")) {
  fail("cutlist.json ffmpeg_command must record the exact ffmpeg command used");
}

// --- VIDEO.json -------------------------------------------------------------
const videoJson = readJson(videoJsonPath, "VIDEO.json");
const videoKeys = Object.keys(videoJson);
if (videoKeys.length !== 1 || videoKeys[0] !== "video_url") {
  fail(`VIDEO.json must contain exactly {"video_url": ...}, got keys ${JSON.stringify(videoKeys)}`);
}
if (typeof videoJson.video_url !== "string" || !videoJson.video_url.startsWith("https://www.youtube.com/watch?v=")) {
  fail(`VIDEO.json video_url must be a YouTube watch URL, got ${JSON.stringify(videoJson.video_url)}`);
}
const videoPending = videoJson.video_url.includes("PENDING_UPLOAD_BY_COY");
if (videoPending) {
  console.log("WARNING: VIDEO.json still holds the PENDING_UPLOAD_BY_COY placeholder — replace with the real URL after coy posts the clip.");
}

// --- clip.mp4: parse duration from the mvhd box -----------------------------
function parseMvhdDurationSeconds(bytes) {
  const marker = Buffer.from("mvhd", "ascii");
  const idx = bytes.indexOf(marker);
  if (idx < 0) fail("clip.mp4: no mvhd box found");
  const version = bytes[idx + 4];
  let timescale;
  let duration;
  // mvhd layout after the 4-byte "mvhd" type: version(1) + flags(3),
  // then version 0: creation(4) modification(4) timescale(4) duration(4);
  // version 1: creation(8) modification(8) timescale(4) duration(8).
  if (version === 0) {
    timescale = bytes.readUInt32BE(idx + 16);
    duration = bytes.readUInt32BE(idx + 20);
  } else if (version === 1) {
    timescale = bytes.readUInt32BE(idx + 24);
    duration = Number(bytes.readBigUInt64BE(idx + 28));
  } else {
    fail(`clip.mp4: unsupported mvhd version ${version}`);
  }
  if (!timescale || timescale <= 0) fail("clip.mp4: mvhd timescale is zero");
  return duration / timescale;
}

if (!existsSync(clipPath)) {
  fail(`clip.mp4 missing at ${clipPath}: cut the clip first (see cutlist.json ffmpeg_command)`);
}
const clipBytes = readFileSync(clipPath);
if (clipBytes.length === 0) fail("clip.mp4 is empty (0 bytes)");
const clipSha256 = createHash("sha256").update(clipBytes).digest("hex");
const expectedSha256 = cutlist.clip && cutlist.clip.sha256;
if (typeof expectedSha256 !== "string" || expectedSha256.length !== 64) {
  fail("cutlist.json clip.sha256 is not set yet (clip not cut)");
}
if (clipSha256 !== expectedSha256) {
  fail(`clip.mp4 sha256 mismatch: got ${clipSha256}, expected ${expectedSha256}`);
}
const mvhdSeconds = parseMvhdDurationSeconds(clipBytes);
if (Math.abs(mvhdSeconds - clipDuration) > 0.5) {
  fail(`clip.mp4 mvhd duration ${mvhdSeconds.toFixed(3)}s does not match cutlist segment total ${clipDuration}s`);
}
if (cutlist.clip.duration_seconds !== null && Math.abs(cutlist.clip.duration_seconds - mvhdSeconds) > 0.5) {
  fail(`cutlist.json clip.duration_seconds (${cutlist.clip.duration_seconds}) does not match clip.mp4 mvhd duration ${mvhdSeconds.toFixed(3)}s`);
}

// --- output -----------------------------------------------------------------
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
copyFileSync(clipPath, join(outDir, "clip.mp4"));
const manifest = {
  candidate: "B",
  clip_sha256: clipSha256,
  competition: "gta6-clipper-01",
  duration_seconds: mvhdSeconds,
  moment: moment.description,
  moment_in_seconds: moment.in_seconds,
  moment_out_seconds: moment.out_seconds,
  play_code: "makefun-crystal-cotton-tarragon",
  size_bytes: clipBytes.length,
  source_url: source.url,
  video_url: videoJson.video_url,
  video_url_pending: videoPending,
};
writeFileSync(join(outDir, "clip-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`clip.mp4 sha256 ${clipSha256}`);
console.log(`clip.mp4 mvhd duration ${mvhdSeconds.toFixed(3)}s, ${clipBytes.length} bytes`);
console.log(`wrote ${join(outDir, "clip.mp4")} and ${join(outDir, "clip-manifest.json")}`);
