import { ExitCode, die } from "./constants.ts";
import type { PaymentMethod } from "../types.ts";

export async function loadMppxCore() {
  try {
    const mppx = await import("mppx/client");
    const viem = await import("viem/accounts");

    return { Mppx: mppx.Mppx, privateKeyToAccount: viem.privateKeyToAccount };
  } catch (e) {
    die(
      ExitCode.PaymentFailed,
      `mppx/viem not installed — run \`npm install\` in scripts/: ${
        (e as Error).message
      }`,
    );
  }
}

export async function loadPaymentMethod(method: PaymentMethod) {
  switch (method) {
    case "monad": {
      try {
        const mod = await import("@monad-crypto/mpp/client");
        return mod.monad;
      } catch (e) {
        die(
          ExitCode.PaymentFailed,
          `@monad-crypto/mpp not installed — run \`npm install\` in scripts/: ${
            (e as Error).message
          }`,
        );
      }
    }

    default: {
      const _exhaustive: never = method;
      return die(
        ExitCode.PaymentFailed,
        `unsupported payment method "${_exhaustive}"`,
      );
    }
  }
}
