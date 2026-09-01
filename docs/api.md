# API roadmap

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
