import { describe, expect, it } from "vitest";

import {
  kolkataHomecomingBrandPolicy,
  validateBrandPresence,
  validateFaceTime,
  validateRuntime,
  validateSceneBudgets,
} from "@creative-engine/validators";

import { makeFortySecondBrandPlan, makeShot } from "../fixtures/domain.js";

describe("runtime validator", () => {
  it("passes an exact edit duration", () => {
    const validation = validateRuntime(
      [
        makeShot({ shotId: "S01_SH01", durationSeconds: 2 }),
        makeShot({ shotId: "S01_SH02", durationSeconds: 3 }),
      ],
      5,
    );
    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  it("blocks an over-runtime shot plan", () => {
    const validation = validateRuntime([makeShot({ shotId: "S01_SH01", durationSeconds: 5.1 })], 5);
    expect(validation.valid).toBe(false);
    expect(validation.issues[0]?.code).toBe("SHOT_PLAN_OVER_RUNTIME");
  });

  it("warns without blocking when underfilled", () => {
    const validation = validateRuntime(
      [makeShot({ shotId: "S01_SH01", durationSeconds: 4 })],
      5,
      0.5,
    );
    expect(validation.valid).toBe(true);
    expect(validation.issues[0]?.code).toBe("SHOT_PLAN_UNDER_RUNTIME");
  });
});

describe("face-time validator", () => {
  it("uses edit duration multiplied by clear-face visibility", () => {
    const validation = validateFaceTime(
      [
        makeShot({ shotId: "S01_SH01", durationSeconds: 4, faceVisibilityRatio: 0.5 }),
        makeShot({ shotId: "S07_SH02", durationSeconds: 3, faceVisibilityRatio: 1 }),
      ],
      4,
    );
    expect(validation.metrics.clear_face_seconds).toBe(5);
    expect(validation.valid).toBe(false);
    expect(validation.issues[0]?.details?.suggested_conversions).toContain("POV");
  });
});

describe("brand-presence validator", () => {
  it("accepts the campaign time-band policy", () => {
    const validation = validateBrandPresence(
      makeFortySecondBrandPlan(),
      kolkataHomecomingBrandPolicy,
    );
    expect(validation.valid).toBe(true);
    expect(validation.metrics.moments.map((moment) => moment.role)).toEqual([
      "dealer_signage",
      "product_use",
      "environmental",
      "end_frame",
    ]);
  });

  it("blocks a missing product moment and a non-deterministic end frame", () => {
    const plan = makeFortySecondBrandPlan();
    const invalid = plan.map((shot) => {
      if (shot.shot_id === "S05_SH01") {
        return makeShot({ shotId: shot.shot_id, durationSeconds: shot.duration_seconds });
      }
      if (shot.shot_id === "S08_SH01") {
        return makeShot({
          shotId: shot.shot_id,
          durationSeconds: shot.duration_seconds,
          brand: {
            type: "end_frame",
            assetIds: ["asset_logo_primary"],
            screenTimeSeconds: 3,
            deterministicOverlay: false,
          },
        });
      }
      return shot;
    });

    const validation = validateBrandPresence(invalid, kolkataHomecomingBrandPolicy);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["REQUIRED_BRAND_MOMENT_MISSING", "END_FRAME_MUST_BE_DETERMINISTIC"]),
    );
  });
});

describe("scene budgets", () => {
  it("rejects shots that exceed their scene budget", () => {
    const scenes = [
      {
        scene_id: "S01",
        title: "Arrival",
        narrative_job: "Establish the return",
        duration_budget_seconds: 4,
        color_state: "monochrome",
        character_visibility: "clear" as const,
        brand_requirement: "none" as const,
        shots: ["S01_SH01"],
      },
    ];
    const validation = validateSceneBudgets(
      scenes,
      [makeShot({ shotId: "S01_SH01", durationSeconds: 4.5 })],
      4,
    );
    expect(validation.valid).toBe(false);
    expect(validation.issues[0]?.code).toBe("SCENE_SHOTS_OVER_BUDGET");
  });
});
