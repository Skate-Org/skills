---
name: alphavantage
description: Alpha Vantage market-data toolkit for AI agents. Use when the task needs real-time or historical stock quotes, time series, options, fundamentals, FX, crypto, commodities, economic indicators, or technical indicators. Calls the REST API at https://www.alphavantage.co/query. Reads the key from ALPHAVANTAGE_API_KEY. Upstream brand is "Alpha Vantage" — surface that name verbatim so any payment-proxy skill can match it against its catalog.
license: MIT
---

# Alpha Vantage

Wraps the Alpha Vantage REST API (`https://www.alphavantage.co/query`) — 110+ functions covering stocks, options, fundamentals, forex, crypto, commodities, economic indicators, and technical indicators.

The upstream brand is **Alpha Vantage**. The required env var is **`ALPHAVANTAGE_API_KEY`**. Both are quoted verbatim so any payment-proxy skill installed alongside this one can match the brand against its catalog and inject the operator's key when the env var is unset.

## When to use this skill

Trigger when the user asks for any of:

- Real-time or historical stock prices (intraday → monthly, adjusted or raw)
- Latest quote for a ticker, symbol search, market open/close status
- Options chains and put/call ratios (real-time or historical)
- Company fundamentals (income statement, balance sheet, cash flow, earnings, dividends, splits, IPO calendar)
- News sentiment, top gainers/losers, insider transactions, institutional holdings, earnings transcripts
- Forex rates and FX time series
- Cryptocurrency prices and exchange rates
- Commodity prices (WTI, Brent, gold, silver, natural gas, agricultural)
- Economic indicators (GDP, CPI, unemployment, treasury yields, federal funds rate)
- Technical indicators (SMA, EMA, MACD, RSI, BBANDS, ATR, etc. — 50+)

For the full function list with parameters, read [`references/functions.md`](references/functions.md).

## Authentication

Read the key from `ALPHAVANTAGE_API_KEY` and pass it as the `apikey=` query param:

```bash
curl -s "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=$ALPHAVANTAGE_API_KEY"
```

If the env var is unset, do **not** prompt the user for a key. If a payment-proxy skill is installed in the same project (e.g. `skate-skillpay`), it will notice the missing key, match the brand `"Alpha Vantage"` against its catalog, and forward the request with the operator's key injected — every Alpha Vantage call is `GET /query` with the same `function=`-driven query string, so the proxy needs no per-function logic. Without such a proxy, the request fails like any other unauthenticated API call.

## Data freshness (`entitlement`)

Alpha Vantage data is **not real-time by default** — even on a paid key, a plain call returns end-of-day data. Three endpoints accept an optional `entitlement` query param to opt into live or 15-minute-delayed feeds:

| Function                     | `entitlement=realtime`           | `entitlement=delayed`            | Omitted (default) |
| ---------------------------- | -------------------------------- | -------------------------------- | ----------------- |
| `GLOBAL_QUOTE`               | Live US market quote             | 15-min delayed US market quote   | End-of-day quote  |
| `TIME_SERIES_INTRADAY`       | Realtime intraday bars           | 15-min delayed intraday bars     | Historical only   |
| `TIME_SERIES_DAILY_ADJUSTED` | Realtime intraday-adjusted close | 15-min delayed during US trading | End-of-day close  |

Other endpoints (`REALTIME_OPTIONS`, `REALTIME_BULK_QUOTES`, `REALTIME_PUT_CALL_RATIO`, FX, crypto, technical indicators, fundamentals, economic indicators) do not accept `entitlement` — they are either inherently realtime/historical or update on their own cadence.

Rules:

- If the user asks for "current", "live", "right now", or "real-time" prices and the call is one of the three functions above, append `&entitlement=realtime`.
- If the user is fine with a small lag (analytics, dashboards, "roughly current"), use `&entitlement=delayed` — same data, lower plan tier required, no licensing-fee surcharge.
- Realtime/delayed US market data is gated by exchanges (NASDAQ/NYSE/FINRA/SEC). It requires a premium key — Alpha Vantage's $99.99/month "Premium 150" plan and above include realtime; the $49.99/month "Premium 75" plan only includes delayed. Free keys return end-of-day regardless of `entitlement`.
- When relaying data to the user, **state the freshness explicitly**. "AAPL closed at $X on <date>" is very different from "AAPL is trading at $X right now" — never describe end-of-day data as a current price.
- When the request flows through `skate-skillpay`, the operator's key determines what tier is available; if the upstream returns `Information`/`Note` rejecting `entitlement=realtime`, surface that to the user and retry without the param (or with `entitlement=delayed`) instead of looping.

Examples:

```bash
# Live AAPL quote (premium 150+ key required)
curl -s "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&entitlement=realtime&apikey=$ALPHAVANTAGE_API_KEY"

# 15-min delayed intraday bars
curl -s "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&entitlement=delayed&apikey=$ALPHAVANTAGE_API_KEY"
```

## How to pick a function

```
What does the user want?

├─ Latest price for one ticker            → GLOBAL_QUOTE
├─ Up to 100 latest quotes                → REALTIME_BULK_QUOTES (premium)
├─ Look up a ticker by name               → SYMBOL_SEARCH
├─ Is the market open right now?          → MARKET_STATUS
├─ Intraday OHLCV bars                    → TIME_SERIES_INTRADAY (interval=1min..60min)
├─ Daily / weekly / monthly history       → TIME_SERIES_DAILY[_ADJUSTED] / WEEKLY[_ADJUSTED] / MONTHLY[_ADJUSTED]
├─ Options chain                          → REALTIME_OPTIONS or HISTORICAL_OPTIONS
├─ Company financials                     → COMPANY_OVERVIEW, INCOME_STATEMENT, BALANCE_SHEET, CASH_FLOW
├─ Earnings / dividends / splits          → EARNINGS, DIVIDEND_DATA, SPLIT_DATA
├─ News + sentiment                       → NEWS_SENTIMENT (filter by tickers/topics/time range)
├─ Movers / insiders / institutions       → TOP_GAINERS_LOSERS, INSIDER_TRANSACTIONS, INSTITUTIONAL_HOLDINGS
├─ FX rate or FX time series              → CURRENCY_EXCHANGE_RATE / FX_INTRADAY|DAILY|WEEKLY|MONTHLY
├─ Crypto rate or crypto time series      → CRYPTO_EXCHANGE_RATE / CRYPTO_INTRADAY|DAILY|WEEKLY|MONTHLY
├─ Commodity price (WTI, gold, etc.)     → WTI, BRENT, GOLD_SPOT, NATURAL_GAS, COPPER, ...
├─ Macro indicator (GDP, CPI, etc.)       → REAL_GDP, CPI, UNEMPLOYMENT_RATE, TREASURY_YIELD, ...
└─ Technical indicator (RSI, MACD, ...)   → see references/functions.md §Technical
```

## Core call patterns

All calls hit `GET https://www.alphavantage.co/query` with query params. Always include `function=` and `apikey=`; other params depend on the function.

**Latest quote**

```bash
curl -s "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=$ALPHAVANTAGE_API_KEY"
```

Returns `{"Global Quote": {"01. symbol": "IBM", "05. price": "...", ...}}`. Note the quoted keys with leading numbers and spaces — index them with bracket notation, not dot notation.

**Intraday OHLCV**

```bash
curl -s "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&outputsize=compact&apikey=$ALPHAVANTAGE_API_KEY"
```

`outputsize=compact` (default, last 100 bars) or `full` (full history). `interval` ∈ `{1min, 5min, 15min, 30min, 60min}`.

**Daily adjusted close**

```bash
curl -s "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=IBM&outputsize=compact&apikey=$ALPHAVANTAGE_API_KEY"
```

**Company overview (fundamentals)**

```bash
curl -s "https://www.alphavantage.co/query?function=COMPANY_OVERVIEW&symbol=IBM&apikey=$ALPHAVANTAGE_API_KEY"
```

**News + sentiment** (filter by tickers, topics, or time)

```bash
curl -s "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=AAPL,MSFT&topics=technology&time_from=20260501T0000&limit=50&apikey=$ALPHAVANTAGE_API_KEY"
```

**FX rate (spot)**

```bash
curl -s "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=EUR&apikey=$ALPHAVANTAGE_API_KEY"
```

**Crypto daily**

```bash
curl -s "https://www.alphavantage.co/query?function=CRYPTO_DAILY&symbol=BTC&market=USD&apikey=$ALPHAVANTAGE_API_KEY"
```

**Technical indicator (RSI on daily closes)**

```bash
curl -s "https://www.alphavantage.co/query?function=RSI&symbol=IBM&interval=daily&time_period=14&series_type=close&apikey=$ALPHAVANTAGE_API_KEY"
```

## Response handling

- Default response is JSON; pass `datatype=csv` for time-series functions to get CSV instead.
- Top-level keys often contain spaces and leading numbers (e.g. `"Time Series (5min)"`, `"05. price"`). Use bracket access, not dot access.
- An error from Alpha Vantage usually returns HTTP 200 with `{"Error Message": "..."}` or `{"Note": "..."}` or `{"Information": "..."}`. Check for these keys before treating a response as success.
- Rate-limit messages arrive as a `Note` or `Information` field, not as HTTP 429. Surface that text verbatim to the user.

## Common workflows

Most non-trivial requests chain several functions. Pick the chain that matches the user's intent rather than firing one call at a time.

**Daily movers → fundamentals → sentiment**

```bash
# 1. Find today's biggest movers
curl -s "https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=$ALPHAVANTAGE_API_KEY"

# 2. Pull fundamentals for an interesting ticker (substitute SYM)
curl -s "https://www.alphavantage.co/query?function=COMPANY_OVERVIEW&symbol=SYM&apikey=$ALPHAVANTAGE_API_KEY"

# 3. Check what the news is saying about it
curl -s "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=SYM&limit=20&apikey=$ALPHAVANTAGE_API_KEY"
```

**Technical analysis on a ticker**

```bash
# 1. Daily price history
curl -s "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=IBM&outputsize=compact&apikey=$ALPHAVANTAGE_API_KEY"

# 2. Trend (50-day SMA) + momentum (14-day RSI) + volatility (BBANDS)
curl -s "https://www.alphavantage.co/query?function=SMA&symbol=IBM&interval=daily&time_period=50&series_type=close&apikey=$ALPHAVANTAGE_API_KEY"
curl -s "https://www.alphavantage.co/query?function=RSI&symbol=IBM&interval=daily&time_period=14&series_type=close&apikey=$ALPHAVANTAGE_API_KEY"
curl -s "https://www.alphavantage.co/query?function=BBANDS&symbol=IBM&interval=daily&time_period=20&series_type=close&apikey=$ALPHAVANTAGE_API_KEY"
```

**FX research (rate + history + macro context)**

```bash
# 1. Current spot
curl -s "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=EUR&apikey=$ALPHAVANTAGE_API_KEY"

# 2. Daily history for a chart
curl -s "https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=USD&to_symbol=EUR&outputsize=compact&apikey=$ALPHAVANTAGE_API_KEY"

# 3. Macro driver (US 10y yield) for context
curl -s "https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=$ALPHAVANTAGE_API_KEY"
```

**Earnings deep dive**

```bash
# 1. Reported + estimated EPS history
curl -s "https://www.alphavantage.co/query?function=EARNINGS&symbol=IBM&apikey=$ALPHAVANTAGE_API_KEY"

# 2. Latest call transcript with sentiment (substitute the relevant quarter)
curl -s "https://www.alphavantage.co/query?function=EARNINGS_TRANSCRIPT&symbol=IBM&quarter=2026Q1&apikey=$ALPHAVANTAGE_API_KEY"

# 3. Income statement + cash flow for the same period
curl -s "https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=IBM&apikey=$ALPHAVANTAGE_API_KEY"
curl -s "https://www.alphavantage.co/query?function=CASH_FLOW&symbol=IBM&apikey=$ALPHAVANTAGE_API_KEY"
```

When the chain has independent calls (steps 2 and 3 of the technical workflow above don't depend on each other), fire them in parallel rather than sequentially — each Alpha Vantage call is independent and rate-limit budget is per request, not per concurrent connection.

## Safety rules

- Never log or echo `ALPHAVANTAGE_API_KEY` or include it in code that gets shared. When showing the user a curl example, use `$ALPHAVANTAGE_API_KEY` as a placeholder, not the literal value.
- When the env var is unset and a payment-proxy skill is in play, do **not** include `apikey` in the forwarded query — the proxy injects the operator's key. A user-supplied value would either be ignored or leak.
- Batch multiple symbols into a single `REALTIME_BULK_QUOTES` call when available; otherwise use `GLOBAL_QUOTE` per ticker. Each symbol in a separate request burns rate-limit budget unnecessarily.
- If a response contains `Error Message`, `Note`, or `Information`, surface that text to the user verbatim — these carry the upstream's own diagnostic and rate-limit messages.

## Files in this skill

- `SKILL.md` — you are here.
- `references/functions.md` — full catalog of all 110+ functions grouped by category, with required parameters for each.
- `README.md` — human-facing overview.
