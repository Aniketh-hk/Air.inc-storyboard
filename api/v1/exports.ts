import { createExportPackage } from "../../apps/api/src/index.js";
import {
  asConnectors,
  handleOptions,
  readBody,
  setCors,
  type RequestLike,
  type ResponseLike,
} from "../_utils.js";

export default function handler(request: RequestLike, response: ResponseLike): void {
  if (handleOptions(request, response)) return;
  setCors(response);

  try {
    const body = readBody(request);
    response.status(202).json({ export: createExportPackage(asConnectors(body.formats)) });
  } catch (error) {
    response.status(400).json({
      error: "bad_request",
      message: error instanceof Error ? error.message : "Invalid request",
    });
  }
}
