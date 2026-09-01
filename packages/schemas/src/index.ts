import { z } from "zod";

const idSchema = z.string().trim().min(1).max(128);
const nonEmptyTextSchema = z.string().trim().min(1);
const secondsSchema = z.number().nonnegative();
const positiveSecondsSchema = z.number().positive();
const ratioSchema = z.string().regex(/^\d+:\d+$/, "Expected an aspect ratio such as 16:9");
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const timestampSchema = z.iso.datetime({ offset: true });

export const projectStatusSchema = z.enum([
  "DRAFT",
  "NORMALISING",
  "CONCEPT_READY",
  "WAITING_CONCEPT_APPROVAL",
  "STORYBOARDING",
  "WAITING_STORYBOARD_APPROVAL",
  "KEYFRAME_GENERATION",
  "KEYFRAME_QA",
  "VIDEO_GENERATION",
  "VIDEO_QA",
  "AUDIO_PREP",
  "TIMELINE_ASSEMBLY",
  "PREVIEW_READY",
  "WAITING_FINAL_APPROVAL",
  "FINAL_RENDERING",
  "FINAL_QA",
  "READY",
  "FAILED_RETRYABLE",
  "FAILED_BLOCKED",
  "CANCELLED",
]);

export const brandRoleSchema = z.enum([
  "environmental",
  "product_use",
  "dealer_signage",
  "sponsor_association",
  "packshot",
  "end_frame",
]);

export const creativeSpecSchema = z
  .object({
    schema_version: z.literal("1.0"),
    project_id: idSchema,
    brand_pack_id: idSchema,
    style_pack_id: idSchema,
    campaign_pack_id: idSchema,
    idea: nonEmptyTextSchema,
    objective: nonEmptyTextSchema,
    audience: z.array(nonEmptyTextSchema).min(1),
    duration_seconds: positiveSecondsSchema,
    aspect_ratios: z.array(ratioSchema).min(1),
    deliverables: z
      .array(
        z.enum([
          "mp4",
          "mov",
          "storyboard_pdf",
          "storyboard_pptx",
          "shot_sheet_csv",
          "shot_sheet_xlsx",
          "project_manifest_json",
        ]),
      )
      .min(1),
    personalization: z
      .object({
        enabled: z.boolean(),
        input: z.enum(["user_photo", "reference_sheet"]).nullable(),
        identity_critical_shots: z.array(idSchema),
      })
      .strict()
      .superRefine((value, context) => {
        if (value.enabled && value.identity_critical_shots.length === 0) {
          context.addIssue({
            code: "custom",
            message: "Identity-critical shots are required when personalization is enabled",
            path: ["identity_critical_shots"],
          });
        }
        if (!value.enabled && value.input !== null) {
          context.addIssue({
            code: "custom",
            message: "Personalization input must be null when personalization is disabled",
            path: ["input"],
          });
        }
      }),
    approval_mode: z.enum(["human_gated"]),
    budget: z
      .object({
        currency: currencySchema,
        max_generation_cost: z.number().nonnegative(),
        enforcement: z.enum(["soft", "hard"]).default("hard"),
      })
      .strict(),
    assumptions: z.array(nonEmptyTextSchema).default([]),
    constraints: z.array(nonEmptyTextSchema).default([]),
  })
  .strict();

export const storySpecSchema = z
  .object({
    story_id: idSchema,
    premise: nonEmptyTextSchema,
    narrative_arc: z.array(nonEmptyTextSchema).min(1),
    emotional_beats: z.array(nonEmptyTextSchema).min(1),
    ending: nonEmptyTextSchema,
  })
  .strict();

export const sceneSpecSchema = z
  .object({
    scene_id: idSchema,
    title: nonEmptyTextSchema,
    narrative_job: nonEmptyTextSchema,
    duration_budget_seconds: positiveSecondsSchema,
    color_state: nonEmptyTextSchema,
    character_visibility: z.enum(["none", "minimal", "clear", "hero"]),
    brand_requirement: z.enum([
      "none",
      "optional_environmental",
      "required_environmental",
      "required_product",
      "required_end_frame",
    ]),
    shots: z.array(idSchema),
  })
  .strict();

export const dialogueVoiceoverSchema = z
  .object({
    kind: z.enum(["dialogue", "voiceover"]),
    speaker: nonEmptyTextSchema,
    text: nonEmptyTextSchema,
    start_seconds: secondsSchema,
    duration_seconds: positiveSecondsSchema,
  })
  .strict();

export const audioNotesSchema = z
  .object({
    music: z.string().nullable(),
    ambient: z.array(nonEmptyTextSchema),
    sfx: z.array(nonEmptyTextSchema),
    ducking_db: z.number().nonpositive().optional(),
  })
  .strict();

export const transitionSchema = z
  .object({
    type: z.enum([
      "hard_cut",
      "cut_on_action",
      "cut_on_eyeline",
      "sound_bridge",
      "match_cut",
      "motion_match",
      "color_match",
      "dissolve",
      "fade",
      "end",
    ]),
    duration_seconds: secondsSchema.optional(),
    match_element: z.string().optional(),
  })
  .strict();

export const onScreenTextSchema = z
  .object({
    enabled: z.literal(true),
    copy: nonEmptyTextSchema,
    timeline_start: secondsSchema,
    duration_seconds: positiveSecondsSchema,
    position: nonEmptyTextSchema,
    style_token: idSchema,
    render_mode: z.literal("deterministic_overlay"),
    legal: z.boolean(),
  })
  .strict();

export const characterInShotSchema = z
  .object({
    visible: z.boolean(),
    character_id: idSchema.nullable(),
    identity_reference_required: z.boolean(),
    identity_critical: z.boolean(),
    pose: z.string().nullable(),
    wardrobe: z.string().nullable(),
    face_visibility_ratio: z.number().min(0).max(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.visible && value.face_visibility_ratio !== 0) {
      context.addIssue({
        code: "custom",
        message: "A hidden character must have a zero face visibility ratio",
        path: ["face_visibility_ratio"],
      });
    }
    if (value.identity_reference_required && value.character_id === null) {
      context.addIssue({
        code: "custom",
        message: "Identity reference checks require a character_id",
        path: ["character_id"],
      });
    }
  });

export const brandInShotSchema = z
  .object({
    visible: z.boolean(),
    type: brandRoleSchema.nullable(),
    asset_ids: z.array(idSchema),
    screen_time_target_seconds: secondsSchema,
    deterministic_overlay: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.visible && value.type === null) {
      context.addIssue({
        code: "custom",
        message: "A visible brand moment requires a type",
        path: ["type"],
      });
    }
    if (!value.visible && value.screen_time_target_seconds !== 0) {
      context.addIssue({
        code: "custom",
        message: "A hidden brand must have zero target screen time",
        path: ["screen_time_target_seconds"],
      });
    }
  });

export const shotSpecSchema = z
  .object({
    shot_id: idSchema,
    scene_id: idSchema,
    shot_type: z.enum([
      "wide",
      "medium",
      "medium_close_up",
      "close_up",
      "extreme_close_up",
      "over_the_shoulder",
      "POV",
      "insert",
      "aerial",
      "graphic",
    ]),
    camera: z
      .object({
        movement: z
          .object({
            type: z.enum([
              "static",
              "pan",
              "tilt",
              "dolly",
              "truck",
              "crane",
              "handheld",
              "drone",
              "zoom",
            ]),
            intensity: z.enum(["locked", "subtle_natural_drift", "slow", "moderate", "fast"]),
          })
          .strict(),
        angle: z.enum([
          "eye_level",
          "low_angle",
          "high_angle",
          "bird_eye",
          "dutch",
          "shoulder_height",
          "ground_level",
          "not_applicable",
        ]),
        lens_equivalent_mm: z.number().positive().nullable(),
      })
      .strict(),
    action_description: nonEmptyTextSchema,
    dialogue_voiceover: dialogueVoiceoverSchema.nullable(),
    duration_seconds: positiveSecondsSchema,
    audio_notes: audioNotesSchema,
    transition_to_next: transitionSchema,
    on_screen_text: onScreenTextSchema.nullable(),
    character: characterInShotSchema,
    brand: brandInShotSchema,
    visual_prompt: z.string(),
    video_prompt: z.string(),
    negative_constraints: z.array(nonEmptyTextSchema),
    continuity_refs: z.array(idSchema),
    qa_requirements: z
      .object({
        min_visual_score: z.number().min(0).max(10),
        face_check: z.boolean(),
        brand_check: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.dialogue_voiceover !== null) {
      const end =
        value.dialogue_voiceover.start_seconds + value.dialogue_voiceover.duration_seconds;
      if (end > value.duration_seconds) {
        context.addIssue({
          code: "custom",
          message: "Dialogue/voiceover timing must fit within the shot duration",
          path: ["dialogue_voiceover"],
        });
      }
    }
    if (value.brand.screen_time_target_seconds > value.duration_seconds) {
      context.addIssue({
        code: "custom",
        message: "Brand target screen time cannot exceed shot duration",
        path: ["brand", "screen_time_target_seconds"],
      });
    }
  });

export const assetSchema = z
  .object({
    id: idSchema,
    project_id: idSchema,
    type: z.enum([
      "input",
      "reference",
      "keyframe",
      "video",
      "audio",
      "document",
      "render",
      "thumbnail",
    ]),
    uri: nonEmptyTextSchema,
    checksum: z.string().regex(/^[a-f0-9]{64}$/i),
    mime_type: nonEmptyTextSchema,
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    duration_seconds: secondsSchema.nullable(),
    immutable: z.literal(true),
    source_asset_ids: z.array(idSchema),
    created_at: timestampSchema,
  })
  .strict();

export const generationJobSchema = z
  .object({
    id: idSchema,
    project_id: idSchema,
    shot_id: idSchema.nullable(),
    category: z.enum(["llm", "image", "video", "audio", "render"]),
    provider: nonEmptyTextSchema,
    model: nonEmptyTextSchema,
    prompt_template_id: idSchema,
    prompt_template_version: nonEmptyTextSchema,
    resolved_prompt: z.string(),
    params: z.record(z.string(), z.unknown()),
    reference_asset_ids: z.array(idSchema),
    provider_request_id: z.string().nullable(),
    status: z.enum(["QUEUED", "SUBMITTED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
    estimated_cost: z.number().nonnegative(),
    actual_cost: z.number().nonnegative().nullable(),
    currency: currencySchema,
    error: z.string().nullable(),
  })
  .strict();

export const qaIssueSchema = z
  .object({
    code: idSchema,
    dimension: z.enum([
      "identity",
      "brand",
      "composition",
      "continuity",
      "technical",
      "style",
      "anatomy",
      "environment",
      "text_signage",
    ]),
    severity: z.enum(["warning", "error"]),
    message: nonEmptyTextSchema,
    frame_or_time: z.string().nullable(),
  })
  .strict();

export const qaResultSchema = z
  .object({
    id: idSchema,
    asset_id: idSchema,
    shot_id: idSchema.nullable(),
    evaluator: nonEmptyTextSchema,
    dimension_scores: z.record(z.string(), z.number().min(0).max(10)),
    score: z.number().min(0).max(10),
    issues: z.array(qaIssueSchema),
    hard_fail: z.boolean(),
    disposition: z.enum(["PASS", "REVIEW", "FAIL"]),
    created_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const expected = value.hard_fail
      ? "FAIL"
      : value.score >= 8.5
        ? "PASS"
        : value.score >= 7
          ? "REVIEW"
          : "FAIL";
    if (value.disposition !== expected) {
      context.addIssue({
        code: "custom",
        message: `Disposition must be ${expected} for this score and hard-fail state`,
        path: ["disposition"],
      });
    }
  });

export const approvalSchema = z
  .object({
    id: idSchema,
    revision_id: idSchema,
    scope_type: z.enum(["concept", "storyboard", "shot", "preview", "final"]),
    scope_id: idSchema,
    actor_id: idSchema,
    decision: z.enum(["approved", "rejected"]),
    comment: z.string().nullable(),
    created_at: timestampSchema,
  })
  .strict();

export const timelineEntrySchema = z
  .object({
    shot_id: idSchema,
    asset_id: idSchema,
    timeline_start: secondsSchema,
    source_in: secondsSchema,
    duration: positiveSecondsSchema,
    transition_out: transitionSchema.shape.type,
  })
  .strict();

export const timelineSchema = z
  .object({
    id: idSchema,
    revision_id: idSchema,
    timeline: z.array(timelineEntrySchema).min(1),
    music_asset_id: idSchema.nullable(),
    master_lufs: z.number().max(0),
    end_card_template: idSchema.nullable(),
    duration_seconds: positiveSecondsSchema,
  })
  .strict();

export const renderSchema = z
  .object({
    id: idSchema,
    timeline_id: idSchema,
    variant: z
      .object({
        aspect_ratio: ratioSchema,
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        format: z.enum(["mp4", "mov"]),
        clean_master: z.boolean(),
        watermark: z.boolean(),
      })
      .strict(),
    asset_id: idSchema.nullable(),
    status: z.enum(["QUEUED", "RENDERING", "SUCCEEDED", "FAILED", "CANCELLED"]),
  })
  .strict();

export const characterReferenceSchema = z
  .object({
    character_id: idSchema,
    source_asset_ids: z.array(idSchema).min(1),
    consent_id: idSchema,
    reference_sheet_asset_ids: z.array(idSchema),
    identity_strength: z.enum(["low", "medium", "high"]),
    allowed_transformations: z.array(nonEmptyTextSchema),
    forbidden_transformations: z.array(nonEmptyTextSchema),
  })
  .strict();

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type BrandRole = z.infer<typeof brandRoleSchema>;
export type CreativeSpec = z.infer<typeof creativeSpecSchema>;
export type StorySpec = z.infer<typeof storySpecSchema>;
export type SceneSpec = z.infer<typeof sceneSpecSchema>;
export type ShotSpec = z.infer<typeof shotSpecSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type GenerationJob = z.infer<typeof generationJobSchema>;
export type QAResult = z.infer<typeof qaResultSchema>;
export type Approval = z.infer<typeof approvalSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
export type Render = z.infer<typeof renderSchema>;
export type CharacterReference = z.infer<typeof characterReferenceSchema>;
