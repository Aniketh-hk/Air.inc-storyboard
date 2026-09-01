import { createMoodboardResponse } from "../../apps/api/src/index.js";
import {
  asConnectors,
  asIdea,
  asSheetOptions,
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
    response
      .status(202)
      .json(
        createMoodboardResponse(
          asIdea(body.idea),
          asConnectors(body.connectors),
          asSheetOptions(body.characters),
          asSheetOptions(body.scenes),
        ),
      );
  } catch (error) {
    response.status(400).json({
      error: "bad_request",
      message: error instanceof Error ? error.message : "Invalid request",
    });
  }
}
