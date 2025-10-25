class TargetedAccount {
  #account = null;

  constructor(account) {
    this.#account = account;
  }

  getStartingBalance() {
    return this.#account.startingBalanceForYear(fiscalData.taxYear);
  }

  availableFunds() {
    return Math.max(this.#account.endingBalanceForYear(fiscalData.taxYear), 0);
  }

  deposit(v, category) {
    return this.#account.deposit(v, category, fiscalData.taxYear);
  }

  withdraw(v, category) {
    return this.#account.withdrawal(v, category, fiscalData.taxYear);
  }

  withdrawals() {
    return this.#account.withdrawalsForYear(fiscalData.taxYear);
  }

  endingBalanceForYear() {
    return this.#account.endingBalanceForYear(fiscalData.taxYear);
  }
}
