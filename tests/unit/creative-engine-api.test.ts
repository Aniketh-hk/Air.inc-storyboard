import { describe, expect, it } from "vitest";

import {
  createExportPackage,
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
});
