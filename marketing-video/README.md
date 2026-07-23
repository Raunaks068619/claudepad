# ClaudePad promo

Remotion source for the ClaudePad vertical and landscape marketing videos.

## Render

```bash
npm ci
npm run typecheck
npm run render
npm run render:landscape
```

The voiced renders are written to:

- `out/claudepad-promo-v2-vo.mp4`
- `out/claudepad-promo-v2-vo-landscape.mp4`

## Source media

The draft uses short, locally transcoded excerpts from:

- the authentic ClaudePad controller demonstration;
- the Vordi hands-free recording;
- the shipped ClaudePad application icon.
- the supplied ElevenLabs Maya narration, phrase-edited under
  `public/voiceover/`.

The source video is muted in the composition. The narration is timed per scene,
while locally generated music and effects duck underneath it.
