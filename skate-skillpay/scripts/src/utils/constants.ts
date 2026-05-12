export const TIME_TO_FIRST_BYTE_MS = 30_000;
export const USER_AGENT = "skate-skillpay/0.1.1";
export const BACKEND_URL = "https://api2.skatechain.org/skate-skillpay";

export const ALLOWED_METHODS = new Set([
  "GET",
  "PUT",
  "POST",
  "PATCH",
  "DELETE",
]);

export const ExitCode = {
  Ok: 0,
  Usage: 2,
  Network: 7,
  NoWallet: 10,
  InvalidKey: 12,
  BackendError: 3,
  PaymentFailed: 5,
  MaxPriceExceeded: 4,
} as const;

export function die(code: number, msg: string): never {
  process.stderr.write(`skate-skillpay: ${msg}\n`);
  process.exit(code);
}
