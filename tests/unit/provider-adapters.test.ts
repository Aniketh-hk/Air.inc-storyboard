import { describe, expect, it } from "vitest";

import { MockVideoProvider } from "@creative-engine/provider-adapters";

describe("mock video provider", () => {
  it("estimates, completes, and normalizes without a real provider call", async () => {
    const provider = new MockVideoProvider();
    const job = {
      job_id: "job_01",
      shot_id: "S03_SH02",
      keyframe_asset_id: "keyframe_01",
      prompt: "Slow dolly forward.",
      duration_seconds: 2,
      reference_asset_ids: ["keyframe_01"],
    };

    await expect(provider.estimate(job)).resolves.toEqual({ currency: "INR", amount: 20 });
    const id = await provider.submit(job);
    await expect(provider.status(id)).resolves.toBe("SUCCEEDED");
    await expect(provider.normalizeResult(id)).resolves.toEqual([
      {
        provider_asset_id: "mock-job_01-asset-1",
        uri: "mock://video/S03_SH02/mock-job_01",
        mime_type: "video/mp4",
      },
    ]);
  });
});
