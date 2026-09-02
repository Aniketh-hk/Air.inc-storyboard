# API roadmap

## Current prototype endpoints

These endpoints power the simplified Content → Canvas workflow. They are intentionally lightweight and
mock-friendly so the UI can become useful before real model-provider credentials are wired in.

| Method | Path                     | Purpose                                                                                 |
| ------ | ------------------------ | --------------------------------------------------------------------------------------- |
| GET    | `/v1/health`             | Confirms the API process is reachable.                                                  |
| GET    | `/v1/connectors`         | Lists available provider slots and their current status.                                |
| POST   | `/v1/content/understand` | Extracts themes, audience, constraints, truths, angles, and tone from a knowledge dump. |
| POST   | `/v1/content/ideas`      | Turns a knowledge dump plus connectors into script ideas.                               |
| POST   | `/v1/canvas/expand`      | Expands a selected idea into character and scene sheets.                                |
| POST   | `/v1/moodboards`         | Creates a moodboard export/share payload from selections.                               |
| POST   | `/v1/assets`             | Registers an uploaded reference, brand, audio, character, scene, or script asset.       |
| POST   | `/v1/projects`           | Saves a lightweight project snapshot for persistence.                                   |
| POST   | `/v1/exports`            | Creates a mocked multi-format export package manifest.                                  |

The web app uses these endpoints when available and falls back to local generation when the API is offline.

These prototype endpoints now cover the first version of the 20-element app map:

- Content: knowledge dump, file/link intake, connector catalog, research understanding, script idea generation, idea cards, idea editor, compare stack, and Send to Canvas.
- Canvas: draggable/zoomable workspace, toolbar, selected idea node, character sheets, scene sheets, character+scene mixer, asset library, chat assistant, moodboard generation, share/download/export, and project save.

Run the API after a root build with:

```bash
pnpm --filter @creative-engine/api start
```

The V1 API will be implemented from Phase 2 onward under `/v1`.

| Method | Path                                               | Planned phase |
| ------ | -------------------------------------------------- | ------------- |
| POST   | `/projects`                                        | 2             |
| POST   | `/projects/{id}/assets`                            | 2             |
| POST   | `/projects/{id}/normalise`                         | 4             |
| POST   | `/projects/{id}/concepts:generate`                 | 4             |
| POST   | `/projects/{id}/concepts/{conceptId}:approve`      | 4             |
| POST   | `/projects/{id}/storyboard:generate`               | 4             |
| PATCH  | `/projects/{id}/shots/{shotId}`                    | 5             |
| POST   | `/projects/{id}/storyboard:approve`                | 5             |
| POST   | `/projects/{id}/shots/{shotId}/keyframes:generate` | 6             |
| POST   | `/projects/{id}/shots/{shotId}/videos:generate`    | 7             |
| POST   | `/projects/{id}/shots/{shotId}:regenerate`         | 7             |
| POST   | `/projects/{id}/renders`                           | 8             |
| GET    | `/projects/{id}/jobs/{jobId}`                      | 4             |
| GET    | `/projects/{id}/manifest`                          | 9             |
| POST   | `/projects/{id}/approvals`                         | 4             |
| DELETE | `/projects/{id}/personal-data`                     | 10            |

All generation and render POST endpoints will require `Idempotency-Key`. Reusing a key with the same
request returns the original job; using it with a different request returns HTTP 409. Expensive work returns
HTTP 202 with a job ID, status, poll URL, and cost estimate.
