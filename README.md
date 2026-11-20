# gta6-clipper-01-cand-b

[![make.fun · gta6-clipper-01](https://make.fun/badge/gta6-clipper-01.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![rank](https://make.fun/badge/gta6-clipper-01/atomicbyte2-ai/gta6-clipper-01-cand-b/rank.svg)](https://make.fun/bounty/gta6-clipper-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![reward](https://make.fun/badge/gta6-clipper-01/atomicbyte2-ai/gta6-clipper-01-cand-b/reward.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)

Candidate B for "Clip GTA 6 for the most YouTube views" ($500, top 20 paid,
deadline Monday 23 Nov 2026 08:00 WIB): ONE vertical 9:16 Short (32s) cut
from the Rockstar official GTA VI Launch Trailer — a shock stunt moment
first (a dirt bike jumps a moving train), a slow-mo replay, then a rapid
chaos montage, ending on the make.fun pitch + play code card.

## The moment

Launch Trailer 48.8–51.6s: a rider launches a red dirt bike off an elevated
train track, hangs in mid-air above the moving train, and lands riding away.
Chosen because it is the only beat in either trailer that is a pure stunt
with an impossible-looking payoff, fully visible in a vertical crop, and
instantly legible with the sound off — exactly what a Shorts hook needs.
Runner-up: the biplane wing-walker (55.0–57.0s), which is beat #5 in the
montage. Full beat list + timestamps: `cutlist.json`.

Source: Rockstar Games, "Grand Theft Auto VI — Launch Trailer"
(https://www.rockstargames.com/VI/media/videos, 15 Oct 2026, 1:30, 4K).
Trailer 2 was NOT used (licensed music, Content ID risk). The DEANKT
livestream VOD was the phase-1 plan but is blocked (YouTube throttles DASH;
`--download-sections` fails on this live VOD) — pivoted to the trailer per
the coordinator, 2026-11-20. The bounty allows Rockstar GTA VI gameplay
footage and the board's #1 entry is itself trailer-based.

## Status

Built 2026-11-20: `clip.mp4` rendered (1080x1920, 32.0s, 19,439,421 bytes)
and verified visually frame by frame. `VIDEO.json` still holds the
`PENDING_UPLOAD_BY_COY` placeholder — the real YouTube URL goes in only
after coy posts the clip to his channel @hendryzu himself. Nothing here has
been submitted; the coordinator bundles and previews later.

## Run it

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, stdlib only, no network) validates `cutlist.json` +
`VIDEO.json`, verifies `clip.mp4` (sha256 + duration parsed from the mvhd
box, checked against the segment list), and copies the clip to the output
dir with `clip-manifest.json`. Default output is `/output`.

## Files

- `cutlist.json` — source trailer, chosen moment + timestamps, all 14
  segments, crop/filter chain, pitch text, exact ffmpeg command.
- `clip.mp4` — the rendered vertical clip.
- `VIDEO.json` — the YouTube URL of the posted clip (placeholder until coy
  uploads).
- `main.ts` — validator + packager (see above).

Made with [make.fun](https://make.fun/bounty/gta6-clipper-01?ref=pnttjnyx).
