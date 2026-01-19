import { Account } from "./cAccount.js";
/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
 * @typedef {import("./types.js").TransactionRoute} TransactionRoute
 */
class AccountYear {
  /** @type {Account} */
  #account;
  /** @type {Number} */
  #taxYear;

  /**
   * @param {Account} account
   * @param {Number} taxYear
   */
  constructor(account, taxYear) {
    this.#account = account;
    this.#taxYear = taxYear;
  }

  get startingBalance() {
    return this.#account.startingBalanceForYear(this.#taxYear);
  }

  get endingBalance() {
    return this.#account.endingBalanceForYear(this.#taxYear);
  }

  /**
   * @param {import("./cTransaction.js").TransactionCategorySymbol | undefined} category
   */
  deposits(category) {
    return this.#account.depositsForYear(this.#taxYear, category);
  }

  /**
   * @param {TransactionCategorySymbol | undefined} category
   */
  withdrawals(category) {
    return this.#account.withdrawalsForYear(this.#taxYear, category);
  }

  /**
   * @param {TransactionCategorySymbol} category
   * @param {string} route
   * @param {number} amount
   * @param {string} frequency
   * @param {string | null} memo
   */
  processAsPeriodicWithdrawals(category, route, amount, frequency, memo) {
    this.#account.processAsPeriodicWithdrawals(
      this.#taxYear,
      amount,
      category,
      route,
      frequency,
      memo
    );
  }

  /**
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   * @param {number} amount
   * @param {string} frequency
   * @param {string | null} memo
   */
  processAsPeriodicDeposits(category, route, amount, frequency, memo) {
    this.#account.processAsPeriodicDeposits(
      this.#taxYear,
      amount,
      category,
      route,
      frequency,
      memo
    );
  }

  get summary() {
    return {
      name: this.#account.name,
      startingBalance: this.#account.startingBalanceForYear(this.#taxYear),
      deposits: this.#account.depositsForYear(this.#taxYear),
      withdrawals: this.#account.withdrawalsForYear(this.#taxYear),
      endingBalance: this.#account.endingBalanceForYear(this.#taxYear),
      interestRate: this.#account.interestRate,
    };
  }
}

export { AccountYear };
