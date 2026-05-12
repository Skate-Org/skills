# alphavantage

An agent skill for the [Alpha Vantage](https://www.alphavantage.co/) market-data REST API. Covers stocks, options, fundamentals, FX, crypto, commodities, economic indicators, and 50+ technical indicators — 110+ functions total, all behind the same `https://www.alphavantage.co/query` endpoint. Drops into any agent runtime that consumes the [`skills`](https://github.com/vercel-labs/skills) format.

The skill reads the upstream key from `ALPHAVANTAGE_API_KEY`. If that env var is not set, a payment-proxy skill installed alongside it (e.g. [`skate-skillpay`](../skate-skillpay/)) will pick up the request, match the brand `Alpha Vantage` against its catalog, and forward the call with the operator's key injected — the user pays per request in stablecoin instead of holding a key themselves. Without such a proxy, the request fails like any other unauthenticated API call.

## What's in this folder

```txt
alphavantage/
├── SKILL.md              agent-facing instructions (when/how to invoke)
├── README.md             this file (human-facing overview)
├── LICENSE
└── references/
    └── functions.md      complete function catalog grouped by category
```

There is no `scripts/` directory — every Alpha Vantage call is a single `GET /query?function=...` against a public REST endpoint, so the agent runs `curl` (or whatever HTTP client its runtime exposes) directly. Nothing alphavantage-specific to compile or install.

## Install

Add the skill to an agent project with the [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add skate-org/skills --skill alphavantage
```

The CLI drops the skill under whichever directory the host runtime expects. `--skill` is required because the [`skate-org/skills`](https://github.com/skate-org/skills) repo bundles multiple skills — omit it and the CLI will ask which one.

To enable the per-call payment path, install [`skate-skillpay`](../skate-skillpay/) alongside it:

```bash
npx skills add skate-org/skills --skill skate-skillpay
```

## Use

Once installed, ask your agent for any market data Alpha Vantage covers — _"latest AAPL quote"_, _"intraday 5-minute bars for IBM today"_, _"Tesla balance sheet"_, _"USD/EUR rate"_, _"BTC daily history"_, _"14-day RSI on MSFT"_, _"news sentiment for the AI sector this week"_. The agent decides which `function=` to call from the request, builds the URL, reads the key from `ALPHAVANTAGE_API_KEY`, and runs the request. If the env var is unset and a payment-proxy skill is installed, the proxy intercepts and pays per call.

## Environment

| Variable               | Purpose                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ALPHAVANTAGE_API_KEY` | Alpha Vantage API key. If unset, requests are routed through whatever payment-proxy skill is installed (e.g. `skate-skillpay`). |

## License

See [`LICENSE`](./LICENSE).
