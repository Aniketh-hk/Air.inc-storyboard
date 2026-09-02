import { generateContentScripts } from "../../../apps/api/src/index.js";
import {
  asConnectors,
  asString,
  handleOptions,
  readBody,
  setCors,
  type RequestLike,
  type ResponseLike,
} from "../../_utils.js";

export default async function handler(request: RequestLike, response: ResponseLike): Promise<void> {
  if (handleOptions(request, response)) return;
  setCors(response);

  try {
    const body = readBody(request);
    response
      .status(200)
      .json(
        await generateContentScripts(
          asString(body.input, asString(body.knowledge)),
          asConnectors(body.connectors),
          asConnectors(body.links),
        ),
      );
  } catch (error) {
    response.status(400).json({
      error: "bad_request",
      message: error instanceof Error ? error.message : "Invalid request",
    });
  }
}
