# Shot planner v1

Input: approved SceneSpec, StylePack, CampaignPack, and remaining runtime budget.

Return `ShotSpec[]` only. Include shot type, camera movement, camera angle, observable action,
dialogue/VO (nullable), duration, audio notes, transition, on-screen text (nullable), character
rules, brand rules, and negative constraints. Do not exceed the scene duration budget or invent
unsupported characters, products, claims, locations, or dialogue. Prefer POV, back-profile, and
B-roll when face time is constrained.
