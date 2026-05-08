# skate-skillpay

An [AI agent skill](https://docs.claude.com/en/docs/claude-code/skills) that lets an agent use paid third-party APIs **without the user ever holding an API key or buying a subscription**. Requests are proxied through the Skate backend and settled per-call in stablecoins via [MPP](https://mpp.dev/overview) using the [Monad payment method](https://mpp.dev/payment-methods/monad).

The skill is service-agnostic — the backend owns the allowlist. The authoritative list is `GET /services`; whichever upstreams are listed there can be used through the same flow without any client-side change.

---

## The problem it solves

Ordinary skills that call commercial APIs assume the user has a subscription and has exported the corresponding API key into their environment. That's a bad fit for two situations:

1. **The user only wants one or two calls.** Paying $20/month for a search subscription to answer one question is absurd.
2. **The agent discovers mid-task that it needs a paid API.** Stopping to nag the user for a key breaks the flow and often means the user just gives up.

`skate-skillpay` removes the subscription step. The first time the agent needs a gated API, it generates a Monad wallet, walks the user through a one-time funding step (a few dollars of stablecoin on Monad mainnet), and from then on the agent can transparently make paid calls — each one debits a per-request price in stablecoin from the wallet (quoted by the backend on every call; fetch `GET /services` to see the current amount), and the backend forwards the request to the real upstream.

---

## The flow

```txt
┌─────────────────┐   1. needs paid API, no API key set       ┌───────────────────────┐
│  calling skill  │ ──────────────────────────────────────▶   │ skate-skillpay        │
│                 │                                           │  scripts/src/         │
│                 │                                           │  client.ts            │
│                 │ ◀───────────────── 6. upstream result ─── │                       │
└─────────────────┘                                           └──────────┬────────────┘
                                                                         │
                                            2. POST /proxy/<service>     │
                                              (path, method, body,       │
                                               query, stream)            │
                                                                         ▼
                                        ┌────────────────────────────────────────────┐
                                        │                 Skate backend              │
                                        │                 (hosted service)           │
                                        │                                            │
                                        │   3. issue 402 Payment Required            │
                                        │      with Monad charge challenge           │
                                        │                                            │
                                        │   4. client signs payment with local       │
                                        │      wallet → retries with X-PAYMENT       │
                                        │                                            │
                                        │   5. forward to upstream with operator's   │
                                        │      API key, stream response back         │
                                        └─────────┬──────────────────────┬───────────┘
                                                  │                      │
                                                  ▼                      ▼
                                            ┌─────────────┐        ┌────────────┐
                                            │ Monad chain │        │ upstream   │
                                            │  (stable-   │        │ API        │
                                            │   coin tx)  │        │            │
                                            └─────────────┘        └────────────┘
```

Detailed step-by-step:

1. The agent tries to run a skill that needs a paid API and discovers the required env var (e.g. `<UPSTREAM>_API_KEY`) is not set.
2. Instead of asking the user for a key, the agent invokes `skate-skillpay`. The skill runs `scripts/src/client.ts --check-wallet`. If no wallet exists, the agent follows `references/wallet-setup.md` to walk the user through creating and funding one (see [Wallet setup](./references/wallet-setup.md)).
3. With a wallet in place, the agent calls `client.ts` with the service id, method, path, body, and a `--max-price` cap. The client `POST`s to the Skate backend at `/proxy/<service>` with body `{ path, method, body?, query?, stream? }`.
4. The backend returns **HTTP 402 Payment Required** with a Monad charge challenge encoding amount, recipient, currency, chain, and expiry.
5. The client inspects the challenge. If the quoted price is within `--max-price`, `@monad-crypto/mpp` signs an ERC-20 (ERC-3009 `transferWithAuthorization` in pull mode) transfer from the local wallet and the client retries the request with an `X-Payment` header.
6. The backend verifies the payment against the challenge, then forwards the request to the real upstream (whichever service was named via `--service` and matched in `GET /services`) with its own API key attached. The upstream response — buffered JSON or an SSE/NDJSON stream — is piped straight back to the calling skill with no re-serialization.

The user never pastes an API key. They pay only for the calls they actually make.

---

## Picking a service (caveat)

The agent has to land on a `symbol` from the backend's `/services` catalog before calling `client.ts --service <symbol>`. The brand the agent starts with — from the prompt or from a calling skill's `SKILL.md` — is the human name (e.g. "Valyu"), **not** the symbol. The symbol has to be derived: run `client.ts --list-services`, match the brand against each entry's `symbol` and `name` case-insensitively, then use the entry's `symbol` verbatim.

Today the brand comes from one of two reliable signals:

1. **Explicit user mention** — _"Use Valyu to search for X"_. The brand is "Valyu"; the agent runs `--list-services` and finds the entry whose `name`/`symbol` matches case-insensitively. If the user names the provider, that wins.
2. **The user's installed skills** — if the calling skill is service-specific (e.g. an installed `valyu-best-practices` skill triggered the call), its `SKILL.md` declares the env var name and the upstream brand. The agent does the same case-insensitive match against the catalog to recover the symbol.

**Known limitation:** when neither signal is present (a generic prompt like _"search the web for X"_ with no provider-specific skill to anchor it), the agent has no brand to derive from and has to guess from the catalog alone. This is fine while the allowlist is small but will get ambiguous as more upstreams are added. The likely fix is to enrich each entry with `description` / `tags` / a category so the agent can disambiguate deterministically; until then, treat ambiguous prompts as a soft case and confirm the chosen service with the user before paying.

---

## What's in this folder

```txt
skate-skillpay/
├── SKILL.md                  agent-facing instructions (when/how to invoke)
├── README.md                 this file (human-facing overview)
├── LICENSE
├── scripts/
│   ├── package.json          pins mppx + @monad-crypto/mpp + viem for client.ts
│   └── src/
│       ├── client.ts         entry — the only thing the agent executes
│       ├── types.ts          Args, PAYMENT_METHODS, PaymentMethod, NetworkEntry, WalletFile, ServiceEntry, ServicesInfo
│       └── utils/
│           ├── constants.ts  BACKEND_URL, timeouts, exit codes, die()
│           ├── args.ts       parseArgs + validateArgs
│           ├── wallet.ts     loadWallets + fetchServices + pickWalletEntry + checkWallet
│           ├── mppx.ts       lazy mppx/client + viem; per-network dispatch (Monad today)
│           └── response.ts   request building + stream piping + challenge parsing
└── references/
    └── wallet-setup.md       loaded only when --check-wallet fails
```

### Contract between the agent and `client.ts`

| Concern                  | Where                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| When to invoke the skill | `SKILL.md`                                                         |
| CLI flags and exit codes | `SKILL.md` (usage table) + `utils/constants.ts` (ExitCode enum)    |
| Wallet path / schema     | `utils/wallet.ts` + `references/wallet-setup.md`                   |
| Payment cap enforcement  | `client.ts` `onChallenge` hook; rejects quotes above `--max-price` |
| Streaming passthrough    | `utils/response.ts#writeResponse`                                  |

---

## Install

1. **Add the skill** to an agent project (Claude Code or any compatible runtime) with the [`skills`](https://github.com/vercel-labs/skills) CLI:

   ```bash
   npx skills add skate-org/skills --skill skate-skillpay
   ```

   By default, the CLI drops the skill under the agent's skills directory in the current project (for Claude Code that's `.claude/skills/skate-skillpay/`; add `-g` to install globally at `~/.claude/skills/` instead). The `--skill` flag is required because the [`skate-org/skills`](https://github.com/skate-org/skills) repo bundles multiple skills — omit it and the CLI will ask which one.

2. **Install the client dependencies** once. `cd` into the skill's `scripts/` directory wherever your runtime installed it (for Claude Code that's `.claude/skills/skate-skillpay/scripts`), then run `npm install`:

   ```bash
   cd <skill-dir>/scripts
   npm install
   ```

   This pulls `mppx@0.5.12`, `@monad-crypto/mpp@0.0.3`, and `viem@2.47.18` — the only three runtime deps. Node.js ≥ 22 is required (the client runs TypeScript directly via `--experimental-strip-types`).

3. **Set up a wallet** the first time the agent needs a paid call. The agent will walk you through [`references/wallet-setup.md`](./references/wallet-setup.md) — generate an EOA, drop it at `~/.config/skate-skillpay/wallet.json` under the `monad` network key, and fund it with stablecoin on Monad mainnet. After that, paid calls are transparent.

Nothing here talks to the Skate backend until step 3 completes.

## Use

Once installed, you don't run the client yourself — another skill triggers it. The typical flow:

1. You ask your agent to do something that needs a paid API.
2. That skill notices its API key env var is missing and invokes `skate-skillpay`.
3. The agent looks up the service via `client.ts --list-services`, quotes the per-call price, confirms with you, debits it from your Monad wallet, and returns the upstream response.

You can also invoke the skill explicitly: _"Use skate-skillpay to run a query against `<service>` on X."_

## Environment

| Variable          | Purpose                                                                      | Default     |
| ----------------- | ---------------------------------------------------------------------------- | ----------- |
| `XDG_CONFIG_HOME` | If set, wallet is looked up at `$XDG_CONFIG_HOME/skate-skillpay/wallet.json` | `~/.config` |

## Calling the client by hand

The agent invokes `client.ts` itself, so you rarely need this. To browse the current catalog:

```bash
node --experimental-strip-types src/client.ts --list-services
```

This prints the backend's `/services` payload — `{ paymentMethod, services: [{ symbol, name, minPriceUsd, allowedPathPrefixes }], nextCursor }` — to stdout. Pick a `symbol` and a `path` that matches one of its `allowedPathPrefixes`, then:

```bash
node --experimental-strip-types src/client.ts \
  --service <service-symbol> \
  --method POST \
  --path <upstream-path> \
  --body '{"...":"..."}' \
  --max-price 0.25
```

Add `--stream` for `text/event-stream` / `application/x-ndjson` upstreams; the response is piped straight to stdout with no buffering.

## License

See [`LICENSE`](./LICENSE).
