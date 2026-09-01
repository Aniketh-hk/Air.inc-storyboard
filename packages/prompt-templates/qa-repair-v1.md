# QA repair v1

Given a ShotSpec, generated asset, and QA issues, change only what is necessary to repair the listed
failures. Preserve approved action, duration, brand claim, character identity, scene lighting, and
transition unless one is the reported issue. Return `requires_reapproval=true` when an approved
creative decision must change.
