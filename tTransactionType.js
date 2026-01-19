// -------------------------------------------------------------
// TRANSACTION TYPE ENUM
// -------------------------------------------------------------

import { EnumBase } from "./cEnum.js";

const TransactionTypeNames = /** @type {const} */ ({
  Deposit: "deposit",
  Withdrawal: "withdrawal",
});

/**
 * @typedef {typeof TransactionTypeNames[keyof typeof TransactionTypeNames]} TransactionTypeName
 */

class TransactionTypeEnum extends EnumBase {
  constructor() {
    super("TransactionType", Object.values(TransactionTypeNames));
  }

  get Deposit() {
    return this.map.deposit;
  }

  get Withdrawal() {
    return this.map.withdrawal;
  }

  /**
   * @param {symbol} sym
   * @returns {TransactionTypeName}
   */
  toName(sym) {
    const name = super.toName(sym);
    if (!name)
      throw new Error(`Invalid TransactionType symbol: ${String(sym)}`);
    return /** @type {TransactionTypeName} */ (name);
  }

  /**
   * Convert string name back to symbol
   * @param {string} name
   * @returns {TransactionTypeSymbol}
   */
  fromString(name) {
    const symbol = this.map[name];
    if (!symbol) throw new Error(`Invalid name: ${name}`);
    return symbol;
  }
}

const TransactionType = new TransactionTypeEnum();

/**
 * @typedef {typeof TransactionType.Deposit
 *         | typeof TransactionType.Withdrawal} TransactionTypeSymbol
 */
export { TransactionType, TransactionTypeNames };
