import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Phase 1 migration contract", () => {
  it("defines every table required by the first Codex task", async () => {
    const migration = await readFile(resolve("infra/migrations/001_phase_0_1.sql"), "utf8");
    const requiredTables = [
      "projects",
      "project_revisions",
      "scenes",
      "shots",
      "assets",
      "generation_jobs",
      "qa_results",
      "approvals",
    ];

    for (const table of requiredTables) {
      expect(migration).toContain(`CREATE TABLE ${table}`);
    }
    expect(migration).toContain("CREATE TRIGGER assets_are_immutable");
  });
});
