/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
 * @typedef {import("./types.js").TransactionRoute} TransactionRoute
 */

import { Account } from "./cAccount.js";

class TargetedAccount {
  #account;
  #taxYear = 0;
  /**
   * @param {Account} account - Instance of Account class
   * @param {number} taxYear
   */
  constructor(account, taxYear) {
    this.#account = account;
    this.#taxYear = taxYear;
  }

  get startingBalance() {
    return this.#account.startingBalanceForYear(this.#taxYear);
  }

  get availableFunds() {
    return Math.max(this.#account.endingBalanceForYear(this.#taxYear), 0);
  }

  /**
   * @param {any} v
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   */
  deposit(v, category, route) {
    return this.#account.deposit(v, category, route, this.#taxYear);
  }

  /**
   * @param {number} v
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   */
  withdraw(v, category, route) {
    return this.#account.withdrawal(v, category, route, this.#taxYear);
  }

  get withdrawals() {
    return this.#account.withdrawalsForYear(this.#taxYear);
  }

  get endingBalanceForYear() {
    return this.#account.endingBalanceForYear(this.#taxYear);
  }
}
