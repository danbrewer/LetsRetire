// globals.d.ts

// This augments the built-in Number interface
interface Number {
  /**
   * Rounds the number to a given number of decimal places.
   * @param decimals How many digits after the decimal point (default 0)
   * @returns The rounded number
   */
  round(decimals?: number): number;
  asCurrency(): number;
  asWholeDollars(): string;

  minus(value: number): number;
  plus(value: number): number;
  adjustedForInflation(inflationRate: number, years: number): number;
}
