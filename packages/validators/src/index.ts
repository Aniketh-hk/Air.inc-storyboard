import type { BrandRole, SceneSpec, ShotSpec } from "@creative-engine/schemas";

export type ValidatorIssue = {
  code: string;
  severity: "warning" | "error";
  message: string;
  path?: string;
  details?: Readonly<Record<string, unknown>>;
};

export type ValidationResult<TMetrics extends Record<string, unknown>> = {
  valid: boolean;
  issues: ValidatorIssue[];
  metrics: TMetrics;
};

function result<TMetrics extends Record<string, unknown>>(
  issues: ValidatorIssue[],
  metrics: TMetrics,
): ValidationResult<TMetrics> {
  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
    metrics,
  };
}

export type RuntimeMetrics = {
  target_seconds: number;
  planned_seconds: number;
  delta_seconds: number;
};

export function validateRuntime(
  shots: readonly ShotSpec[],
  targetSeconds: number,
  allowedUnderfillSeconds = 0,
): ValidationResult<RuntimeMetrics> {
  const plannedSeconds = shots.reduce((total, shot) => total + shot.duration_seconds, 0);
  const issues: ValidatorIssue[] = [];

  if (plannedSeconds > targetSeconds) {
    issues.push({
      code: "SHOT_PLAN_OVER_RUNTIME",
      severity: "error",
      message: `Planned edit duration ${plannedSeconds}s exceeds the ${targetSeconds}s target`,
      path: "shots",
      details: { planned_seconds: plannedSeconds, target_seconds: targetSeconds },
    });
  } else if (plannedSeconds < targetSeconds - allowedUnderfillSeconds) {
    issues.push({
      code: "SHOT_PLAN_UNDER_RUNTIME",
      severity: "warning",
      message: `Planned edit duration ${plannedSeconds}s underfills the ${targetSeconds}s target`,
      path: "shots",
      details: {
        allowed_underfill_seconds: allowedUnderfillSeconds,
        planned_seconds: plannedSeconds,
        target_seconds: targetSeconds,
      },
    });
  }

  return result(issues, {
    target_seconds: targetSeconds,
    planned_seconds: plannedSeconds,
    delta_seconds: plannedSeconds - targetSeconds,
  });
}

export type FaceTimeMetrics = {
  clear_face_seconds: number;
  max_clear_face_seconds: number;
  excess_seconds: number;
};

export function validateFaceTime(
  shots: readonly ShotSpec[],
  maxClearFaceSeconds: number,
): ValidationResult<FaceTimeMetrics> {
  const clearFaceSeconds = shots.reduce(
    (total, shot) =>
      total +
      (shot.character.visible ? shot.duration_seconds * shot.character.face_visibility_ratio : 0),
    0,
  );
  const issues: ValidatorIssue[] = [];

  if (clearFaceSeconds > maxClearFaceSeconds) {
    issues.push({
      code: "FACE_TIME_LIMIT_EXCEEDED",
      severity: "error",
      message: `Clear face time ${clearFaceSeconds.toFixed(2)}s exceeds the ${maxClearFaceSeconds}s style limit`,
      path: "shots.character.face_visibility_ratio",
      details: {
        suggested_conversions: ["POV", "back_profile", "hands", "reflection", "environment_broll"],
      },
    });
  }

  return result(issues, {
    clear_face_seconds: clearFaceSeconds,
    max_clear_face_seconds: maxClearFaceSeconds,
    excess_seconds: Math.max(0, clearFaceSeconds - maxClearFaceSeconds),
  });
}

export type BrandTimeBand = {
  id: string;
  start_seconds: number;
  end_seconds: number;
  allowed_roles: readonly BrandRole[];
  required_roles?: readonly BrandRole[];
  max_occurrences?: number;
};

export type BrandMoment = {
  shot_id: string;
  role: BrandRole;
  start_seconds: number;
  end_seconds: number;
  asset_ids: readonly string[];
};

export type BrandPresenceMetrics = {
  total_brand_seconds: number;
  moments: BrandMoment[];
  band_occurrences: Record<string, number>;
};

export const kolkataHomecomingBrandPolicy: readonly BrandTimeBand[] = [
  {
    id: "opening_0_5",
    start_seconds: 0,
    end_seconds: 5,
    allowed_roles: ["environmental"],
    max_occurrences: 1,
  },
  {
    id: "environment_5_12",
    start_seconds: 5,
    end_seconds: 12,
    allowed_roles: ["environmental", "dealer_signage"],
    max_occurrences: 1,
  },
  {
    id: "environment_12_20",
    start_seconds: 12,
    end_seconds: 20,
    allowed_roles: ["environmental", "dealer_signage"],
    max_occurrences: 1,
  },
  {
    id: "primary_product_20_24",
    start_seconds: 20,
    end_seconds: 24,
    allowed_roles: ["product_use", "packshot"],
    required_roles: ["product_use"],
  },
  {
    id: "environment_24_34",
    start_seconds: 24,
    end_seconds: 34,
    allowed_roles: ["environmental", "dealer_signage", "sponsor_association"],
    max_occurrences: 1,
  },
  {
    id: "end_frame_34_40",
    start_seconds: 34,
    end_seconds: 40,
    allowed_roles: ["end_frame", "packshot"],
    required_roles: ["end_frame"],
  },
] as const;

function findBand(policy: readonly BrandTimeBand[], time: number): BrandTimeBand | undefined {
  return policy.find((band) => time >= band.start_seconds && time < band.end_seconds);
}

export function validateBrandPresence(
  shots: readonly ShotSpec[],
  policy: readonly BrandTimeBand[],
): ValidationResult<BrandPresenceMetrics> {
  const issues: ValidatorIssue[] = [];
  const moments: BrandMoment[] = [];
  const bandOccurrences: Record<string, number> = Object.fromEntries(
    policy.map((band) => [band.id, 0]),
  );
  let cursor = 0;

  for (const shot of shots) {
    if (shot.brand.visible && shot.brand.type !== null) {
      const band = findBand(policy, cursor);
      const moment: BrandMoment = {
        shot_id: shot.shot_id,
        role: shot.brand.type,
        start_seconds: cursor,
        end_seconds: Math.min(
          cursor + shot.brand.screen_time_target_seconds,
          cursor + shot.duration_seconds,
        ),
        asset_ids: shot.brand.asset_ids,
      };
      moments.push(moment);

      if (!band?.allowed_roles.includes(moment.role)) {
        issues.push({
          code: "BRAND_ROLE_OUTSIDE_ALLOWED_TIME_BAND",
          severity: "error",
          message: `${moment.role} is not allowed at ${cursor}s`,
          path: `shots.${shot.shot_id}.brand`,
          details: { band_id: band?.id ?? null, role: moment.role },
        });
      } else {
        bandOccurrences[band.id] = (bandOccurrences[band.id] ?? 0) + 1;
      }

      if (
        ["product_use", "packshot", "dealer_signage", "end_frame"].includes(moment.role) &&
        moment.asset_ids.length === 0
      ) {
        issues.push({
          code: "OFFICIAL_BRAND_ASSET_REQUIRED",
          severity: "error",
          message: `${moment.role} requires at least one official brand asset ID`,
          path: `shots.${shot.shot_id}.brand.asset_ids`,
        });
      }

      if (moment.role === "end_frame" && !shot.brand.deterministic_overlay) {
        issues.push({
          code: "END_FRAME_MUST_BE_DETERMINISTIC",
          severity: "error",
          message: "The end-frame brand lockup must be composited deterministically",
          path: `shots.${shot.shot_id}.brand.deterministic_overlay`,
        });
      }
    }

    cursor += shot.duration_seconds;
  }

  for (const band of policy) {
    const matchingMoments = moments.filter(
      (moment) =>
        moment.start_seconds >= band.start_seconds && moment.start_seconds < band.end_seconds,
    );

    if (
      band.required_roles !== undefined &&
      !band.required_roles.some((role) => matchingMoments.some((moment) => moment.role === role))
    ) {
      issues.push({
        code: "REQUIRED_BRAND_MOMENT_MISSING",
        severity: "error",
        message: `Time band ${band.id} requires one of: ${band.required_roles.join(", ")}`,
        path: "shots.brand",
        details: { band_id: band.id, required_roles: band.required_roles },
      });
    }

    const occurrences = bandOccurrences[band.id] ?? 0;
    if (band.max_occurrences !== undefined && occurrences > band.max_occurrences) {
      issues.push({
        code: "BRAND_FREQUENCY_EXCEEDED",
        severity: "error",
        message: `Time band ${band.id} allows ${band.max_occurrences} brand occurrence(s), found ${occurrences}`,
        path: "shots.brand",
        details: { band_id: band.id, occurrences },
      });
    }
  }

  const totalBrandSeconds = moments.reduce(
    (total, moment) => total + (moment.end_seconds - moment.start_seconds),
    0,
  );

  return result(issues, {
    total_brand_seconds: totalBrandSeconds,
    moments,
    band_occurrences: bandOccurrences,
  });
}

export type SceneBudgetMetrics = {
  target_seconds: number;
  scene_budget_seconds: number;
  scene_shot_seconds: Record<string, number>;
};

export function validateSceneBudgets(
  scenes: readonly SceneSpec[],
  shots: readonly ShotSpec[],
  targetSeconds: number,
  toleranceSeconds = 0,
): ValidationResult<SceneBudgetMetrics> {
  const issues: ValidatorIssue[] = [];
  const sceneShotSeconds: Record<string, number> = {};
  const sceneBudgetSeconds = scenes.reduce(
    (total, scene) => total + scene.duration_budget_seconds,
    0,
  );

  for (const scene of scenes) {
    const actual = shots
      .filter((shot) => shot.scene_id === scene.scene_id)
      .reduce((total, shot) => total + shot.duration_seconds, 0);
    sceneShotSeconds[scene.scene_id] = actual;
    if (actual > scene.duration_budget_seconds) {
      issues.push({
        code: "SCENE_SHOTS_OVER_BUDGET",
        severity: "error",
        message: `${scene.scene_id} contains ${actual}s of shots for a ${scene.duration_budget_seconds}s budget`,
        path: `scenes.${scene.scene_id}.shots`,
      });
    }
  }

  if (Math.abs(sceneBudgetSeconds - targetSeconds) > toleranceSeconds) {
    issues.push({
      code: "SCENE_BUDGET_TOTAL_MISMATCH",
      severity: "error",
      message: `Scene budgets total ${sceneBudgetSeconds}s instead of the ${targetSeconds}s target`,
      path: "scenes.duration_budget_seconds",
    });
  }

  return result(issues, {
    target_seconds: targetSeconds,
    scene_budget_seconds: sceneBudgetSeconds,
    scene_shot_seconds: sceneShotSeconds,
  });
}
