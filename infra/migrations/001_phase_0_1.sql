BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE project_status AS ENUM (
  'DRAFT',
  'NORMALISING',
  'CONCEPT_READY',
  'WAITING_CONCEPT_APPROVAL',
  'STORYBOARDING',
  'WAITING_STORYBOARD_APPROVAL',
  'KEYFRAME_GENERATION',
  'KEYFRAME_QA',
  'VIDEO_GENERATION',
  'VIDEO_QA',
  'AUDIO_PREP',
  'TIMELINE_ASSEMBLY',
  'PREVIEW_READY',
  'WAITING_FINAL_APPROVAL',
  'FINAL_RENDERING',
  'FINAL_QA',
  'READY',
  'FAILED_RETRYABLE',
  'FAILED_BLOCKED',
  'CANCELLED'
);

CREATE TYPE approval_decision AS ENUM ('approved', 'rejected');
CREATE TYPE job_status AS ENUM ('QUEUED', 'SUBMITTED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE projects (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  owner_id text NOT NULL,
  name text NOT NULL,
  status project_status NOT NULL DEFAULT 'DRAFT',
  current_revision integer NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_revisions (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  creative_spec_json jsonb NOT NULL,
  packs_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision_number)
);

CREATE TABLE scenes (
  id text PRIMARY KEY,
  revision_id text NOT NULL REFERENCES project_revisions(id) ON DELETE CASCADE,
  order_index integer NOT NULL CHECK (order_index >= 0),
  spec_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (revision_id, order_index)
);

CREATE TABLE shots (
  id text PRIMARY KEY,
  scene_id text NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  order_index integer NOT NULL CHECK (order_index >= 0),
  spec_json jsonb NOT NULL,
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scene_id, order_index)
);

CREATE TABLE assets (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL,
  uri text NOT NULL,
  checksum char(64) NOT NULL,
  mime_type text NOT NULL,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  duration_seconds numeric(12, 3) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  immutable boolean NOT NULL DEFAULT true CHECK (immutable),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, checksum, uri)
);

CREATE TABLE generation_jobs (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shot_id text REFERENCES shots(id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text NOT NULL,
  category text NOT NULL CHECK (category IN ('llm', 'image', 'video', 'audio', 'render')),
  prompt_template_id text NOT NULL,
  prompt_template_version text NOT NULL,
  resolved_prompt text NOT NULL,
  params_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  reference_asset_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_request_id text,
  status job_status NOT NULL DEFAULT 'QUEUED',
  estimated_cost numeric(14, 4) NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
  actual_cost numeric(14, 4) CHECK (actual_cost IS NULL OR actual_cost >= 0),
  currency char(3) NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE qa_results (
  id text PRIMARY KEY,
  asset_id text NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  shot_id text REFERENCES shots(id) ON DELETE SET NULL,
  evaluator text NOT NULL,
  score numeric(4, 2) NOT NULL CHECK (score >= 0 AND score <= 10),
  issues_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  hard_fail boolean NOT NULL DEFAULT false,
  disposition text NOT NULL CHECK (disposition IN ('PASS', 'REVIEW', 'FAIL')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approvals (
  id text PRIMARY KEY,
  revision_id text NOT NULL REFERENCES project_revisions(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('concept', 'storyboard', 'shot', 'preview', 'final')),
  scope_id text NOT NULL,
  actor_id text NOT NULL,
  decision approval_decision NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_workspace_created_idx ON projects (workspace_id, created_at DESC);
CREATE INDEX revisions_project_idx ON project_revisions (project_id, revision_number DESC);
CREATE INDEX scenes_revision_idx ON scenes (revision_id, order_index);
CREATE INDEX shots_scene_idx ON shots (scene_id, order_index);
CREATE INDEX assets_project_type_idx ON assets (project_id, type);
CREATE INDEX jobs_project_status_idx ON generation_jobs (project_id, status);
CREATE INDEX jobs_shot_idx ON generation_jobs (shot_id, created_at DESC);
CREATE INDEX qa_asset_idx ON qa_results (asset_id, created_at DESC);
CREATE INDEX approvals_revision_scope_idx ON approvals (revision_id, scope_type, scope_id);

CREATE FUNCTION reject_asset_content_update() RETURNS trigger AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.uri IS DISTINCT FROM OLD.uri
    OR NEW.checksum IS DISTINCT FROM OLD.checksum
    OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
    OR NEW.width IS DISTINCT FROM OLD.width
    OR NEW.height IS DISTINCT FROM OLD.height
    OR NEW.duration_seconds IS DISTINCT FROM OLD.duration_seconds
    OR NEW.metadata_json IS DISTINCT FROM OLD.metadata_json
    OR NEW.immutable IS DISTINCT FROM OLD.immutable
  THEN
    RAISE EXCEPTION 'assets are immutable; create a new asset instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_are_immutable
BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE FUNCTION reject_asset_content_update();

COMMIT;
