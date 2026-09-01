import { getHealthStatus } from "../../apps/api/src/index.js";
import { handleOptions, setCors, type RequestLike, type ResponseLike } from "../_utils.js";

export default function handler(request: RequestLike, response: ResponseLike): void {
  if (handleOptions(request, response)) return;
  setCors(response);
  response.status(200).json(getHealthStatus());
}
