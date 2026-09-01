export type ProviderCapabilities = {
  media: readonly ("image" | "video" | "audio")[];
  supports_seed: boolean;
  supports_references: boolean;
  supports_cancellation: boolean;
};

export type CostEstimate = {
  currency: string;
  amount: number;
};

export type ProviderStatus =
  "QUEUED" | "SUBMITTED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type VideoJob = {
  job_id: string;
  shot_id: string;
  keyframe_asset_id: string;
  prompt: string;
  duration_seconds: number;
  reference_asset_ids: readonly string[];
};

export type GeneratedAssetReference = {
  provider_asset_id: string;
  uri: string;
  mime_type: string;
};

export type VideoProvider = {
  capabilities(): ProviderCapabilities;
  estimate(job: VideoJob): Promise<CostEstimate>;
  submit(job: VideoJob): Promise<string>;
  status(id: string): Promise<ProviderStatus>;
  cancel(id: string): Promise<void>;
  normalizeResult(id: string): Promise<GeneratedAssetReference[]>;
};

export class MockVideoProvider implements VideoProvider {
  readonly #jobs = new Map<string, { job: VideoJob; status: ProviderStatus }>();

  capabilities(): ProviderCapabilities {
    return {
      media: ["video"],
      supports_seed: false,
      supports_references: true,
      supports_cancellation: true,
    };
  }

  async estimate(job: VideoJob): Promise<CostEstimate> {
    return Promise.resolve({ currency: "INR", amount: job.duration_seconds * 10 });
  }

  async submit(job: VideoJob): Promise<string> {
    const providerJobId = `mock-${job.job_id}`;
    this.#jobs.set(providerJobId, { job: structuredClone(job), status: "SUCCEEDED" });
    return Promise.resolve(providerJobId);
  }

  async status(id: string): Promise<ProviderStatus> {
    return Promise.resolve(this.#get(id).status);
  }

  async cancel(id: string): Promise<void> {
    const record = this.#get(id);
    this.#jobs.set(id, { ...record, status: "CANCELLED" });
    return Promise.resolve();
  }

  async normalizeResult(id: string): Promise<GeneratedAssetReference[]> {
    const record = this.#get(id);
    if (record.status !== "SUCCEEDED") {
      throw new Error(`Provider job ${id} is not complete`);
    }
    return Promise.resolve([
      {
        provider_asset_id: `${id}-asset-1`,
        uri: `mock://video/${record.job.shot_id}/${id}`,
        mime_type: "video/mp4",
      },
    ]);
  }

  #get(id: string): { job: VideoJob; status: ProviderStatus } {
    const record = this.#jobs.get(id);
    if (record === undefined) {
      throw new Error(`Unknown provider job ${id}`);
    }
    return record;
  }
}
