import { readFileSync, existsSync, statSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { BACKEND_URL, die, ExitCode } from "./constants.ts";
import { loadMppxCore } from "./mppx.ts";
import { PAYMENT_METHODS } from "../types.ts";
import type {
  WalletFile,
  NetworkEntry,
  ServiceEntry,
  ServicesInfo,
  PaymentMethod,
} from "../types.ts";

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX_PRIVATE_KEY = /^0x[0-9a-fA-F]{64}$/;

export function walletPath(): string | undefined {
  const xdg = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  const candidates = [
    join(xdg, "skate-skillpay/wallet.json"),
    join(homedir(), ".skate-skillpay/wallet.json"),
  ];

  return candidates.find((p) => existsSync(p));
}

function tightenPermissions(p: string): void {
  if (process.platform === "win32") {
    return;
  }

  try {
    if ((statSync(p).mode & 0o077) !== 0) {
      chmodSync(p, 0o600);
    }
  } catch {
    // best-effort; if we can't stat or chmod, fall through and let the read attempt fail naturally
  }
}

export function loadWallets(): WalletFile | undefined {
  const p = walletPath();
  if (!p) {
    return undefined;
  }

  tightenPermissions(p);
  let raw: unknown;

  try {
    raw = JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return undefined;
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return undefined;
  }

  const out: WalletFile = {};
  const obj = raw as Record<string, unknown>;

  for (const method of PAYMENT_METHODS) {
    const entry = obj[method];
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const e = entry as Partial<NetworkEntry>;

    if (!e.address || !HEX_ADDRESS.test(e.address)) {
      continue;
    }

    if (!e.privateKey || !HEX_PRIVATE_KEY.test(e.privateKey)) {
      continue;
    }

    out[method] = { address: e.address, privateKey: e.privateKey };
  }

  return out;
}

export async function fetchServices(): Promise<ServicesInfo> {
  let raw: {
    services?: unknown;
    paymentMethod?: string;
    nextCursor?: string | null;
  };

  try {
    const res = await fetch(`${BACKEND_URL}/services`);

    if (!res.ok) {
      return die(
        ExitCode.BackendError,
        `backend ${BACKEND_URL} returned ${res.status} on /services`,
      );
    }

    raw = (await res.json()) as typeof raw;
  } catch (e) {
    return die(
      ExitCode.Network,
      `cannot reach backend at ${BACKEND_URL}: ${(e as Error).message}`,
    );
  }

  if (!raw.paymentMethod) {
    return die(
      ExitCode.BackendError,
      `backend at ${BACKEND_URL} did not return a paymentMethod on /services`,
    );
  }

  if (!(PAYMENT_METHODS as readonly string[]).includes(raw.paymentMethod)) {
    return die(
      ExitCode.Network,
      `backend at ${BACKEND_URL} settles with "${raw.paymentMethod}", which this client does not support (supported: ${PAYMENT_METHODS.join(", ")})`,
    );
  }

  if (!Array.isArray(raw.services)) {
    return die(
      ExitCode.BackendError,
      `backend at ${BACKEND_URL} returned a malformed services array on /services`,
    );
  }

  const services = raw.services.filter(
    (s): s is ServiceEntry =>
      !!s &&
      typeof s === "object" &&
      typeof (s as ServiceEntry).symbol === "string",
  );

  return {
    services,
    nextCursor: raw.nextCursor ?? null,
    paymentMethod: raw.paymentMethod as PaymentMethod,
  };
}

export function pickWalletEntry(method: PaymentMethod): NetworkEntry {
  const wallets = loadWallets();

  if (!wallets || Object.keys(wallets).length === 0) {
    die(ExitCode.NoWallet, "no wallet — see references/wallet-setup.md");
  }

  const entry = wallets[method];

  if (!entry) {
    die(
      ExitCode.NoWallet,
      `wallet has no "${method}" entry — see references/wallet-setup.md`,
    );
  }

  return entry;
}

export async function checkWallet() {
  const wallets = loadWallets();

  if (!wallets || Object.keys(wallets).length === 0) {
    die(ExitCode.NoWallet, "no wallet — see references/wallet-setup.md");
  }

  const { paymentMethod } = await fetchServices();
  const entry = wallets[paymentMethod];

  if (!entry) {
    die(
      ExitCode.Network,
      `backend at ${BACKEND_URL} settles with "${paymentMethod}" but wallet has no entry for that network — see references/wallet-setup.md`,
    );
  }

  try {
    const { privateKeyToAccount } = await loadMppxCore();
    privateKeyToAccount(entry.privateKey);
  } catch (e) {
    die(
      ExitCode.InvalidKey,
      `private key for "${paymentMethod}" is not a usable secp256k1 key: ${(e as Error).message}`,
    );
  }

  process.stdout.write(
    `ok ${entry.address} ${paymentMethod} (backend ${BACKEND_URL} ${paymentMethod})\n`,
  );
  process.exit(ExitCode.Ok);
}
