# Web application

This directory contains the first workflow UI prototype for the Creative Automation Engine.

The initial build is a static app shell so the product flow can be reviewed before the API and durable
workflow phases are implemented. It models the intended script-to-canvas path:

- upload or paste a script
- parse creative dependencies into selectable characters, scenes, visual language, audio, and transitions
- tag chosen dependencies with production names
- submit the approved selection set into an end moodboard
- expose download and share-link actions for the generated package

Run locally:

```bash
pnpm --filter @creative-engine/web dev
```
