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

  getStartingBalance() {
    return this.#account.startingBalanceForYear(this.#taxYear);
  }

  availableFunds() {
    return Math.max(this.#account.endingBalanceForYear(this.#taxYear), 0);
  }

  /**
   * @param {any} v
   * @param {string} category
   */
  deposit(v, category) {
    return this.#account.deposit(v, category, this.#taxYear);
  }

  /**
   * @param {number} v
   * @param {string} category
   */
  withdraw(v, category) {
    return this.#account.withdrawal(v, category, this.#taxYear);
  }

  withdrawals() {
    return this.#account.withdrawalsForYear(this.#taxYear);
  }

  endingBalanceForYear() {
    return this.#account.endingBalanceForYear(this.#taxYear);
  }
}
