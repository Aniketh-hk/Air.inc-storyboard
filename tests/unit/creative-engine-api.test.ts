import { describe, expect, it } from "vitest";

import {
  buildContentResearch,
  createExportPackage,
  generateContentScripts,
  listConnectorDefinitions,
  registerAsset,
  saveProjectSnapshot,
  understandResearch,
} from "../../apps/api/src/index.js";

describe("creative engine API helpers", () => {
  it("turns research into structured creative understanding", () => {
    const understanding = understandResearch(
      "Brand campaign for founders. Audience is marketers. Workflow automation is the hook.",
      ["https://air.inc"],
    );

    expect(understanding.links).toEqual(["https://air.inc"]);
    expect(understanding.themes).toContain("Brand memory");
    expect(understanding.themes).toContain("Audience context");
    expect(understanding.product_truths).toContain("Knowledge becomes script ideas");
  });

  it("exposes mocked connector slots for the build map", () => {
    const connectors = listConnectorDefinitions();

    expect(connectors.map((connector) => connector.name)).toEqual([
      "GPT",
      "Gemini",
      "11 Labs",
      "Runway",
      "Higgsfield",
      "Canva",
      "Figma",
      "Notion",
    ]);
  });

  it("registers assets, saves snapshots, and creates export manifests", () => {
    const asset = registerAsset({
      kind: "brand",
      name: "logo.png",
      source: "upload",
      tags: ["logo"],
    });
    const project = saveProjectSnapshot({
      asset_count: 3,
      canvas_node_count: 5,
      connector_count: 4,
      idea_count: 6,
      project_id: "project-demo",
    });
    const exportPackage = createExportPackage(["json", "pdf", "pptx"]);

    expect(asset.asset_id).toMatch(/^asset-/);
    expect(asset.kind).toBe("brand");
    expect(project.project_id).toBe("project-demo");
    expect(project.canvas_node_count).toBe(5);
    expect(exportPackage.status).toBe("ready");
    expect(exportPackage.formats).toEqual(["json", "pdf", "pptx"]);
  });

  it("builds script-ready samples from an idea", async () => {
    const research = await buildContentResearch(
      "A website that turns founder notes into premium storyboard moodboards for launch videos.",
    );

    expect(research.mode).toBe("idea");
    expect(research.samples.length).toBeGreaterThanOrEqual(4);
    expect(research.samples.map((sample) => sample.kind)).toContain("creative_pattern");
    expect(research.understanding.product_truths).toContain("Knowledge becomes script ideas");
  });

  it("pulls website copy into research samples with an injected fetcher", async () => {
    const fetcher = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            `<html><head><title>Acme Story OS</title><meta name="description" content="Plan launch videos from one creative operating system."></head><body><h1>Build launch videos faster</h1><h2>Keep every proof point organized</h2></body></html>`,
          ),
      } as Response);

    const research = await buildContentResearch("https://example.com", [], fetcher);

    expect(research.mode).toBe("website");
    expect(research.understanding.links).toContain("https://example.com/");
    expect(research.samples[0]?.title).toBe("Acme Story OS");
    expect(research.samples[1]?.excerpt).toContain("Build launch videos faster");
  });

  it("generates local scripts from content research when GPT credentials are unavailable", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const result = await generateContentScripts(
        "An AI content room that researches a website, creates sample pulls, and writes scripts.",
        ["GPT"],
      );

      expect(result.provider).toBe("local");
      expect(result.research.samples.length).toBeGreaterThanOrEqual(4);
      expect(result.ideas).toHaveLength(4);
      expect(result.ideas[0]?.script).toContain("GPT");
    } finally {
      if (previousKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previousKey;
      }
    }
  });
});
