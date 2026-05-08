#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import type { Args } from "./types.ts";
import { parseArgs, validateArgs } from "./utils/args.ts";
import {
  die,
  ExitCode,
  BACKEND_URL,
  TIME_TO_FIRST_BYTE_MS,
} from "./utils/constants.ts";
import { loadMppxCore, loadPaymentMethod } from "./utils/mppx.ts";
import {
  writeResponse,
  buildRequestInit,
  extractChallengeAmount,
} from "./utils/response.ts";
import { checkWallet, fetchServices, pickWalletEntry } from "./utils/wallet.ts";

async function run(args: Args) {
  validateArgs(args);

  const { paymentMethod, services } = await fetchServices();
  const symbols = services.map((s) => s.symbol);

  if (!symbols.includes(args.service!)) {
    die(
      ExitCode.Usage,
      `unknown service "${args.service}" — backend supports: ${symbols.join(", ") || "(none)"}`,
    );
  }

  const entry = pickWalletEntry(paymentMethod);
  const { Mppx, privateKeyToAccount } = await loadMppxCore();
  const account = privateKeyToAccount(entry.privateKey);
  const factory = await loadPaymentMethod(paymentMethod);

  let refusalReason: string | undefined;

  const mppx = Mppx.create({
    polyfill: false,
    methods: [factory({ account, mode: "pull" })],
    onChallenge: async (
      challenge: any,
      helpers: { createCredential: () => Promise<string> },
    ) => {
      const usd = extractChallengeAmount(challenge);

      if (!Number.isFinite(usd) || usd <= 0) {
        refusalReason = "unparseable challenge amount";
        return undefined;
      }

      if (usd > args.maxPrice!) {
        refusalReason = `challenge $${usd} exceeds --max-price $${args.maxPrice}`;
        return undefined;
      }

      const formatted = usd < 0.01 ? usd.toFixed(6) : usd.toFixed(2);
      process.stderr.write(`[skate] paying $${formatted}\n`);
      return helpers.createCredential();
    },
  });

  const ctrl = new AbortController();
  const url = `${BACKEND_URL}/proxy/${encodeURIComponent(args.service!)}`;
  const timeout = setTimeout(() => ctrl.abort(), TIME_TO_FIRST_BYTE_MS);

  let response: Response;

  try {
    response = await mppx.fetch(url, {
      signal: ctrl.signal,
      ...buildRequestInit(args),
    });
  } catch (e) {
    const err = e as Error;
    const networky = err.name === "AbortError" || err.name === "TimeoutError";

    die(
      networky ? ExitCode.Network : ExitCode.PaymentFailed,
      `${networky ? "network" : "payment"} error: ${err.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 402) {
    die(
      ExitCode.MaxPriceExceeded,
      refusalReason ?? "backend still requires payment",
    );
  }

  if (response.status < 200 || response.status >= 300) {
    const body = await response.text().catch(() => "<unreadable>");
    die(ExitCode.BackendError, `backend returned ${response.status}: ${body}`);
  }

  await writeResponse(response);
}

const args = parseArgs(process.argv.slice(2));

if (args.checkWallet) {
  await checkWallet();
} else if (args.listServices) {
  const info = await fetchServices();
  process.stdout.write(`${JSON.stringify(info, null, 2)}\n`);
} else {
  await run(args);
}
