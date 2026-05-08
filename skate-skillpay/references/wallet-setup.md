# Wallet setup (Monad via @monad-crypto/mpp)

Load this file only if `scripts/src/client.ts --check-wallet` exits non-zero.

> **Path convention.** Commands below use `<skill-dir>` as a placeholder for wherever this skill is installed on disk. For Claude Code that's `$CLAUDE_PROJECT_DIR/.claude/skills/skate-skillpay` (or `~/.claude/skills/skate-skillpay` if installed globally); other runtimes use whatever directory their installer drops the skill into.

Skate does not ship its own MPP client. Payments go through the official MPP TypeScript SDK [`mppx`](https://www.npmjs.com/package/mppx) plus the Monad payment-method package [`@monad-crypto/mpp`](https://www.npmjs.com/package/@monad-crypto/mpp). The backend currently advertises `monad` as its `paymentMethod` on `GET /services`; the wallet file must contain a `monad` entry. Future networks will be added as additional top-level keys without breaking existing entries.

Canonical docs (always prefer these over this file):

- <https://mpp.dev/overview>
- <https://mpp.dev/payment-methods/monad>
- <https://mpp.dev/sdk/typescript>
- <https://github.com/monad-crypto/monad-ts>
- <https://docs.monad.xyz/developer-essentials/network-information>

## Monad mainnet

| Chain ID | RPC                     | Native | Explorer                |
| -------- | ----------------------- | ------ | ----------------------- |
| `143`    | `https://rpc.monad.xyz` | `MON`  | <https://monadscan.com> |

The backend settles in USDC on Monad mainnet (contract `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`, 6 decimals). The 402 challenge carries the currency address, so the wallet just needs a balance of that token.

The wallet uses pull-mode ERC-3009 `transferWithAuthorization` — the client signs, the backend submits and pays gas. **Your Monad wallet does not need MON for gas, only USDC.**

## Exit codes

| Exit | Meaning                                                                                           | Fix                                                                               |
| ---- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 10   | No wallet file found, or no entry for any supported network                                       | Run setup below                                                                   |
| 12   | Private key is hex-valid but not a usable secp256k1 key                                           | Re-create the entry with a fresh `privateKey` (e.g. from `cast wallet new`)       |
| 7    | Backend unreachable, or backend's `paymentMethod` does not match any wallet entry / supported set | Check your network. Add a wallet entry for the backend's current `paymentMethod`. |

Funding failures surface later, during the paid request — the request will fail with an error. Fund the wallet on Monad mainnet per the setup below before making a call.

## Wallet file

Location, resolved in order:

1. `$XDG_CONFIG_HOME/skate-skillpay/wallet.json` (defaults to `~/.config/skate-skillpay/wallet.json` when `XDG_CONFIG_HOME` is unset)
2. `~/.skate-skillpay/wallet.json`

Shape (keyed by `paymentMethod` so additional networks slot in side-by-side):

```json
{
  "monad": {
    "address": "0x…",
    "privateKey": "0x…"
  }
}
```

The `privateKey` is a hex-encoded EOA key consumable by viem's `privateKeyToAccount`. It is used locally to sign Monad ERC-3009 authorizations. It never leaves the user's machine.

## Setup steps

1. **Install the client dependencies** once. The skill ships a `package.json` inside `scripts/` pinning `mppx`, `viem`, and `@monad-crypto/mpp`:

   ```bash
   cd "<skill-dir>/scripts" && npm install
   ```

2. **Create a fresh EOA.** Any EVM-compatible tool works:

   ```bash
   cast wallet new   # Foundry; prints address + private key
   ```

   Or use an existing wallet app that can export a private key.

3. **Write the wallet file:**

   ```bash
   mkdir -p ~/.config/skate-skillpay
   cat > ~/.config/skate-skillpay/wallet.json <<EOF
   {
     "monad": {
       "address": "0xYourAddress",
       "privateKey": "0xYourPrivateKey"
     }
   }
   EOF
   chmod 600 ~/.config/skate-skillpay/wallet.json
   ```

4. **Fund the wallet.** Send USDC on Monad mainnet (contract `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`) to the new address from an existing wallet or a CEX withdrawal that supports Monad. You don't need MON for gas — pull mode means the backend pays gas. Only fund what the user is comfortable spending; `GET /services` on the backend lists the current per-request price.

5. **Verify:**

   ```bash
   node --experimental-strip-types \
     "<skill-dir>/scripts/src/client.ts" --check-wallet
   ```

   Exit `0` means the wrapper is ready.

## Security notes to relay to the user

- The private key lives in a plaintext file. Protect it with `chmod 600` and do not commit it.
- This is hot-wallet territory. Fund only what the user is comfortable spending; treat it as a prepaid card.
- The Skate backend never sees the private key. It only receives signed Monad ERC-3009 charge credentials tied to a specific amount, currency, chain, and recipient.
- Revocation = delete the wallet file (or the network entry). There is no remote kill switch.

If anything on [mpp.dev](https://mpp.dev/) or [docs.monad.xyz](https://docs.monad.xyz/) contradicts this file, trust those.
