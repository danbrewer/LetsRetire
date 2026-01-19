// Type declarations for prototype extensions

declare global {
  interface Object {
    dump(title?: string, depth?: number): void;
  }

  interface Number {
    round(decimals?: number): number;
    asCurrency(): number;
    asPercentageOf(total: number): number;
    asPercentage(): number;
    minus(value: number): number;
    plus(value: number): number;
    adjustedForInflation(inflationRate: number, years: number): number;
  }
}

export {};

export type TransferId = string;
export type TransactionRoute = string;
