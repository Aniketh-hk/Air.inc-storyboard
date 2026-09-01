import { type ShotSpec, shotSpecSchema } from "@creative-engine/schemas";

type ShotFixtureOptions = {
  shotId: string;
  durationSeconds: number;
  sceneId?: string;
  faceVisibilityRatio?: number;
  identityCritical?: boolean;
  brand?: {
    type: ShotSpec["brand"]["type"];
    assetIds?: string[];
    screenTimeSeconds?: number;
    deterministicOverlay?: boolean;
  };
};

export function makeShot(options: ShotFixtureOptions): ShotSpec {
  const visibleFace = (options.faceVisibilityRatio ?? 0) > 0;
  const visibleBrand = options.brand !== undefined;

  return shotSpecSchema.parse({
    shot_id: options.shotId,
    scene_id: options.sceneId ?? "S01",
    shot_type: "wide",
    camera: {
      movement: { type: "static", intensity: "locked" },
      angle: "eye_level",
      lens_equivalent_mm: 35,
    },
    action_description: "A subject moves through a clearly visible environment.",
    dialogue_voiceover: null,
    duration_seconds: options.durationSeconds,
    audio_notes: { music: null, ambient: [], sfx: [] },
    transition_to_next: { type: "hard_cut" },
    on_screen_text: null,
    character: {
      visible: visibleFace,
      character_id: visibleFace ? "char_user_001" : null,
      identity_reference_required: options.identityCritical ?? false,
      identity_critical: options.identityCritical ?? false,
      pose: visibleFace ? "front profile" : null,
      wardrobe: visibleFace ? "campaign wardrobe" : null,
      face_visibility_ratio: options.faceVisibilityRatio ?? 0,
    },
    brand: {
      visible: visibleBrand,
      type: options.brand?.type ?? null,
      asset_ids: options.brand?.assetIds ?? [],
      screen_time_target_seconds: visibleBrand
        ? (options.brand?.screenTimeSeconds ?? options.durationSeconds)
        : 0,
      deterministic_overlay: options.brand?.deterministicOverlay ?? false,
    },
    visual_prompt: "",
    video_prompt: "",
    negative_constraints: ["no_generated_text"],
    continuity_refs: [],
    qa_requirements: {
      min_visual_score: 8.5,
      face_check: visibleFace,
      brand_check: visibleBrand,
    },
  });
}

export function makeFortySecondBrandPlan(): ShotSpec[] {
  return [
    makeShot({ shotId: "S01_SH01", durationSeconds: 5 }),
    makeShot({
      shotId: "S02_SH01",
      durationSeconds: 7,
      brand: { type: "dealer_signage", assetIds: ["asset_dealer_sign"], screenTimeSeconds: 1 },
    }),
    makeShot({ shotId: "S03_SH01", durationSeconds: 8 }),
    makeShot({
      shotId: "S05_SH01",
      durationSeconds: 4,
      brand: { type: "product_use", assetIds: ["paint_bucket_01"], screenTimeSeconds: 2.2 },
    }),
    makeShot({
      shotId: "S06_SH01",
      durationSeconds: 10,
      brand: { type: "environmental", screenTimeSeconds: 1 },
    }),
    makeShot({
      shotId: "S08_SH01",
      durationSeconds: 6,
      brand: {
        type: "end_frame",
        assetIds: ["asset_logo_primary"],
        screenTimeSeconds: 3,
        deterministicOverlay: true,
      },
    }),
  ];
}
