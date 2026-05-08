export const PAYMENT_METHODS = ["monad"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type Args = {
  body?: string;
  path?: string;
  query?: string;
  method?: string;
  stream: boolean;
  service?: string;
  maxPrice?: number;
  checkWallet: boolean;
  listServices: boolean;
};

export type NetworkEntry = {
  address: `0x${string}`;
  privateKey: `0x${string}`;
};

export type WalletFile = Partial<Record<PaymentMethod, NetworkEntry>>;

export type ServiceEntry = {
  name?: string;
  symbol: string;
  minPriceUsd?: number;
  allowedPathPrefixes?: string[];
};

export type ServicesInfo = {
  services: ServiceEntry[];
  nextCursor?: string | null;
  paymentMethod: PaymentMethod;
};
