import type { ConnectorName, ScriptIdea, SheetOption } from "../apps/api/src/index.js";

export type RequestLike = {
  method?: string;
  body?: unknown;
};

export type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): void;
  end(): void;
};

export function setCors(response: ResponseLike): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
  response.setHeader("Cache-Control", "no-store");
}

export function handleOptions(request: RequestLike, response: ResponseLike): boolean {
  if (request.method !== "OPTIONS") return false;
  setCors(response);
  response.status(204).end();
  return true;
}

export function readBody(request: RequestLike): Record<string, unknown> {
  if (typeof request.body === "string") {
    return JSON.parse(request.body) as Record<string, unknown>;
  }
  if (typeof request.body === "object" && request.body !== null && !Array.isArray(request.body)) {
    return request.body as Record<string, unknown>;
  }
  return {};
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asConnectors(value: unknown): ConnectorName[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function asIdea(value: unknown): ScriptIdea {
  const body =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    hook: asString(body.hook, "Generated from the selected Content idea."),
    id: asString(body.id, "idea-live"),
    script: asString(body.script, "Use the selected idea to create the visual storyboard."),
    title: asString(body.title, "Selected idea"),
    tone: asString(body.tone, "clear, useful"),
  };
}

export function asSheetOptions(value: unknown): SheetOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const body = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    return {
      detail: asString(body.detail, "Generated sheet option."),
      id: asString(body.id, `sheet-${index + 1}`),
      selected: typeof body.selected === "boolean" ? body.selected : false,
      title: asString(body.title, `Sheet ${index + 1}`),
    };
  });
}
