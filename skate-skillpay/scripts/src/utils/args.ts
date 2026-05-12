import { ALLOWED_METHODS, ExitCode, die } from "./constants.ts";
import type { Args } from "../types.ts";

export function parseArgs(argv: string[]): Args {
  const out: Args = { checkWallet: false, listServices: false, stream: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    const next = () => {
      const v = argv[++i];
      if (v === undefined) {
        return die(ExitCode.Usage, `missing value for ${a}`);
      }

      return v;
    };

    switch (a) {
      case "--body": {
        out.body = next();
        break;
      }
      case "--check-wallet": {
        out.checkWallet = true;
        break;
      }
      case "--list-services": {
        out.listServices = true;
        break;
      }
      case "--max-price": {
        out.maxPrice = Number(next());
        break;
      }
      case "--method": {
        out.method = next()?.toUpperCase();
        break;
      }
      case "--path": {
        out.path = next();
        break;
      }
      case "--query": {
        out.query = next();
        break;
      }
      case "--service": {
        out.service = next();
        break;
      }
      case "--stream": {
        out.stream = true;
        break;
      }
      default: {
        die(ExitCode.Usage, `unknown arg: ${a}`);
      }
    }
  }

  return out;
}

export function validateArgs(args: Args) {
  if (!args.service || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(args.service)) {
    return die(ExitCode.Usage, "invalid --service");
  }

  if (!args.method || !ALLOWED_METHODS.has(args.method)) {
    return die(
      ExitCode.Usage,
      `invalid --method (one of ${[...ALLOWED_METHODS].join(",")})`,
    );
  }

  if (!args.path || !args.path.startsWith("/") || args.path.includes("..")) {
    return die(ExitCode.Usage, "invalid --path");
  }

  if (
    typeof args.maxPrice !== "number" ||
    !Number.isFinite(args.maxPrice) ||
    args.maxPrice <= 0
  ) {
    return die(
      ExitCode.Usage,
      "--max-price required and must be a positive finite number",
    );
  }

  if (args.body !== undefined) {
    try {
      JSON.parse(args.body);
    } catch {
      return die(ExitCode.Usage, "--body is not valid JSON");
    }
  }

  if (args.query !== undefined) {
    try {
      const q = JSON.parse(args.query);

      if (typeof q !== "object" || q === null || Array.isArray(q)) {
        throw 0;
      }
    } catch {
      die(ExitCode.Usage, "--query must be a JSON object");
    }
  }
}
