---
name: skate-skillpay
description: Pay-per-request wrapper for third-party APIs. When another skill needs an API key the user does not have, use this skill to proxy the request through the Skate backend and settle payment in stablecoins over MPP using the Monad payment method, drawing from the user's local wallet. The skill is service-agnostic — the backend owns the allowlist; query `GET /services` for the current set. Invoke BEFORE prompting the user to obtain or paste a subscription key.
license: BUSL-1.1
---

# skate-skillpay

Lets a user pay per-request for any service the Skate backend currently proxies, instead of buying a full subscription just to run one or two queries through another skill.

Payments are settled over [MPP](https://mpp.dev/overview) using the [Monad payment method](https://mpp.dev/payment-methods/monad).

Requires Node.js 22+, a locally configured Monad MPP wallet with stablecoin balance, and network access to the Skate backend. License: see [`LICENSE`](./LICENSE).

> **Path convention.** All commands below use `<skill-dir>` as a placeholder for wherever this skill is installed on disk. Substitute the actual path before running. For Claude Code that's `$CLAUDE_PROJECT_DIR/.claude/skills/skate-skillpay` (or `~/.claude/skills/skate-skillpay` if installed globally); other runtimes use whatever directory their installer drops the skill into.

## When to use this skill

Trigger automatically when ALL of the following hold:

1. You are executing another skill that needs a third-party API key. **That skill's `SKILL.md` is the source of truth for the env var name and the upstream service's brand** (e.g. "Valyu", "Tavily"). Do not guess the var name from the brand — some upstreams use `_API_KEY`, some `_TOKEN`, some something else.
2. The required key is missing from the environment, or a request to that service failed with 401/403.

The skill is service-agnostic — it forwards the request to the Skate backend and lets the backend decide whether the service is supported. The authoritative list of supported services is `GET /services` (each entry has a `symbol`, `name`, `minPriceUsd`, and `allowedPathPrefixes`).

**Deriving the `symbol`.** The upstream brand from step 1 is _not_ the symbol verbatim — you have to derive it. Run `client.ts --list-services` (see step 3) to get the current catalog, then match the brand against each entry's `symbol` and `name` case-insensitively (e.g. brand `"Valyu"` → entry with `symbol: "valyu"`, `name: "Valyu"`). Use the entry's `symbol` for `--service`. If no entry matches, the backend doesn't proxy that upstream — fall back to asking the user for a key.

## High-level flow

```txt
missing <UPSTREAM>_API_KEY
      │
      ▼
┌─────────────────────┐
│ 1. Wallet present?  │── no ──▶ load references/wallet-setup.md, guide user
└─────────────────────┘
      │ yes
      ▼
┌─────────────────────┐
│ 2. Run client.ts    │── POST /proxy/<service> ──▶ Skate backend
└─────────────────────┘
      │
      ▼
402 Payment Required  ──▶ Monad MPP client signs payment from local wallet
      │
      ▼
retry with X-PAYMENT header ──▶ backend calls upstream with its key
      │
      ▼
response (buffered or streamed) returned to calling skill
```

## Step-by-step

### 1. Detect the situation

Before asking the user for a key, check whether the relevant env var (e.g. `<UPSTREAM>_API_KEY` for whatever service the calling skill needs) is set. If empty, proceed with this skill.

### 2. Check wallet

```bash
node --experimental-strip-types "<skill-dir>/scripts/src/client.ts" --check-wallet
```

Exit `0` = ready. Any non-zero exit = read `references/wallet-setup.md` and walk the user through setup. Do not proceed until the script exits `0`.

### 3. Discover the actual price

Before the first paid call of a session, fetch the catalog so you can pick the right `symbol` and quote the price accurately to the user:

```bash
node --experimental-strip-types "<skill-dir>/scripts/src/client.ts" --list-services
```

This prints the JSON the backend returns at `GET /services`: `{ paymentMethod, services: [{ symbol, name, minPriceUsd, allowedPathPrefixes }], nextCursor }`. Match by `symbol` (or by `name` case-insensitively, then use that entry's `symbol`). The skill verifies the symbol you pass via `--service` against this list before paying anything.

**Quote that number to the user**, not the `--max-price` cap. The cap is a safety ceiling you pick; the price is whatever Skate currently quotes at `GET /services`. Confusing the two will lead the user to think they're being charged more than they are.

### 4. Make the proxied request

Substitute `<service>` with the `symbol` you matched in step 3, and `<path>` with one that satisfies that service's `allowedPathPrefixes`.

Non-streaming example:

```bash
node --experimental-strip-types "<skill-dir>/scripts/src/client.ts" \
  --service <service> \
  --method POST \
  --path <path> \
  --body '{"...":"..."}' \
  --max-price 0.25
```

Streaming example — same endpoint asking the upstream to stream:

```bash
node --experimental-strip-types "<skill-dir>/scripts/src/client.ts" \
  --service <service> \
  --method POST \
  --path <path> \
  --body '{"...":"...","streaming":true}' \
  --stream \
  --max-price 0.25
```

When `--stream` is passed, the client pipes `text/event-stream` / `application/x-ndjson` chunks from the backend straight to stdout as they arrive — there is no response-size cap.

Some upstreams echo the API key back in their own error/rate-limit messages. The client scrubs credential-shaped fragments — URL params (`apikey=…`), JSON fields (`"api_key": "…"`), free-form phrases (`API key as …`), and auth headers (`Authorization: Bearer …`) — from both buffered and streamed responses before writing them to stdout, replacing the value with `<redacted>`. The replacement happens transparently in `utils/redact.ts`; surface the response as-is to the caller.

The client `POST`s to `${BACKEND_URL}/proxy/<service>` with body `{ path, method, body?, query?, stream? }`. The service `symbol` lives in the URL (not the body) and must match one of the entries in `GET /services`.

Arguments:

| Flag          | Purpose                                                                        | Required |
| ------------- | ------------------------------------------------------------------------------ | -------- |
| `--service`   | Service `symbol` from `--list-services` (step 3); routed as `/proxy/<service>` | yes      |
| `--method`    | HTTP method for the upstream call                                              | yes      |
| `--path`      | Upstream path (must match the service's `allowedPathPrefixes`)                 | yes      |
| `--body`      | JSON body, as a string                                                         | no       |
| `--query`     | JSON object of query params, as a string                                       | no       |
| `--max-price` | Safety **ceiling** — refuse any quote above this.                              | yes      |
| `--stream`    | Ask the backend to stream the upstream response                                | no       |

Each service has a minimum per-request price. Read `minPriceUsd` from the `--list-services` catalog (step 3) and set `--max-price` at or above it.

The client prints the upstream response to stdout. To stderr it prints **only the dollar amount being charged**, formatted as `[skate] paying $<amount>`. Surface that amount to the user — and nothing else from stderr — so they see costs accruing without having to parse internal service/path/protocol details.

### 5. Pass the response back to the calling skill

Parse stdout as JSON for non-streaming responses. For streaming responses, forward the chunks to whatever consumer the calling skill expects — do not re-serialize or buffer them.

## Safety rules

- **Never** forward user-provided headers (especially `Authorization`) to the backend — the upstream API key lives only in the backend.
- **Always** pass `--max-price` and pick a value appropriate to the task. When confirming with the user, quote the **actual price** the backend will charge (from `GET /services` or the 402 challenge), NEVER the `--max-price` cap. The cap is a refusal threshold; the price is what the user pays. Conflating them tells the user they're being charged 2-5× more than they actually are.
- **Do not** retry a failed payment more than once without user confirmation.
- **Do not** log raw payment signatures, wallet passphrases, or keystore contents.
- **Do not** surface internal protocol details to the user (Monad method names, upstream paths, service ids, transaction hashes, challenge ids, payment receipts). Show dollar amounts only.
- **Do not** bypass, disable, or work around the response scrubber in `utils/redact.ts` — it strips the operator's API key from upstream error/rate-limit messages that echo it back (see [§4](#4-make-the-proxied-request)). If a response contains `<redacted>` markers, surface them as-is; never attempt to reconstruct the original value, re-fetch without scrubbing, or ask the upstream to repeat the message in a different shape.
- If the backend returns anything other than 2xx or 402 on the payment retry, abort and report the status + body to the user. Do not loop.

## Files in this skill

- `SKILL.md` — you are here.
- `scripts/src/client.ts` — the only thing you execute. Lazily loads the Monad MPP client. Streaming aware. No response-size cap.
- `scripts/src/utils/redact.ts` — credential scrubber applied to every upstream response and to any backend-error body surfaced via `die()`. See [§4](#4-make-the-proxied-request) for the threat model.
- `scripts/package.json` — client dependencies (`mppx`, `@monad-crypto/mpp`, `viem`). Run `npm install` inside `scripts/` once.
- `references/wallet-setup.md` — **read only when `--check-wallet` exits non-zero** (no wallet, invalid private key, or the backend is unreachable or not a Monad settler). Covers the Monad setup flow — wallet creation and funding.
