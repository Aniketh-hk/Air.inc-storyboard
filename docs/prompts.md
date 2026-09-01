# Prompt contracts

Prompt templates are immutable, versioned inputs to generation jobs. Every eventual job record must store:

- template ID and version
- fully resolved provider prompt
- provider and model parameters
- reference asset IDs and seed when supported
- provider request/response identifier
- estimated and actual cost

The current templates define the brief-normalisation, shot-planning, and QA-repair boundaries. They are not
connected to a provider in Phase 1. A future PromptIR compiler will assemble structured subject, shot, angle,
camera, environment, colour, light, character, brand, style, and negative-constraint sections before a
provider adapter formats them.
