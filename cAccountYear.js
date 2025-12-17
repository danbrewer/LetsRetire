import { Account } from "./cAccount.js";

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
   * @param {string | undefined} category
   */
  deposits(category) {
    return this.#account.depositsForYear(this.#taxYear, category);
  }

  /**
   * @param {string | undefined} category
   */
  withdrawals(category) {
    return this.#account.withdrawalsForYear(this.#taxYear, category);
  }

  /**
   * @param {string} category
   * @param {number} amount
   * @param {string} frequency
   */
  processAsPeriodicWithdrawals(category, amount, frequency) {
    this.#account.processAsPeriodicWithdrawals(
      this.#taxYear,
      amount,
      category,
      frequency
    );
  }

  /**
   * @param {string} category
   * @param {number} amount
   * @param {string} frequency
   */
  processAsPeriodicDeposits(category, amount, frequency) {
    this.#account.processAsPeriodicDeposits(
      this.#taxYear,
      amount,
      category,
      frequency
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