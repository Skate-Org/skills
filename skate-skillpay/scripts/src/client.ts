#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import type { Args } from "./types.ts";
import { parseArgs, validateArgs } from "./utils/args.ts";
import {
  die,
  ExitCode,
  BACKEND_URL,
  MAX_PAYMENT_ATTEMPTS,
  TIME_TO_FIRST_BYTE_MS,
} from "./utils/constants.ts";
import { loadMppxCore, loadPaymentMethod } from "./utils/mppx.ts";
import {
  describe402,
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

  let attempt = 0;
  let response: Response;
  const url = `${BACKEND_URL}/proxy/${encodeURIComponent(args.service!)}`;

  while (true) {
    attempt++;
    refusalReason = undefined;

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), TIME_TO_FIRST_BYTE_MS);

    try {
      response = await mppx.fetch(url, {
        signal: ctrl.signal,
        ...buildRequestInit(args),
      });
    } catch (e) {
      const err = e as Error;

      const networky =
        err.name === "AbortError" ||
        err.name === "TimeoutError" ||
        (err.name === "TypeError" && err.message === "fetch failed");

      const detail =
        err.cause instanceof Error
          ? `${err.message} (${err.cause.message})`
          : err.message;

      die(
        networky ? ExitCode.Network : ExitCode.PaymentFailed,
        `${networky ? "network" : "payment"} error: ${detail}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status !== 402) {
      break;
    }

    if (refusalReason) {
      die(ExitCode.MaxPriceExceeded, refusalReason);
    }

    const reason = await describe402(response);
    const charged =
      response.headers.has("payment-receipt") ||
      response.headers.has("x-mpp-amount-paid");

    const freshChallenge = /(^|,)\s*Payment\b/i.test(
      response.headers.get("www-authenticate") ?? "",
    );

    if (!charged && freshChallenge && attempt < MAX_PAYMENT_ATTEMPTS) {
      process.stderr.write(
        `[skate] payment rejected (${reason}); retrying with a fresh ` +
          `challenge (attempt ${attempt + 1}/${MAX_PAYMENT_ATTEMPTS})\n`,
      );

      continue;
    }

    die(
      ExitCode.PaymentFailed,
      charged
        ? `backend returned 402 but reported a charge — not retrying: ${reason}`
        : `backend rejected payment after ${attempt} attempt(s): ${reason}`,
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
