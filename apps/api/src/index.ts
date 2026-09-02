import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

export type HealthStatus = {
  service: "creative-engine-api";
  status: "ok";
  phase: "content-canvas-prototype";
};

export type ConnectorName = string;

export type ScriptIdea = {
  id: string;
  title: string;
  hook: string;
  script: string;
  tone: string;
  cta?: string;
  beats?: string[];
};

export type SheetOption = {
  id: string;
  title: string;
  detail: string;
  selected: boolean;
};

export type CanvasExpansion = {
  idea: ScriptIdea;
  characters: SheetOption[];
  scenes: SheetOption[];
  mixes: {
    id: string;
    title: string;
    detail: string;
  }[];
};

export type MoodboardResponse = {
  moodboard_id: string;
  title: string;
  summary: string;
  share_url: string;
  connectors: ConnectorName[];
};

export type ResearchUnderstanding = {
  summary: string;
  themes: string[];
  audience: string[];
  constraints: string[];
  product_truths: string[];
  creative_angles: string[];
  tone: string[];
  links: string[];
};

export type AssetRecord = {
  asset_id: string;
  name: string;
  kind: "reference" | "character" | "scene" | "brand" | "audio" | "script" | "unknown";
  tags: string[];
  source: string;
};

export type ProjectSnapshot = {
  project_id: string;
  saved_at: string;
  idea_count: number;
  asset_count: number;
  connector_count: number;
  canvas_node_count: number;
};

export type ExportPackage = {
  export_id: string;
  formats: string[];
  status: "ready";
  manifest_url: string;
};

export type ConnectorDefinition = {
  name: string;
  role: "writing" | "research" | "voice" | "image" | "video" | "design" | "workspace";
  status: "mocked" | "needs_credentials";
};

export type ResearchSample = {
  id: string;
  title: string;
  kind: "website" | "idea" | "positioning" | "audience" | "proof" | "creative_pattern";
  source_url?: string;
  excerpt: string;
  signal: string;
  confidence: "high" | "medium" | "low";
};

export type ContentResearchPack = {
  research_id: string;
  input: string;
  mode: "website" | "idea";
  provider: "gpt" | "local";
  summary: string;
  samples: ResearchSample[];
  understanding: ResearchUnderstanding;
  suggested_prompts: string[];
};

type JsonRecord = Record<string, unknown>;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const defaultCorsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
} as const;

export function getHealthStatus(): HealthStatus {
  return { service: "creative-engine-api", status: "ok", phase: "content-canvas-prototype" };
}

function toSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "creative-board"
  );
}

function compactText(value: string, maxLength = 120): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
}

function sentenceCase(value: string): string {
  const compact = value.trim();
  return compact.length > 0 ? `${compact[0]?.toUpperCase() ?? ""}${compact.slice(1)}` : "";
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isWebsiteInput(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeWebsiteUrl(value: string): string | null {
  const trimmed = value.trim();
  const candidate =
    /^https?:\/\//i.test(trimmed) || trimmed.includes(" ") || !trimmed.includes(".")
      ? trimmed
      : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (
      ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname) ||
      url.hostname.startsWith("10.") ||
      url.hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname)
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

function extractHtmlAttribute(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return compactText(decodeHtmlEntities(match?.[1] ?? ""), 160);
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function extractHeadings(html: string): string[] {
  return [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => compactText(stripHtml(match[1] ?? ""), 120))
    .filter((heading) => heading.length > 0)
    .slice(0, 6);
}

function buildLocalSamples(input: string, websiteUrl: string | null, html = ""): ResearchSample[] {
  const cleanInput = compactText(input, 240);
  const title = html
    ? extractHtmlAttribute(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || "Website positioning"
    : sentenceCase(compactText(input, 80)) || "Raw idea";
  const description = html
    ? extractHtmlAttribute(
        html,
        /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      )
    : "";
  const headings = html ? extractHeadings(html) : [];
  const body = html ? compactText(stripHtml(html), 360) : cleanInput;
  const source_url = websiteUrl ?? undefined;
  const samples: ResearchSample[] = [
    {
      id: `sample-source-${randomUUID()}`,
      kind: websiteUrl ? "website" : "idea",
      ...(source_url ? { source_url } : {}),
      title,
      excerpt: description || body || cleanInput,
      signal: websiteUrl ? "Primary website copy" : "Raw idea seed",
      confidence: websiteUrl && html ? "high" : "medium",
    },
    {
      id: `sample-positioning-${randomUUID()}`,
      kind: "positioning",
      ...(source_url ? { source_url } : {}),
      title: "Positioning angle",
      excerpt:
        headings.length > 0
          ? headings.join(" · ")
          : `Turn “${cleanInput || "this idea"}” into a clear problem, proof, and transformation story.`,
      signal: "Messaging hierarchy",
      confidence: headings.length > 0 ? "high" : "medium",
    },
    {
      id: `sample-proof-${randomUUID()}`,
      kind: "proof",
      ...(source_url ? { source_url } : {}),
      title: "Proof to look for",
      excerpt:
        body ||
        "Look for product truths, customer pain, differentiators, workflow moments, outcomes, and objections.",
      signal: "Evidence pool for script beats",
      confidence: body ? "medium" : "low",
    },
    {
      id: `sample-pattern-${randomUUID()}`,
      kind: "creative_pattern",
      ...(source_url ? { source_url } : {}),
      title: "Creative pattern",
      excerpt:
        "Recommended base: hook with the audience problem, show the current messy world, reveal the new workflow, prove the change, end with the desired action.",
      signal: "Script structure",
      confidence: "medium",
    },
  ];
  return samples;
}

async function fetchWebsiteHtml(websiteUrl: string, fetcher: FetchLike): Promise<string> {
  const response = await fetcher(websiteUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "CreativeAutomationEngine/0.1 research-preview",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Website fetch failed: ${response.status}`);
  }
  const text = await response.text();
  return text.slice(0, 250_000);
}

function asSheetOptions(value: unknown): SheetOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    return {
      id: asString(record.id, `sheet-${randomUUID()}`),
      title: asString(record.title, "Untitled sheet"),
      detail: asString(record.detail, "Generated sheet option."),
      selected: typeof record.selected === "boolean" ? record.selected : false,
    };
  });
}

function asIdea(value: unknown): ScriptIdea {
  const record = asRecord(value);
  return {
    id: asString(record.id, `idea-${randomUUID()}`),
    title: asString(record.title, "Untitled script idea"),
    hook: asString(record.hook, "A clear story direction generated from the research."),
    script: asString(record.script, "Build a simple story around the strongest audience need."),
    tone: asString(record.tone, "clear, useful"),
  };
}

function asScriptIdeas(value: unknown): ScriptIdea[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record = asRecord(item);
    return {
      beats: asStringArray(record.beats),
      cta: asString(record.cta, "Send this direction to Canvas."),
      hook: asString(record.hook, "A clear hook generated from the research."),
      id: asString(record.id, `gpt-idea-${index + 1}`),
      script: asString(record.script, "A generated script will appear here."),
      title: asString(record.title, `Script direction ${index + 1}`),
      tone: asString(record.tone, "clear, useful"),
    };
  });
}

function extractOpenAIText(payload: unknown): string {
  const record = asRecord(payload);
  if (typeof record.output_text === "string") return record.output_text;

  const output = Array.isArray(record.output) ? record.output : [];
  return output
    .flatMap((item) => {
      const itemRecord = asRecord(item);
      const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
      return content.map((contentItem) => {
        const contentRecord = asRecord(contentItem);
        return asString(contentRecord.text);
      });
    })
    .filter((text) => text.length > 0)
    .join("\n");
}

function parseJsonObject(value: string): JsonRecord {
  const trimmed = value.trim();
  if (trimmed.length === 0) return {};
  try {
    return asRecord(JSON.parse(trimmed));
  } catch {
    const match = /\{[\s\S]*\}/.exec(trimmed);
    return match ? asRecord(JSON.parse(match[0])) : {};
  }
}

export function generateScriptIdeas(
  knowledge: string,
  connectors: readonly ConnectorName[],
): ScriptIdea[] {
  const subject = compactText(knowledge.split(/[.?!]/)[0] ?? knowledge, 96) || "the creative brief";
  const connectorLine =
    connectors.length > 0
      ? ` using ${connectors.slice(0, 3).join(", ")}`
      : " with the selected model stack";
  const seed = toSlug(subject).slice(0, 32);

  return [
    {
      id: `idea-proof-${seed}`,
      title: "Proof-first explainer",
      hook: `Make “${subject}” immediately understandable with a problem → proof → payoff structure.`,
      script: `Open with the most painful old workflow. Show the new system${connectorLine}. Land on one proof point, one emotional benefit, and a clean visual CTA.`,
      tone: "simple, confident",
      cta: "Open the board and pick the direction.",
      beats: ["Pain", "System", "Proof", "Payoff"],
    },
    {
      id: `idea-founder-${seed}`,
      title: "Founder POV story",
      hook: "Let one person explain the problem in plain language, then make the product feel inevitable.",
      script:
        "Start with a direct founder line. Cut between raw research, draft scripts, and the generated board. End when the selected idea becomes a polished storyboard.",
      tone: "premium, human",
      cta: "Turn raw context into a finished visual board.",
      beats: ["Founder truth", "Workflow gap", "Board reveal", "Decision"],
    },
    {
      id: `idea-demo-${seed}`,
      title: "Creator demo sequence",
      hook: "Move fast: one creator, one screen, three proof beats, and a final moodboard reveal.",
      script:
        "The creator dumps context, opens three generated ideas, edits one line, sends it to Canvas, and watches character and scene sheets assemble into a final board.",
      tone: "fast, social",
      cta: "Generate the storyboard from your knowledge dump.",
      beats: ["Hook", "Demo", "Options", "Reveal"],
    },
    {
      id: `idea-cinematic-${seed}`,
      title: "Cinematic mood piece",
      hook: "Turn the research into visual atmosphere: fewer words, stronger motif, more texture.",
      script:
        "Use a quiet opening, textured references, slow transitions, and one repeating visual symbol. The storyboard lands as a moodboard that already feels shoot-ready.",
      tone: "visual, atmospheric",
      cta: "Share the moodboard with the team.",
      beats: ["Texture", "Motif", "Selection", "Moodboard"],
    },
  ];
}

export function understandResearch(
  knowledge: string,
  links: readonly string[] = [],
): ResearchUnderstanding {
  const compact = compactText(knowledge, 220);
  const lower = knowledge.toLowerCase();
  const themes = [
    lower.includes("brand") ? "Brand memory" : "Creative clarity",
    lower.includes("audience") ? "Audience context" : "Viewer-first storytelling",
    lower.includes("workflow") || lower.includes("automation")
      ? "Workflow transformation"
      : "Visual proof",
  ];
  const constraints = [
    lower.includes("budget") ? "Budget-sensitive generation" : "Keep provider costs visible",
    lower.includes("deadline") ? "Fast review loop" : "Human approval before final generation",
    "Reusable references for character and scene consistency",
  ];

  return {
    audience: ["creative team", "brand owner", "reviewer"],
    constraints,
    creative_angles: [
      "before/after workflow reveal",
      "founder-led proof story",
      "creator demo with rapid visual payoff",
    ],
    links: [...links],
    product_truths: [
      "Knowledge becomes script ideas",
      "Selected ideas become visual boards",
      "Canvas decisions should be reusable across videos",
    ],
    summary:
      compact.length > 0
        ? `The brief centers on ${compact}`
        : "Add research, notes, scripts, links, or brand context to unlock sharper ideas.",
    themes,
    tone: ["simple", "premium", "cinematic", "operationally clear"],
  };
}

export async function buildContentResearch(
  input: string,
  links: readonly string[] = [],
  fetcher: FetchLike = fetch,
): Promise<ContentResearchPack> {
  const source = input.trim();
  const websiteUrl = normalizeWebsiteUrl(source);
  const isWebsite = websiteUrl !== null && isWebsiteInput(websiteUrl);
  let html = "";

  if (isWebsite && websiteUrl) {
    try {
      html = await fetchWebsiteHtml(websiteUrl, fetcher);
    } catch {
      html = "";
    }
  }

  const samples = buildLocalSamples(source, websiteUrl, html);
  const researchText = [
    source,
    ...links,
    ...samples.map((sample) => `${sample.title}: ${sample.excerpt}`),
  ].join("\n");
  const understanding = understandResearch(researchText, [
    ...(websiteUrl ? [websiteUrl] : []),
    ...links,
  ]);

  return {
    input: source,
    mode: isWebsite ? "website" : "idea",
    provider: "local",
    research_id: `research-${randomUUID()}`,
    samples,
    suggested_prompts: [
      "Generate founder-led scripts from this research.",
      "Find 5 visual hooks from the website positioning.",
      "Turn the strongest proof points into a 45-second story.",
    ],
    summary:
      isWebsite && websiteUrl
        ? `Pulled website signals from ${websiteUrl} and converted them into script-ready samples.`
        : `Converted the idea into script-ready research samples.`,
    understanding,
  };
}

async function generateGptScriptIdeas(
  research: ContentResearchPack,
  fetcher: FetchLike,
): Promise<ScriptIdea[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetcher("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content:
            "You are the Content engine for a creative automation app. Generate four distinct short-form video script directions from the supplied website/idea research. Return JSON only.",
          role: "developer",
        },
        {
          content: JSON.stringify({
            input: research.input,
            samples: research.samples,
            understanding: research.understanding,
          }),
          role: "user",
        },
      ],
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
      store: false,
      text: {
        format: {
          name: "creative_script_ideas",
          schema: {
            additionalProperties: false,
            properties: {
              ideas: {
                items: {
                  additionalProperties: false,
                  properties: {
                    beats: { items: { type: "string" }, type: "array" },
                    cta: { type: "string" },
                    hook: { type: "string" },
                    id: { type: "string" },
                    script: { type: "string" },
                    title: { type: "string" },
                    tone: { type: "string" },
                  },
                  required: ["id", "title", "hook", "script", "tone", "cta", "beats"],
                  type: "object",
                },
                type: "array",
              },
            },
            required: ["ideas"],
            type: "object",
          },
          strict: true,
          type: "json_schema",
        },
      },
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`GPT request failed: ${response.status}`);
  }

  const payload: unknown = await response.json();
  const parsed = parseJsonObject(extractOpenAIText(payload));
  const ideas = asScriptIdeas(parsed.ideas);
  return ideas.length > 0 ? ideas.slice(0, 4) : null;
}

export async function generateContentScripts(
  input: string,
  connectors: readonly ConnectorName[] = [],
  links: readonly string[] = [],
  fetcher: FetchLike = fetch,
): Promise<{ ideas: ScriptIdea[]; provider: "gpt" | "local"; research: ContentResearchPack }> {
  const research = await buildContentResearch(input, links, fetcher);

  try {
    const gptIdeas = await generateGptScriptIdeas(research, fetcher);
    if (gptIdeas) {
      return {
        ideas: gptIdeas,
        provider: "gpt",
        research: { ...research, provider: "gpt" },
      };
    }
  } catch {
    // The content page remains usable without credentials, quota, or network access.
  }

  return {
    ideas: generateScriptIdeas(
      [
        research.input,
        research.summary,
        ...research.samples.map((sample) => `${sample.title}: ${sample.excerpt}`),
      ].join("\n"),
      connectors,
    ),
    provider: "local",
    research,
  };
}

export function expandCanvasFromIdea(idea: ScriptIdea): CanvasExpansion {
  const characters: SheetOption[] = [
    {
      id: "lead-operator",
      title: "Lead operator",
      detail: `Owns the arc of “${idea.title}” and moves the story forward.`,
      selected: true,
    },
    {
      id: "creative-reviewer",
      title: "Creative reviewer",
      detail: "Represents approvals, feedback, and the moment clarity appears.",
      selected: false,
    },
    {
      id: "audience-proxy",
      title: "Audience proxy",
      detail: "Lets the viewer see the pain point before the solution arrives.",
      selected: false,
    },
  ];
  const scenes: SheetOption[] = [
    {
      id: "knowledge-room",
      title: "Knowledge room",
      detail: "Research, notes, links, references, and constraints enter the system.",
      selected: true,
    },
    {
      id: "idea-table",
      title: "Idea table",
      detail: "Multiple scripts are opened, compared, edited, and selected.",
      selected: false,
    },
    {
      id: "board-reveal",
      title: "Board reveal",
      detail: "Character and scene sheets combine into the final storyboard moodboard.",
      selected: false,
    },
  ];

  return {
    idea,
    characters,
    scenes,
    mixes: [
      {
        id: "lead-operator-knowledge-room",
        title: "Lead operator × Knowledge room",
        detail: "The cleanest first board mix for the selected idea.",
      },
    ],
  };
}

export function createMoodboardResponse(
  idea: ScriptIdea,
  connectors: readonly ConnectorName[],
  characters: readonly SheetOption[],
  scenes: readonly SheetOption[],
): MoodboardResponse {
  const selectedCharacters = characters.filter((item) => item.selected).length;
  const selectedScenes = scenes.filter((item) => item.selected).length;
  const title = `${idea.title} moodboard`;
  return {
    moodboard_id: `mb-${randomUUID()}`,
    title,
    summary: `${selectedCharacters} character direction${selectedCharacters === 1 ? "" : "s"} and ${selectedScenes} scene direction${selectedScenes === 1 ? "" : "s"} are locked for storyboard treatment.`,
    share_url: `https://cae.local/canvas/${toSlug(idea.title)}`,
    connectors: [...connectors],
  };
}

export function listConnectorDefinitions(): ConnectorDefinition[] {
  return [
    { name: "GPT", role: "writing", status: "needs_credentials" },
    { name: "Gemini", role: "research", status: "needs_credentials" },
    { name: "11 Labs", role: "voice", status: "needs_credentials" },
    { name: "Runway", role: "video", status: "needs_credentials" },
    { name: "Higgsfield", role: "video", status: "needs_credentials" },
    { name: "Canva", role: "design", status: "needs_credentials" },
    { name: "Figma", role: "design", status: "needs_credentials" },
    { name: "Notion", role: "workspace", status: "mocked" },
  ];
}

export function registerAsset(input: JsonRecord): AssetRecord {
  const name = asString(input.name, "Untitled asset");
  const kind = asString(input.kind, "unknown");
  const safeKind = ["reference", "character", "scene", "brand", "audio", "script"].includes(kind)
    ? (kind as AssetRecord["kind"])
    : "unknown";

  return {
    asset_id: `asset-${randomUUID()}`,
    kind: safeKind,
    name,
    source: asString(input.source, "manual"),
    tags: asStringArray(input.tags).length > 0 ? asStringArray(input.tags) : [safeKind, "canvas"],
  };
}

export function saveProjectSnapshot(input: JsonRecord): ProjectSnapshot {
  return {
    asset_count: asNumber(input.asset_count),
    canvas_node_count: asNumber(input.canvas_node_count),
    connector_count: asNumber(input.connector_count),
    idea_count: asNumber(input.idea_count),
    project_id: asString(input.project_id, `project-${randomUUID()}`),
    saved_at: new Date().toISOString(),
  };
}

export function createExportPackage(formats: readonly string[]): ExportPackage {
  const exportId = `export-${randomUUID()}`;
  return {
    export_id: exportId,
    formats: formats.length > 0 ? [...formats] : ["json", "pdf", "png"],
    manifest_url: `https://cae.local/exports/${exportId}/manifest.json`,
    status: "ready",
  };
}

async function readJson(request: IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.trim().length === 0) return {};
  return asRecord(JSON.parse(raw));
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    ...defaultCorsHeaders,
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendNotFound(response: ServerResponse): void {
  sendJson(response, 404, { error: "not_found" });
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === "OPTIONS") {
    response.writeHead(204, defaultCorsHeaders);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  try {
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/v1/health")) {
      sendJson(response, 200, getHealthStatus());
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/connectors") {
      sendJson(response, 200, { connectors: listConnectorDefinitions() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/content/understand") {
      const body = await readJson(request);
      sendJson(response, 200, {
        understanding: understandResearch(asString(body.knowledge, ""), asStringArray(body.links)),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/content/research") {
      const body = await readJson(request);
      sendJson(response, 200, {
        research: await buildContentResearch(
          asString(body.input, asString(body.knowledge, "")),
          asStringArray(body.links),
        ),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/content/scripts") {
      const body = await readJson(request);
      sendJson(
        response,
        200,
        await generateContentScripts(
          asString(body.input, asString(body.knowledge, "")),
          asStringArray(body.connectors),
          asStringArray(body.links),
        ),
      );
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/content/ideas") {
      const body = await readJson(request);
      const { ideas } = await generateContentScripts(
        asString(body.input, asString(body.knowledge, "")),
        asStringArray(body.connectors),
        asStringArray(body.links),
      );
      sendJson(response, 200, { ideas });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/canvas/expand") {
      const body = await readJson(request);
      sendJson(response, 200, expandCanvasFromIdea(asIdea(body.idea)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/moodboards") {
      const body = await readJson(request);
      const responseBody = createMoodboardResponse(
        asIdea(body.idea),
        asStringArray(body.connectors),
        asSheetOptions(body.characters),
        asSheetOptions(body.scenes),
      );
      sendJson(response, 202, responseBody);
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/assets") {
      const body = await readJson(request);
      sendJson(response, 201, { asset: registerAsset(body) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/projects") {
      const body = await readJson(request);
      sendJson(response, 200, { project: saveProjectSnapshot(body) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/exports") {
      const body = await readJson(request);
      sendJson(response, 202, { export: createExportPackage(asStringArray(body.formats)) });
      return;
    }

    sendNotFound(response);
  } catch (error) {
    sendJson(response, 400, {
      error: "bad_request",
      message: error instanceof Error ? error.message : "Invalid request",
    });
  }
}

export function createCreativeEngineServer(): Server {
  return createServer((request, response) => {
    void handleRequest(request, response);
  });
}

function shouldStartServer(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (shouldStartServer()) {
  const port = Number.parseInt(process.env.PORT ?? "8787", 10);
  const host = process.env.HOST ?? "127.0.0.1";
  createCreativeEngineServer().listen(port, host, () => {
    console.log(`creative-engine-api listening on http://localhost:${port}`);
  });
}
