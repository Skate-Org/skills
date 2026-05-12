# Alpha Vantage Function Reference

Every Alpha Vantage call hits `GET https://www.alphavantage.co/query` with `function=<NAME>&apikey=<KEY>` plus function-specific params. This file lists every function grouped by category, with the required and notable optional params for each.

For the canonical docs see <https://www.alphavantage.co/documentation/>.

---

## 1. Core Time Series Stock Data

| Function                       | Required                                                     | Notable optional                                                                                                                     | Notes                                                                                                               |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `TIME_SERIES_INTRADAY`         | `symbol`, `interval` (`1min`/`5min`/`15min`/`30min`/`60min`) | `adjusted`, `extended_hours`, `outputsize` (`compact`/`full`), `month` (`YYYY-MM`), `datatype`, `entitlement` (`realtime`/`delayed`) | Trailing 30 days by default; `month` slices a specific month back to 2000-01. `entitlement` requires a premium key. |
| `TIME_SERIES_DAILY`            | `symbol`                                                     | `outputsize`, `datatype`                                                                                                             | Raw OHLCV.                                                                                                          |
| `TIME_SERIES_DAILY_ADJUSTED`   | `symbol`                                                     | `outputsize`, `datatype`, `entitlement` (`realtime`/`delayed`)                                                                       | Split/dividend-adjusted close. `entitlement` requires a premium key.                                                |
| `TIME_SERIES_WEEKLY`           | `symbol`                                                     | `datatype`                                                                                                                           |                                                                                                                     |
| `TIME_SERIES_WEEKLY_ADJUSTED`  | `symbol`                                                     | `datatype`                                                                                                                           |                                                                                                                     |
| `TIME_SERIES_MONTHLY`          | `symbol`                                                     | `datatype`                                                                                                                           |                                                                                                                     |
| `TIME_SERIES_MONTHLY_ADJUSTED` | `symbol`                                                     | `datatype`                                                                                                                           |                                                                                                                     |
| `GLOBAL_QUOTE`                 | `symbol`                                                     | `datatype`, `entitlement` (`realtime`/`delayed`)                                                                                     | Latest price + day stats. End-of-day by default; `entitlement` requires a premium key.                              |
| `REALTIME_BULK_QUOTES`         | `symbol` (comma-separated, up to 100)                        | `datatype`                                                                                                                           | **Premium.**                                                                                                        |
| `SYMBOL_SEARCH`                | `keywords`                                                   | `datatype`                                                                                                                           | Ticker lookup.                                                                                                      |
| `MARKET_STATUS`                | —                                                            | —                                                                                                                                    | Global market open/close status.                                                                                    |

## 2. Options Data

| Function                        | Required | Notable optional                              | Notes                     |
| ------------------------------- | -------- | --------------------------------------------- | ------------------------- |
| `REALTIME_OPTIONS`              | `symbol` | `require_greeks` (`true`/`false`), `contract` | US-listed options chain.  |
| `REALTIME_PUT_CALL_RATIO`       | `symbol` | —                                             | Live PCR.                 |
| `REALTIME_VOLUME_TO_OI_RATIO`   | `symbol` | —                                             |                           |
| `HISTORICAL_OPTIONS`            | `symbol` | `date` (`YYYY-MM-DD`)                         | Day-by-day chain history. |
| `HISTORICAL_PUT_CALL_RATIO`     | `symbol` | `date`                                        |                           |
| `HISTORICAL_VOLUME_TO_OI_RATIO` | `symbol` | `date`                                        |                           |

## 3. Alpha Intelligence™

| Function                   | Required                                                      | Notable optional                                                                                                        | Notes                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEWS_SENTIMENT`           | — (at least one filter)                                       | `tickers`, `topics`, `time_from`/`time_to` (`YYYYMMDDTHHMM`), `sort` (`LATEST`/`EARLIEST`/`RELEVANCE`), `limit` (≤1000) | Topics include `blockchain`, `earnings`, `ipo`, `mergers_and_acquisitions`, `financial_markets`, `economy_*`, `energy_transportation`, `finance`, `life_sciences`, `manufacturing`, `real_estate`, `retail_wholesale`, `technology`. |
| `EARNINGS_TRANSCRIPT`      | `symbol`, `quarter` (`YYYYQ#`)                                | —                                                                                                                       | Full call transcript with sentiment.                                                                                                                                                                                                 |
| `TOP_GAINERS_LOSERS`       | —                                                             | —                                                                                                                       | Day's top gainers, losers, and most-actively-traded.                                                                                                                                                                                 |
| `INSIDER_TRANSACTIONS`     | `symbol`                                                      | —                                                                                                                       | Form 4 filings.                                                                                                                                                                                                                      |
| `INSTITUTIONAL_HOLDINGS`   | `symbol`                                                      | —                                                                                                                       | 13F holdings.                                                                                                                                                                                                                        |
| `ANALYTICS_FIXED_WINDOW`   | `SYMBOLS` (comma-sep), `RANGE`, `INTERVAL`, `CALCULATIONS`    | `OHLC`                                                                                                                  | Stats over a fixed window.                                                                                                                                                                                                           |
| `ANALYTICS_SLIDING_WINDOW` | `SYMBOLS`, `RANGE`, `INTERVAL`, `WINDOW_SIZE`, `CALCULATIONS` | `OHLC`                                                                                                                  | Stats over a rolling window.                                                                                                                                                                                                         |

## 4. Fundamental Data

| Function             | Required | Notes                                                   |
| -------------------- | -------- | ------------------------------------------------------- |
| `COMPANY_OVERVIEW`   | `symbol` | Profile, market cap, ratios.                            |
| `ETF_PROFILE`        | `symbol` | Holdings + sector allocation.                           |
| `DIVIDEND_DATA`      | `symbol` | Historical dividends.                                   |
| `SPLIT_DATA`         | `symbol` | Historical splits.                                      |
| `INCOME_STATEMENT`   | `symbol` | Annual + quarterly.                                     |
| `BALANCE_SHEET`      | `symbol` | Annual + quarterly.                                     |
| `CASH_FLOW`          | `symbol` | Annual + quarterly.                                     |
| `SHARES_OUTSTANDING` | `symbol` | Time series.                                            |
| `EARNINGS`           | `symbol` | Reported + estimated EPS history.                       |
| `EARNINGS_HISTORY`   | `symbol` | Reported EPS history.                                   |
| `EARNINGS_ESTIMATES` | `symbol` | Forward estimates.                                      |
| `LISTING_STATUS`     | —        | `date`, `state` (`active`/`delisted`); CSV.             |
| `EARNINGS_CALENDAR`  | —        | `symbol`, `horizon` (`3month`/`6month`/`12month`); CSV. |
| `IPO_CALENDAR`       | —        | Upcoming IPOs; CSV.                                     |

## 5. Forex (FX)

| Function                 | Required                               | Notable optional         |
| ------------------------ | -------------------------------------- | ------------------------ |
| `CURRENCY_EXCHANGE_RATE` | `from_currency`, `to_currency`         | —                        |
| `FX_INTRADAY`            | `from_symbol`, `to_symbol`, `interval` | `outputsize`, `datatype` |
| `FX_DAILY`               | `from_symbol`, `to_symbol`             | `outputsize`, `datatype` |
| `FX_WEEKLY`              | `from_symbol`, `to_symbol`             | `datatype`               |
| `FX_MONTHLY`             | `from_symbol`, `to_symbol`             | `datatype`               |

## 6. Cryptocurrencies

| Function               | Required                                                 | Notable optional         |
| ---------------------- | -------------------------------------------------------- | ------------------------ |
| `CRYPTO_EXCHANGE_RATE` | `from_currency` (e.g. `BTC`), `to_currency` (e.g. `USD`) | —                        |
| `CRYPTO_INTRADAY`      | `symbol`, `market`, `interval`                           | `outputsize`, `datatype` |
| `CRYPTO_DAILY`         | `symbol`, `market`                                       | `datatype`               |
| `CRYPTO_WEEKLY`        | `symbol`, `market`                                       | `datatype`               |
| `CRYPTO_MONTHLY`       | `symbol`, `market`                                       | `datatype`               |

## 7. Commodities

All take optional `interval` (`monthly` default; `daily`/`weekly`/`monthly`/`quarterly`/`annual` where supported) and `datatype`.

| Function          | Notes                          |
| ----------------- | ------------------------------ |
| `WTI`             | West Texas Intermediate crude. |
| `BRENT`           | Brent crude.                   |
| `NATURAL_GAS`     | Henry Hub.                     |
| `COPPER`          | Global price.                  |
| `ALUMINUM`        | Global price.                  |
| `WHEAT`           | Global price.                  |
| `CORN`            | Global price.                  |
| `COTTON`          | Global price.                  |
| `SUGAR`           | Global price.                  |
| `COFFEE`          | Global price.                  |
| `GOLD_SPOT`       | Spot gold.                     |
| `SILVER_SPOT`     | Spot silver.                   |
| `GOLD_HISTORY`    | Historical gold.               |
| `SILVER_HISTORY`  | Historical silver.             |
| `ALL_COMMODITIES` | Global commodity price index.  |

## 8. Economic Indicators

All take optional `interval` (varies per series) and `datatype`. No `symbol` needed.

| Function               | Notes                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `REAL_GDP`             | Quarterly/annual real GDP.                                                                                |
| `REAL_GDP_PER_CAPITA`  | Quarterly.                                                                                                |
| `TREASURY_YIELD`       | `interval` (`daily`/`weekly`/`monthly`), `maturity` (`3month`/`2year`/`5year`/`7year`/`10year`/`30year`). |
| `INTEREST_RATE`        | Federal funds rate.                                                                                       |
| `CPI`                  | `interval` (`monthly`/`semiannual`).                                                                      |
| `INFLATION`            | Annual inflation.                                                                                         |
| `RETAIL_SALES`         | Monthly.                                                                                                  |
| `DURABLE_GOODS_ORDERS` | Monthly.                                                                                                  |
| `UNEMPLOYMENT_RATE`    | Monthly.                                                                                                  |
| `NONFARM_PAYROLL`      | Monthly.                                                                                                  |

## 9. Technical Indicators

All require `symbol`, `interval` (`1min`/`5min`/`15min`/`30min`/`60min`/`daily`/`weekly`/`monthly`), and most require `time_period` and/or `series_type` (`close`/`open`/`high`/`low`). Exact required-param list varies per indicator — see <https://www.alphavantage.co/documentation/#technical-indicators>.

**Moving averages**: `SMA`, `EMA`, `WMA`, `DEMA`, `TEMA`, `TRIMA`, `KAMA`, `MAMA`, `T3`, `VWAP`

**MACD family**: `MACD`, `MACDEXT`

**Stochastic & RSI**: `STOCH`, `STOCHF`, `STOCHRSI`, `RSI`, `WILLR`

**Trend / directional movement**: `ADX`, `ADXR`, `DX`, `MINUS_DI`, `PLUS_DI`, `MINUS_DM`, `PLUS_DM`, `AROON`, `AROONOSC`

**Oscillators**: `APO`, `PPO`, `MOM`, `BOP`, `CCI`, `CMO`, `ROC`, `ROCR`, `MFI`, `TRIX`, `ULTOSC`

**Bollinger / range**: `BBANDS`, `MIDPOINT`, `MIDPRICE`, `SAR`, `TRANGE`, `ATR`, `NATR`

**Volume**: `AD`, `ADOSC`, `OBV`

**Hilbert Transform**: `HT_TRENDLINE`, `HT_SINE`, `HT_TRENDMODE`, `HT_DCPERIOD`, `HT_DCPHASE`, `HT_PHASOR`

## 10. Index Data (Premium)

| Function     | Required | Notes                                                                  |
| ------------ | -------- | ---------------------------------------------------------------------- |
| `INDEX_DATA` | `symbol` | Use index symbols: `DJI`, `SPX`, `COMP`, `NDX`, `VIX`, plus 200+ more. |

## Common parameters

| Param         | Where                                                                     | Values                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apikey`      | every call                                                                | Read from `ALPHAVANTAGE_API_KEY`, or injected by a payment-proxy skill (e.g. `skate-skillpay`) when the env var is unset.                                                              |
| `datatype`    | most                                                                      | `json` (default), `csv`.                                                                                                                                                               |
| `outputsize`  | time series                                                               | `compact` (last 100 points), `full`.                                                                                                                                                   |
| `interval`    | intraday + indicators                                                     | `1min`, `5min`, `15min`, `30min`, `60min`, `daily`, `weekly`, `monthly` (subset depending on function).                                                                                |
| `month`       | `TIME_SERIES_INTRADAY`                                                    | `YYYY-MM` to fetch a specific historical month back to 2000-01.                                                                                                                        |
| `entitlement` | `GLOBAL_QUOTE`, `TIME_SERIES_INTRADAY`, `TIME_SERIES_DAILY_ADJUSTED` only | `realtime` for live US market data, `delayed` for 15-min delayed. Omit for end-of-day (the default). Requires a premium key; free keys ignore the param. See SKILL.md §Data freshness. |

## Response quirks to know

- Top-level keys often have spaces and leading numbers (`"Time Series (Daily)"`, `"05. price"`). Always use bracket-style access.
- Errors come back as HTTP 200 with body `{"Error Message": "..."}` — check for that key before parsing data.
- Rate-limit notices come back as HTTP 200 with body `{"Information": "..."}` (or sometimes `"Note"`), not as 429.
- Calendar/listing endpoints are CSV-native. `IPO_CALENDAR` and `EARNINGS_CALENDAR` ignore `datatype=json` and return CSV regardless. `LISTING_STATUS` instead returns an empty `{}` when `datatype=json` is set — omit the param (or pass `datatype=csv`) to get the actual rows.
