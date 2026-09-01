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

type JsonRecord = Record<string, unknown>;

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
    },
    {
      id: `idea-founder-${seed}`,
      title: "Founder POV story",
      hook: "Let one person explain the problem in plain language, then make the product feel inevitable.",
      script:
        "Start with a direct founder line. Cut between raw research, draft scripts, and the generated board. End when the selected idea becomes a polished storyboard.",
      tone: "premium, human",
    },
    {
      id: `idea-demo-${seed}`,
      title: "Creator demo sequence",
      hook: "Move fast: one creator, one screen, three proof beats, and a final moodboard reveal.",
      script:
        "The creator dumps context, opens three generated ideas, edits one line, sends it to Canvas, and watches character and scene sheets assemble into a final board.",
      tone: "fast, social",
    },
    {
      id: `idea-cinematic-${seed}`,
      title: "Cinematic mood piece",
      hook: "Turn the research into visual atmosphere: fewer words, stronger motif, more texture.",
      script:
        "Use a quiet opening, textured references, slow transitions, and one repeating visual symbol. The storyboard lands as a moodboard that already feels shoot-ready.",
      tone: "visual, atmospheric",
    },
  ];
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

    if (request.method === "POST" && url.pathname === "/v1/content/ideas") {
      const body = await readJson(request);
      const ideas = generateScriptIdeas(
        asString(body.knowledge, ""),
        asStringArray(body.connectors),
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
