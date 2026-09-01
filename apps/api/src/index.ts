export type HealthStatus = {
  service: "creative-engine-api";
  status: "ok";
  phase: "phase-0-1";
};

export function getHealthStatus(): HealthStatus {
  return { service: "creative-engine-api", status: "ok", phase: "phase-0-1" };
}
