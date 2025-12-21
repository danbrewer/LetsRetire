/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
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
   */
  deposit(v, category) {
    return this.#account.deposit(v, category, this.#taxYear);
  }

  /**
   * @param {number} v
   * @param {TransactionCategorySymbol} category
   */
  withdraw(v, category) {
    return this.#account.withdrawal(v, category, this.#taxYear);
  }

  get withdrawals() {
    return this.#account.withdrawalsForYear(this.#taxYear);
  }

  get endingBalanceForYear() {
    return this.#account.endingBalanceForYear(this.#taxYear);
  }
}
