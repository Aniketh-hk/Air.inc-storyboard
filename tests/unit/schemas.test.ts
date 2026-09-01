import { describe, expect, it } from "vitest";

import { creativeSpecSchema, qaResultSchema, shotSpecSchema } from "@creative-engine/schemas";

import { makeShot } from "../fixtures/domain.js";

describe("CreativeSpec", () => {
  it("accepts the canonical human-gated project shape", () => {
    const parsed = creativeSpecSchema.parse({
      schema_version: "1.0",
      project_id: "prj_01JOC",
      brand_pack_id: "jkmaxx-v3",
      style_pack_id: "jkmaxx-joy-of-colors-v1",
      campaign_pack_id: "kolkata-homecoming-puja-v1",
      idea: "A young man returns to Kolkata during Puja; the city gains colour.",
      objective: "Associate JK MaxX, Kolkata, and colour.",
      audience: ["urban Bengali adults"],
      duration_seconds: 40,
      aspect_ratios: ["16:9"],
      deliverables: ["mp4", "storyboard_pdf", "shot_sheet_csv", "project_manifest_json"],
      personalization: {
        enabled: true,
        input: "user_photo",
        identity_critical_shots: ["S01_SH02", "S07_SH02"],
      },
      approval_mode: "human_gated",
      budget: { currency: "INR", max_generation_cost: 25_000, enforcement: "hard" },
      assumptions: [],
      constraints: ["dialogue prohibited"],
    });

    expect(parsed.duration_seconds).toBe(40);
    expect(parsed.personalization.identity_critical_shots).toHaveLength(2);
  });

  it("rejects personalization without declared identity-critical shots", () => {
    const result = creativeSpecSchema.safeParse({
      schema_version: "1.0",
      project_id: "prj_01",
      brand_pack_id: "brand-v1",
      style_pack_id: "style-v1",
      campaign_pack_id: "campaign-v1",
      idea: "Idea",
      objective: "Objective",
      audience: ["Audience"],
      duration_seconds: 15,
      aspect_ratios: ["9:16"],
      deliverables: ["mp4"],
      personalization: { enabled: true, input: "user_photo", identity_critical_shots: [] },
      approval_mode: "human_gated",
      budget: { currency: "INR", max_generation_cost: 100, enforcement: "hard" },
    });

    expect(result.success).toBe(false);
  });
});

describe("ShotSpec", () => {
  it("requires the complete production record", () => {
    expect(
      shotSpecSchema.safeParse(makeShot({ shotId: "S03_SH02", durationSeconds: 1.2 })).success,
    ).toBe(true);

    const incomplete = {
      ...makeShot({ shotId: "S03_SH03", durationSeconds: 1 }),
      audio_notes: undefined,
    };
    expect(shotSpecSchema.safeParse(incomplete).success).toBe(false);
  });

  it("does not allow brand target time to exceed the edit duration", () => {
    const shot = makeShot({ shotId: "S05_SH01", durationSeconds: 2 });
    const result = shotSpecSchema.safeParse({
      ...shot,
      brand: {
        visible: true,
        type: "product_use",
        asset_ids: ["paint_bucket_01"],
        screen_time_target_seconds: 3,
        deterministic_overlay: false,
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("QAResult", () => {
  it("forces any hard-rule failure to FAIL", () => {
    const result = qaResultSchema.safeParse({
      id: "qa_01",
      asset_id: "asset_01",
      shot_id: "S01_SH01",
      evaluator: "mock-vision-qa",
      dimension_scores: { identity: 9.5, brand: 9.5 },
      score: 9.5,
      issues: [],
      hard_fail: true,
      disposition: "PASS",
      created_at: "2026-09-01T09:30:00Z",
    });
    expect(result.success).toBe(false);
  });
});
