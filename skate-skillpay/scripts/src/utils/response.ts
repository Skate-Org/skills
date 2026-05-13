import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { USER_AGENT } from "./constants.ts";
import { createRedactStream, redactText } from "./redact.ts";
import type { Args } from "../types.ts";

export function buildRequestInit(args: Args): RequestInit {
  return {
    method: "POST",
    headers: {
      "user-agent": USER_AGENT,
      "content-type": "application/json",
      accept: args.stream
        ? "text/event-stream, application/x-ndjson, application/json"
        : "application/json",
      ...(args.stream ? { "x-stream": "1" } : {}),
    },
    body: JSON.stringify({
      path: args.path,
      method: args.method,
      stream: args.stream,
      body: args.body ? JSON.parse(args.body) : undefined,
      query: args.query ? JSON.parse(args.query) : undefined,
    }),
  };
}

export function isStreamingResponse(res: Response): boolean {
  const ct = res.headers.get("content-type") ?? "";

  return (
    ct.includes("text/event-stream") || ct.includes("application/x-ndjson")
  );
}

export async function writeResponse(res: Response) {
  if (isStreamingResponse(res) && res.body) {
    const body = res.body as unknown as NodeReadableStream<Uint8Array>;

    await pipeline(
      Readable.fromWeb(body),
      createRedactStream(),
      process.stdout,
      {
        end: false,
      },
    );
  } else {
    process.stdout.write(redactText(await res.text()));
  }
}

export function extractChallengeAmount(challenge: any): number {
  const req = challenge?.request ?? challenge?.methods?.[0]?.request;
  if (!req) {
    return Number.NaN;
  }

  const raw = String(req.amount ?? "0");
  const decimals = Number(req.decimals ?? req.methodDetails?.decimals ?? 6);

  return Number(raw) / 10 ** decimals;
}
